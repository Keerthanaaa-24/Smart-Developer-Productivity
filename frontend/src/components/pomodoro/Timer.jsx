import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  FaPlay,
  FaPause,
  FaRedo,
  FaForward,
  FaCheck,
  FaTasks,
  FaBell,
  FaVolumeUp,
  FaVolumeMute,
} from "react-icons/fa";
import API from "../../api/axios";
import {
  startPomodoroSession,
  pausePomodoroSession,
  resumePomodoroSession,
  completePomodoroSession,
  cancelPomodoroSession,
  getActivePomodoroSession,
} from "../../api/pomodoroApi";
import { playCompletionChime } from "../../utils/sound";

const MODE_DURATIONS = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

const MODE_LABELS = {
  focus: "Focus Session",
  short_break: "Short Break",
  long_break: "Long Break",
};

const MODE_THEMES = {
  focus: {
    bg: "from-blue-600 to-indigo-700",
    ring: "stroke-blue-500",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
    activeTab: "bg-blue-600 text-white shadow-md",
  },
  short_break: {
    bg: "from-emerald-600 to-teal-700",
    ring: "stroke-emerald-500",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    button: "bg-emerald-600 hover:bg-emerald-700 text-white",
    activeTab: "bg-emerald-600 text-white shadow-md",
  },
  long_break: {
    bg: "from-purple-600 to-pink-700",
    ring: "stroke-purple-500",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    button: "bg-purple-600 hover:bg-purple-700 text-white",
    activeTab: "bg-purple-600 text-white shadow-md",
  },
};

const LOCAL_STORAGE_KEY = "smart_pomodoro_state_v2";

const Timer = ({ onSessionCompleted }) => {
  const [durations, setDurations] = useState(MODE_DURATIONS);
  const [maxCycleCount, setMaxCycleCount] = useState(4);
  const [mode, setMode] = useState("focus");
  const [plannedSeconds, setPlannedSeconds] = useState(MODE_DURATIONS.focus);
  const [remainingSeconds, setRemainingSeconds] = useState(MODE_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [cycle, setCycle] = useState(1);
  const [sessionId, setSessionId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  // References for timestamp tracking
  const startTimestampRef = useRef(null);
  const elapsedBeforePauseRef = useRef(0);
  const animationFrameRef = useRef(null);

  // 1. Fetch available tasks & user productivity settings
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [taskRes, settingsRes] = await Promise.all([
          API.get("/tasks/"),
          API.get("/settings/all").catch(() => null),
        ]);

        const taskList = Array.isArray(taskRes.data) ? taskRes.data : [];
        setTasks(taskList.filter((t) => t.status !== "Completed"));

        if (settingsRes?.data?.productivity) {
          const prod = settingsRes.data.productivity;
          const customDurations = {
            focus: (prod.pomodoro_focus_duration || 25) * 60,
            short_break: (prod.pomodoro_short_break || 5) * 60,
            long_break: (prod.pomodoro_long_break || 15) * 60,
          };
          setDurations(customDurations);
          setMaxCycleCount(prod.pomodoro_cycle_count || 4);

          // If no active session stored in localStorage, update current planned duration
          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (!saved) {
            setPlannedSeconds(customDurations.focus);
            setRemainingSeconds(customDurations.focus);
          }
        }

        if (settingsRes?.data?.notifications) {
          setSoundEnabled(Boolean(settingsRes.data.notifications.sound_enabled));
        }
      } catch (err) {
        console.warn("Could not load initial settings/tasks for Pomodoro:", err);
      }
    };
    fetchInitialData();
  }, []);

  // 2. Request Notification Permission
  const toggleNotifications = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      setNotificationEnabled(!notificationEnabled);
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      setNotificationEnabled(permission === "granted");
    }
  };

  const notifyUser = useCallback((title, body) => {
    if (notificationEnabled && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body, icon: "/vite.svg" });
      } catch (e) {
        console.warn("Notification error:", e);
      }
    }
  }, [notificationEnabled]);

  // 3. Complete Session Handler
  const handleSessionComplete = useCallback(async () => {
    setIsRunning(false);
    if (soundEnabled) {
      playCompletionChime();
    }

    const actualDuration = plannedSeconds;

    if (mode === "focus") {
      notifyUser("Focus Session Completed! 🍅", "Great work! Time for a well-deserved break.");
    } else {
      notifyUser("Break Finished! ⚡", "Ready to start your next focus session?");
    }

    if (sessionId) {
      try {
        await completePomodoroSession(sessionId, actualDuration);
      } catch (err) {
        console.error("Failed to mark session complete in backend:", err);
      }
    }

    // Determine next mode and cycle
    if (mode === "focus") {
      if (cycle >= maxCycleCount) {
        setMode("long_break");
        setPlannedSeconds(durations.long_break);
        setRemainingSeconds(durations.long_break);
        setCycle(1);
      } else {
        setMode("short_break");
        setPlannedSeconds(durations.short_break);
        setRemainingSeconds(durations.short_break);
        setCycle((prev) => prev + 1);
      }
    } else {
      setMode("focus");
      setPlannedSeconds(durations.focus);
      setRemainingSeconds(durations.focus);
    }

    setSessionId(null);
    startTimestampRef.current = null;
    elapsedBeforePauseRef.current = 0;
    localStorage.removeItem(LOCAL_STORAGE_KEY);

    if (onSessionCompleted) {
      onSessionCompleted();
    }
  }, [mode, cycle, plannedSeconds, sessionId, soundEnabled, notifyUser, onSessionCompleted]);

  // 4. Persistence / Recovery from localStorage & backend on initial load
  useEffect(() => {
    const restoreState = async () => {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const {
            savedMode,
            savedPlannedSeconds,
            savedStartTimestamp,
            savedElapsedBeforePause,
            savedIsRunning,
            savedCycle,
            savedSessionId,
            savedTaskId,
          } = parsed;

          setMode(savedMode || "focus");
          setPlannedSeconds(savedPlannedSeconds || MODE_DURATIONS.focus);
          setCycle(savedCycle || 1);
          setSessionId(savedSessionId || null);
          if (savedTaskId) setSelectedTaskId(savedTaskId);

          if (savedIsRunning && savedStartTimestamp) {
            const elapsedSinceStart = Math.floor((Date.now() - savedStartTimestamp) / 1000);
            const totalElapsed = (savedElapsedBeforePause || 0) + elapsedSinceStart;
            const remaining = Math.max(0, savedPlannedSeconds - totalElapsed);

            if (remaining > 0) {
              setRemainingSeconds(remaining);
              setIsRunning(true);
              startTimestampRef.current = savedStartTimestamp;
              elapsedBeforePauseRef.current = savedElapsedBeforePause || 0;
            } else {
              setRemainingSeconds(0);
              setIsRunning(false);
            }
          } else if (savedElapsedBeforePause) {
            const remaining = Math.max(0, savedPlannedSeconds - savedElapsedBeforePause);
            setRemainingSeconds(remaining);
            setIsRunning(false);
            elapsedBeforePauseRef.current = savedElapsedBeforePause;
          }
        } else {
          // Check backend active session
          const activeBackend = await getActivePomodoroSession();
          if (activeBackend) {
            setSessionId(activeBackend.id);
            setMode(activeBackend.session_type || "focus");
            setPlannedSeconds(activeBackend.planned_duration_seconds || MODE_DURATIONS.focus);
            setCycle(activeBackend.cycle_number || 1);
            if (activeBackend.task_id) setSelectedTaskId(String(activeBackend.task_id));

            if (activeBackend.started_at && activeBackend.status === "running") {
              const startMs = new Date(activeBackend.started_at).getTime();
              const elapsed = Math.floor((Date.now() - startMs) / 1000);
              const remaining = Math.max(0, activeBackend.planned_duration_seconds - elapsed);
              setRemainingSeconds(remaining);
              setIsRunning(true);
              startTimestampRef.current = startMs;
            }
          }
        }
      } catch (err) {
        console.warn("Error restoring timer state:", err);
      }
    };
    restoreState();
  }, []);

  // 5. Timer Tick Loop based on timestamps
  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      if (!startTimestampRef.current) {
        startTimestampRef.current = Date.now();
      }

      const elapsedSinceStart = Math.floor((Date.now() - startTimestampRef.current) / 1000);
      const totalElapsed = elapsedBeforePauseRef.current + elapsedSinceStart;
      const left = Math.max(0, plannedSeconds - totalElapsed);

      setRemainingSeconds(left);

      // Save state to localStorage on each tick
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          savedMode: mode,
          savedPlannedSeconds: plannedSeconds,
          savedStartTimestamp: startTimestampRef.current,
          savedElapsedBeforePause: elapsedBeforePauseRef.current,
          savedIsRunning: true,
          savedCycle: cycle,
          savedSessionId: sessionId,
          savedTaskId: selectedTaskId,
        })
      );

      if (left <= 0) {
        handleSessionComplete();
      } else {
        animationFrameRef.current = setTimeout(tick, 500);
      }
    };

    animationFrameRef.current = setTimeout(tick, 500);

    return () => {
      if (animationFrameRef.current) {
        clearTimeout(animationFrameRef.current);
      }
    };
  }, [isRunning, plannedSeconds, mode, cycle, sessionId, selectedTaskId, handleSessionComplete]);

  // 6. Action Handlers
  const handleStart = async () => {
    setIsRunning(true);
    const now = Date.now();
    startTimestampRef.current = now;

    try {
      const taskIdNum = selectedTaskId ? parseInt(selectedTaskId, 10) : null;
      const session = await startPomodoroSession({
        taskId: taskIdNum,
        sessionType: mode,
        plannedDurationSeconds: plannedSeconds,
        cycleNumber: cycle,
      });
      if (session?.id) {
        setSessionId(session.id);
      }
    } catch (err) {
      console.error("Failed to start session in backend:", err);
    }
  };

  const handlePause = async () => {
    setIsRunning(false);
    if (animationFrameRef.current) clearTimeout(animationFrameRef.current);

    const elapsedCurrent = startTimestampRef.current
      ? Math.floor((Date.now() - startTimestampRef.current) / 1000)
      : 0;
    const totalElapsed = elapsedBeforePauseRef.current + elapsedCurrent;
    elapsedBeforePauseRef.current = totalElapsed;
    startTimestampRef.current = null;

    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        savedMode: mode,
        savedPlannedSeconds: plannedSeconds,
        savedStartTimestamp: null,
        savedElapsedBeforePause: totalElapsed,
        savedIsRunning: false,
        savedCycle: cycle,
        savedSessionId: sessionId,
        savedTaskId: selectedTaskId,
      })
    );

    if (sessionId) {
      try {
        await pausePomodoroSession(sessionId, totalElapsed);
      } catch (err) {
        console.error("Failed to pause session in backend:", err);
      }
    }
  };

  const handleResume = async () => {
    setIsRunning(true);
    startTimestampRef.current = Date.now();

    if (sessionId) {
      try {
        await resumePomodoroSession(sessionId);
      } catch (err) {
        console.error("Failed to resume session in backend:", err);
      }
    }
  };

  const handleReset = async () => {
    setIsRunning(false);
    if (animationFrameRef.current) clearTimeout(animationFrameRef.current);

    const totalElapsed = elapsedBeforePauseRef.current;
    if (sessionId) {
      try {
        await cancelPomodoroSession(sessionId, totalElapsed);
      } catch (err) {
        console.error("Failed to cancel session in backend:", err);
      }
    }

    setRemainingSeconds(plannedSeconds);
    setSessionId(null);
    startTimestampRef.current = null;
    elapsedBeforePauseRef.current = 0;
    localStorage.removeItem(LOCAL_STORAGE_KEY);

    if (onSessionCompleted) {
      onSessionCompleted();
    }
  };

  const handleModeChange = async (newMode) => {
    if (isRunning) {
      handleReset();
    }
    setMode(newMode);
    const duration = durations[newMode] || MODE_DURATIONS[newMode];
    setPlannedSeconds(duration);
    setRemainingSeconds(duration);
    startTimestampRef.current = null;
    elapsedBeforePauseRef.current = 0;
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const handleSkip = () => {
    handleReset();
    if (mode === "focus") {
      setMode("short_break");
      setPlannedSeconds(durations.short_break);
      setRemainingSeconds(durations.short_break);
    } else {
      setMode("focus");
      setPlannedSeconds(durations.focus);
      setRemainingSeconds(durations.focus);
    }
  };

  // 7. Format MM:SS
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Progress Calculation
  const progressRatio = plannedSeconds > 0 ? (plannedSeconds - remainingSeconds) / plannedSeconds : 0;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const currentTheme = MODE_THEMES[mode] || MODE_THEMES.focus;
  const selectedTask = useMemo(
    () => tasks.find((t) => String(t.id) === String(selectedTaskId)),
    [tasks, selectedTaskId]
  );

  const cycleSteps = Array.from({ length: maxCycleCount }, (_, i) => i + 1);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs dark:shadow-xl flex flex-col items-center text-center relative overflow-hidden transition-colors duration-200">
      {/* Sound & Notification Controls */}
      <div className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-6">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Cycle:</span>
          <div className="flex items-center gap-1 ml-1">
            {cycleSteps.map((step) => (
              <span
                key={step}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  step < cycle
                    ? "bg-emerald-500"
                    : step === cycle
                    ? "bg-blue-600 ring-2 ring-blue-300 dark:ring-blue-800"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>
          <span className="text-slate-400 dark:text-slate-500 text-[11px] ml-1">
            (Session {cycle} of {maxCycleCount})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition cursor-pointer ${
              soundEnabled
                ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
            title={soundEnabled ? "Mute completion chime" : "Enable completion chime"}
          >
            {soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
          </button>

          <button
            onClick={toggleNotifications}
            className={`p-2 rounded-lg border transition cursor-pointer ${
              notificationEnabled
                ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
            title="Browser Notifications"
          >
            <FaBell />
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1 mb-8">
        <button
          onClick={() => handleModeChange("focus")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            mode === "focus"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Focus ({Math.round(durations.focus / 60)}m)
        </button>
        <button
          onClick={() => handleModeChange("short_break")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            mode === "short_break"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Short Break ({Math.round(durations.short_break / 60)}m)
        </button>
        <button
          onClick={() => handleModeChange("long_break")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            mode === "long_break"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Long Break ({Math.round(durations.long_break / 60)}m)
        </button>
      </div>

      {/* Circular Progress Timer */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
          <circle
            cx="130"
            cy="130"
            r="115"
            className="stroke-slate-100 dark:stroke-slate-800"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx="130"
            cy="130"
            r="115"
            className={`${currentTheme.ring} transition-all duration-500`}
            strokeWidth="10"
            strokeDasharray={2 * Math.PI * 115}
            strokeDashoffset={2 * Math.PI * 115 * (1 - progressRatio)}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute flex flex-col items-center">
          <span className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
            {timeFormatted}
          </span>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border mt-2 ${currentTheme.badge}`}>
            {MODE_LABELS[mode]}
          </span>
        </div>
      </div>

      {/* Task Association Dropdown (Focus Mode Only) */}
      {mode === "focus" && (
        <div className="w-full max-w-sm mb-6 text-left">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <FaTasks className="text-slate-400 dark:text-slate-500" />
            <span>Link Focus to Task (Optional):</span>
          </label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            disabled={isRunning}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          >
            <option value="">No Task (Free Flow Focus)</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.priority === "High" ? "⚡ [High] " : ""}
                {task.title}
              </option>
            ))}
          </select>

          {selectedTask && (
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-1 truncate">
              Linked: {selectedTask.title}
            </p>
          )}
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
        {!isRunning && remainingSeconds === plannedSeconds && (
          <button
            onClick={handleStart}
            className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm shadow-md hover:shadow-lg active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 ${currentTheme.button}`}
          >
            <FaPlay className="text-xs" />
            <span>Start {MODE_LABELS[mode]}</span>
          </button>
        )}

        {isRunning && (
          <button
            onClick={handlePause}
            className="flex-1 py-3.5 px-6 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <FaPause className="text-xs" />
            <span>Pause Timer</span>
          </button>
        )}

        {!isRunning && remainingSeconds < plannedSeconds && remainingSeconds > 0 && (
          <>
            <button
              onClick={handleResume}
              className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 ${currentTheme.button}`}
            >
              <FaPlay className="text-xs" />
              <span>Resume</span>
            </button>

            <button
              onClick={handleSessionComplete}
              className="py-3.5 px-5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
              title="Complete session early"
            >
              <FaCheck className="text-xs" />
              <span>Complete</span>
            </button>
          </>
        )}

        {(remainingSeconds < plannedSeconds || isRunning) && (
          <button
            onClick={handleReset}
            className="py-3.5 px-4 rounded-xl font-semibold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
            title="Reset timer"
          >
            <FaRedo className="text-[10px]" />
            <span>Reset</span>
          </button>
        )}

        {mode !== "focus" && (
          <button
            onClick={handleSkip}
            className="py-3.5 px-4 rounded-xl font-semibold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
            title="Skip break and return to focus"
          >
            <FaForward className="text-[10px]" />
            <span>Skip Break</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Timer;