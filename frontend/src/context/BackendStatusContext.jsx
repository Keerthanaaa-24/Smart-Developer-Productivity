import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL } from "../utils/constants";

/**
 * Backend Status State Definition:
 * - 'idle': Backend is responsive or no pending alert. Completely hidden.
 * - 'checking': Actively probing backend readiness.
 * - 'ready': Confirmed alive and database connected. (Brief transient success pill).
 * - 'cold_start': Sleeping Render instance waking up from idle (bounded timer).
 * - 'database_unavailable': Backend process alive, but MySQL database disconnected (HTTP 503).
 * - 'offline': Browser network disconnected (navigator.onLine === false).
 * - 'error': Application-level error (HTTP 500).
 */
export const BackendStatusContext = createContext(null);

export const useBackendStatus = () => {
  const context = useContext(BackendStatusContext);
  if (!context) {
    throw new Error("useBackendStatus must be used within a BackendStatusProvider");
  }
  return context;
};

export const BackendStatusProvider = ({ children }) => {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const statusRef = useRef("idle");
  const abortCtrlRef = useRef(null);
  const inFlightProbeRef = useRef(null);
  const pollTimerRef = useRef(null);
  const elapsedTimerRef = useRef(null);
  const pollAttemptRef = useRef(0);

  const setAppStatus = useCallback((newStatus, customMessage = "") => {
    statusRef.current = newStatus;
    setStatus(newStatus);
    setMessage(customMessage);
  }, []);

  // Safe timer clearing
  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    pollAttemptRef.current = 0;
  }, []);

  /**
   * Primary Probing Function
   * Probes /health/ready (verifying both process and database) with bounded timeout.
   */
  const checkHealth = useCallback(async (isManualTrigger = false) => {
    // 1. Check network connectivity first
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setAppStatus("offline", "You are currently offline. Please check your connection.");
      return { ok: false, status: "offline" };
    }

    // In-flight deduplication: return running probe if already probing
    if (inFlightProbeRef.current) {
      return inFlightProbeRef.current;
    }

    // Abort previous in-flight probe if any
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    const controller = new AbortController();
    abortCtrlRef.current = controller;

    const probePromise = (async () => {
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        let res = await fetch(`${API_BASE_URL}/health/ready`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        }).catch((err) => {
          if (err.name === "AbortError") return null;
          return { networkError: true, error: err };
        });

        // Fallback to /health only if /health/ready is not found (404)
        if (res && res.status === 404) {
          res = await fetch(`${API_BASE_URL}/health`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          }).catch(() => null);
        }

        clearTimeout(timeoutId);

        if (!res) {
          // Request was aborted
          return { ok: false, aborted: true };
        }

        // Case A: 200 OK — Backend and Database are Healthy & Ready
        if (res.ok) {
          clearTimers();
          setAppStatus("ready", "Backend connected and ready.");
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("backend-warmed"));
          }
          // Auto-hide the "ready" pill after 1.8s
          setTimeout(() => {
            if (statusRef.current === "ready") {
              setAppStatus("idle");
            }
          }, 1800);
          return { ok: true, status: "ready" };
        }

        // Case B: 503 Service Unavailable — Database disconnected
        if (res.status === 503) {
          clearTimers();
          let data = null;
          try {
            data = await res.json();
          } catch {
            // Ignore parse error
          }
          if (data?.database === "disconnected" || data?.probe === "readiness") {
            setAppStatus("database_unavailable", "Database temporarily unavailable. Reconnecting...");
            return { ok: false, status: "database_unavailable" };
          }
        }

        // Case C: 500 Internal Server Error
        if (res.status >= 500 && res.status !== 502 && res.status !== 503 && res.status !== 504) {
          clearTimers();
          setAppStatus("error", "Application server error occurred.");
          return { ok: false, status: "error" };
        }

        // Case D: Cold-start status (502, 504, or network timeout)
        return { ok: false, status: "cold_start" };
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          return { ok: false, aborted: true };
        }
        return { ok: false, status: "cold_start" };
      } finally {
        inFlightProbeRef.current = null;
      }
    })();

    inFlightProbeRef.current = probePromise;
    return probePromise;
  }, [clearTimers, setAppStatus]);

  /**
   * Starts a bounded cold-start warming sequence.
   * Capped to 45 seconds; stops runaway polling.
   */
  const startColdStartSequence = useCallback(() => {
    // If already in cold start, don't restart
    if (statusRef.current === "cold_start") return;

    setAppStatus("cold_start", "Connecting to server...");
    setElapsed(0);
    pollAttemptRef.current = 0;

    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        // Bounded: Cap counter at 45 seconds
        if (next >= 45) {
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
          if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        }
        return next;
      });
    }, 1000);

    // Schedule controlled, bounded poll (max 3 attempts: 3s, 6s, 10s)
    const scheduleNextPoll = () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (pollAttemptRef.current >= 3) return; // Stop after 3 auto-attempts

      const delays = [3000, 6000, 10000];
      const delay = delays[pollAttemptRef.current] || 10000;
      pollAttemptRef.current += 1;

      pollTimerRef.current = setTimeout(async () => {
        if (statusRef.current !== "cold_start") return;
        const result = await checkHealth();
        if (!result.ok && statusRef.current === "cold_start" && pollAttemptRef.current < 3) {
          scheduleNextPoll();
        }
      }, delay);
    };

    scheduleNextPoll();
  }, [checkHealth, setAppStatus]);

  // Manual retry triggered by user
  const retry = useCallback(async () => {
    setIsRetrying(true);
    try {
      const res = await checkHealth(true);
      if (!res.ok) {
        if (res.status === "database_unavailable") {
          setAppStatus("database_unavailable", "Database temporarily unavailable. Please retry shortly.");
        } else if (res.status === "offline") {
          setAppStatus("offline", "You are currently offline.");
        } else if (res.status === "error") {
          setAppStatus("error", "Application server error.");
        } else {
          // Restart a fresh bounded cold-start sequence
          startColdStartSequence();
        }
      }
    } finally {
      setIsRetrying(false);
    }
  }, [checkHealth, setAppStatus, startColdStartSequence]);

  // Dismiss banner manually
  const dismiss = useCallback(() => {
    clearTimers();
    setAppStatus("idle");
  }, [clearTimers, setAppStatus]);

  // Listen for browser online / offline transitions
  useEffect(() => {
    const handleOnline = () => {
      checkHealth().then((res) => {
        if (res.ok) {
          setAppStatus("ready", "Connection restored.");
          setTimeout(() => setAppStatus("idle"), 1800);
        }
      });
    };

    const handleOffline = () => {
      clearTimers();
      setAppStatus("offline", "You are currently offline. Check your network connection.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkHealth, clearTimers, setAppStatus]);

  // Listen for explicit backend events from Axios or other services
  useEffect(() => {
    const handleReportEvent = (event) => {
      const { type, status: reportedStatus, message: reportedMsg } = event.detail || {};

      if (reportedStatus === "ready" || type === "ready" || type === "success") {
        if (statusRef.current !== "idle") {
          clearTimers();
          setAppStatus("ready", "Backend connected.");
          setTimeout(() => {
            if (statusRef.current === "ready") setAppStatus("idle");
          }, 1800);
        }
        return;
      }

      if (reportedStatus === "database_unavailable" || type === "database_unavailable") {
        clearTimers();
        setAppStatus("database_unavailable", reportedMsg || "Database temporarily unavailable.");
        return;
      }

      if (reportedStatus === "error" || type === "error") {
        clearTimers();
        setAppStatus("error", reportedMsg || "Server error occurred.");
        return;
      }

      if (reportedStatus === "offline" || type === "offline") {
        clearTimers();
        setAppStatus("offline", "You are currently offline.");
        return;
      }

      if (reportedStatus === "cold_start" || type === "cold_start") {
        startColdStartSequence();
      }
    };

    // Listen for both generic status reports and legacy cold-start triggers
    window.addEventListener("backend-status-report", handleReportEvent);
    window.addEventListener("backend-cold-start", handleReportEvent);

    return () => {
      window.removeEventListener("backend-status-report", handleReportEvent);
      window.removeEventListener("backend-cold-start", handleReportEvent);
    };
  }, [clearTimers, setAppStatus, startColdStartSequence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      if (abortCtrlRef.current) abortCtrlRef.current.abort();
    };
  }, [clearTimers]);

  return (
    <BackendStatusContext.Provider
      value={{
        status,
        message,
        elapsed,
        isDelayed: elapsed >= 25,
        isRetrying,
        checkHealth,
        retry,
        dismiss,
      }}
    >
      {children}
    </BackendStatusContext.Provider>
  );
};

export default BackendStatusProvider;
