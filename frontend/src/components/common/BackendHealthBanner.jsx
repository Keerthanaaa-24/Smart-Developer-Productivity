import { useBackendStatus } from "../../context/BackendStatusContext";
import {
  FaCheckCircle,
  FaDatabase,
  FaWifi,
  FaExclamationCircle,
  FaSyncAlt,
  FaTimes,
  FaRedo,
} from "react-icons/fa";

/**
 * BackendHealthBanner
 * An unobtrusive, non-blocking status indicator for backend states.
 * - Stays completely invisible when the backend is operating normally ('idle').
 * - Renders a sleek, compact pill badge when a cold start, connection delay, or offline state occurs.
 * - Does not block user navigation, scrolling, or clicks on underlying page components.
 * - Provides working retry and dismiss actions.
 */
const BackendHealthBanner = () => {
  const { status, message, elapsed, isDelayed, isRetrying, retry, dismiss } = useBackendStatus();

  if (status === "idle") {
    return null;
  }

  return (
    <aside
      aria-label="Backend connection status"
      className="fixed bottom-4 right-4 z-50 pointer-events-none transition-all duration-300 transform translate-y-0 animate-fadeIn"
    >
      <div className="pointer-events-auto max-w-sm rounded-full px-3.5 py-1.5 shadow-xl backdrop-blur-md text-xs font-medium flex items-center gap-2 border">
        {/* =====================================================
            STATE: READY / CONNECTED (TRANSIENT AUTO-FADE)
        ===================================================== */}
        {status === "ready" && (
          <div className="flex items-center gap-2 text-emerald-300 bg-emerald-950/90 border-emerald-500/40 px-3 py-1 rounded-full">
            <FaCheckCircle className="text-emerald-400 shrink-0 text-xs" />
            <span className="truncate">{message || "Backend connected and ready"}</span>
          </div>
        )}

        {/* =====================================================
            STATE: COLD START (SLEEPING RENDER INSTANCE WAKING)
        ===================================================== */}
        {status === "cold_start" && (
          <div className="flex items-center gap-2.5 bg-slate-900/95 text-amber-200 border-amber-500/30 px-3.5 py-1.5 rounded-full shadow-lg">
            <div className="relative flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute" />
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            </div>

            {isDelayed ? (
              <div className="flex items-center gap-2">
                <span className="text-amber-200">Server is taking longer than expected</span>
                <button
                  type="button"
                  onClick={retry}
                  disabled={isRetrying}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-white px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 transition cursor-pointer disabled:opacity-50"
                >
                  <FaRedo className={`text-[9px] ${isRetrying ? "animate-spin" : ""}`} />
                  <span>Retry</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Connecting to server...</span>
                <span className="text-[10px] text-amber-400/80 font-mono">({elapsed}s)</span>
              </div>
            )}

            <button
              type="button"
              onClick={dismiss}
              className="text-slate-400 hover:text-white p-0.5 rounded-full transition ml-1 cursor-pointer"
              title="Dismiss status"
            >
              <FaTimes className="text-[10px]" />
            </button>
          </div>
        )}

        {/* =====================================================
            STATE: DATABASE TEMPORARILY UNAVAILABLE (HTTP 503)
        ===================================================== */}
        {status === "database_unavailable" && (
          <div className="flex items-center gap-2 bg-slate-900/95 text-rose-200 border-rose-500/40 px-3.5 py-1.5 rounded-full shadow-lg">
            <FaDatabase className="text-rose-400 shrink-0 text-xs" />
            <span>Database temporarily unavailable</span>
            <button
              type="button"
              onClick={retry}
              disabled={isRetrying}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 hover:text-white px-2 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 transition cursor-pointer disabled:opacity-50 ml-1"
            >
              <FaRedo className={`text-[9px] ${isRetrying ? "animate-spin" : ""}`} />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-slate-400 hover:text-white p-0.5 rounded-full transition ml-1 cursor-pointer"
              title="Dismiss status"
            >
              <FaTimes className="text-[10px]" />
            </button>
          </div>
        )}

        {/* =====================================================
            STATE: OFFLINE (BROWSER NETWORK DISCONNECTED)
        ===================================================== */}
        {status === "offline" && (
          <div className="flex items-center gap-2 bg-slate-900/95 text-slate-300 border-slate-700 px-3.5 py-1.5 rounded-full shadow-lg">
            <FaWifi className="text-slate-400 shrink-0 text-xs" />
            <span>You are currently offline</span>
            <button
              type="button"
              onClick={retry}
              disabled={isRetrying}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200 hover:text-white px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 transition cursor-pointer disabled:opacity-50 ml-1"
            >
              <FaRedo className={`text-[9px] ${isRetrying ? "animate-spin" : ""}`} />
              <span>Check</span>
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-slate-400 hover:text-white p-0.5 rounded-full transition ml-1 cursor-pointer"
              title="Dismiss status"
            >
              <FaTimes className="text-[10px]" />
            </button>
          </div>
        )}

        {/* =====================================================
            STATE: APPLICATION SERVER ERROR (HTTP 500)
        ===================================================== */}
        {status === "error" && (
          <div className="flex items-center gap-2 bg-slate-900/95 text-rose-200 border-rose-500/40 px-3.5 py-1.5 rounded-full shadow-lg">
            <FaExclamationCircle className="text-rose-400 shrink-0 text-xs" />
            <span>Server error occurred</span>
            <button
              type="button"
              onClick={retry}
              disabled={isRetrying}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 hover:text-white px-2 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 transition cursor-pointer disabled:opacity-50 ml-1"
            >
              <FaRedo className={`text-[9px] ${isRetrying ? "animate-spin" : ""}`} />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-slate-400 hover:text-white p-0.5 rounded-full transition ml-1 cursor-pointer"
              title="Dismiss status"
            >
              <FaTimes className="text-[10px]" />
            </button>
          </div>
        )}

        {/* =====================================================
            STATE: CHECKING
        ===================================================== */}
        {status === "checking" && (
          <div className="flex items-center gap-2 bg-slate-900/95 text-slate-300 border-slate-700 px-3.5 py-1.5 rounded-full shadow-lg">
            <FaSyncAlt className="text-indigo-400 animate-spin text-xs" />
            <span>Verifying connection...</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default BackendHealthBanner;
