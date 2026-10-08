import { useEffect, useState, useRef, useCallback } from "react";
import { FaBolt, FaCheckCircle, FaSyncAlt, FaRedo } from "react-icons/fa";
import { API_BASE_URL } from "../../utils/constants";

const BackendHealthBanner = () => {
  const [status, setStatus] = useState("idle"); // 'idle' | 'waking' | 'ready' | 'error'
  const [elapsed, setElapsed] = useState(0);
  const [isManualChecking, setIsManualChecking] = useState(false);
  
  const pollTimerRef = useRef(null);
  const elapsedTimerRef = useRef(null);
  const retryDelayRef = useRef(2000); // Exponential backoff starts at 2s

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setStatus((prev) => (prev === "waking" ? "ready" : "idle"));
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        retryDelayRef.current = 2000;
        window.dispatchEvent(new CustomEvent("backend-warmed"));
        return true;
      }
    } catch {
      // Backend still cold or network in-flight
    }
    return false;
  }, []);

  const scheduleNextPoll = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

    pollTimerRef.current = setTimeout(async () => {
      const isOk = await checkHealth();
      if (isOk) {
        setStatus("ready");
        setTimeout(() => {
          setStatus("idle");
        }, 3000);
      } else {
        // Exponential backoff: multiply delay up to max 10s
        retryDelayRef.current = Math.min(10000, Math.round(retryDelayRef.current * 1.4));
        scheduleNextPoll();
      }
    }, retryDelayRef.current);
  }, [checkHealth]);

  const startWakingSequence = useCallback(() => {
    setStatus("waking");
    setElapsed(0);
    retryDelayRef.current = 2000;

    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    scheduleNextPoll();
  }, [scheduleNextPoll]);

  const handleManualRetry = async () => {
    setIsManualChecking(true);
    const isOk = await checkHealth();
    setIsManualChecking(false);
    if (isOk) {
      setStatus("ready");
      setTimeout(() => {
        setStatus("idle");
      }, 3000);
    }
  };

  useEffect(() => {
    // Initial silent check on mount
    checkHealth().then((ok) => {
      if (!ok) {
        startWakingSequence();
      }
    });

    // Listen for axios cold start triggers from failed API requests
    const handleColdStart = () => {
      if (status !== "waking") {
        startWakingSequence();
      }
    };

    window.addEventListener("backend-cold-start", handleColdStart);

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      window.removeEventListener("backend-cold-start", handleColdStart);
    };
  }, [checkHealth, startWakingSequence, status]);

  if (status === "idle") return null;

  return (
    <aside
      aria-label="Backend status"
      className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-full transition-all duration-300 transform translate-y-0"
    >
      {status === "waking" && (
        <div className="bg-slate-900/95 text-white border border-amber-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl mt-0.5 animate-pulse shrink-0">
            <FaBolt className="text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Waking Backend Service
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                {elapsed}s
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Render free-tier instance is spinning up. The interface remains interactive.
            </p>
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 text-[11px] text-amber-300/90">
                <FaSyncAlt className="animate-spin text-[10px]" />
                <span>Connecting to API...</span>
              </div>
              <button
                type="button"
                onClick={handleManualRetry}
                disabled={isManualChecking}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                <FaRedo className={`text-[9px] ${isManualChecking ? "animate-spin" : ""}`} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="bg-emerald-950/95 text-white border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fadeIn">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
            <FaCheckCircle className="text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-200">
              Backend connected and ready!
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default BackendHealthBanner;
