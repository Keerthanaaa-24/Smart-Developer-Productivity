import { useEffect, useState, useRef } from "react";
import { FaBolt, FaCheckCircle, FaSyncAlt } from "react-icons/fa";
import { API_BASE_URL } from "../../utils/constants";

const BackendHealthBanner = () => {
  const [status, setStatus] = useState("idle"); // 'idle' | 'waking' | 'ready' | 'error'
  const [elapsed, setElapsed] = useState(0);
  const pollTimerRef = useRef(null);
  const elapsedTimerRef = useRef(null);

  const checkHealth = async () => {
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
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        window.dispatchEvent(new CustomEvent("backend-warmed"));
        return true;
      }
    } catch {
      // Backend is still cold or unreachable
    }
    return false;
  };

  const startWakingSequence = () => {
    setStatus("waking");
    setElapsed(0);

    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      const isOk = await checkHealth();
      if (isOk) {
        setStatus("ready");
        setTimeout(() => {
          setStatus("idle");
        }, 3000);
      }
    }, 3500);
  };

  useEffect(() => {
    // Initial silent check
    checkHealth().then((ok) => {
      if (!ok) {
        startWakingSequence();
      }
    });

    // Listen for axios cold start triggers
    const handleColdStart = () => {
      if (status !== "waking") {
        startWakingSequence();
      }
    };

    window.addEventListener("backend-cold-start", handleColdStart);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      window.removeEventListener("backend-cold-start", handleColdStart);
    };
  }, []);

  if (status === "idle") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full transition-all duration-300 transform translate-y-0 animate-fadeIn">
      {status === "waking" && (
        <div className="bg-slate-900/95 text-white border border-amber-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl mt-0.5 animate-pulse">
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
            <div className="flex items-center gap-2 mt-2 text-[11px] text-amber-300/80">
              <FaSyncAlt className="animate-spin text-[10px]" />
              <span>Connecting to API...</span>
            </div>
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="bg-emerald-950/95 text-white border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fadeIn">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <FaCheckCircle className="text-sm" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-200">
              Backend connected and ready!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackendHealthBanner;
