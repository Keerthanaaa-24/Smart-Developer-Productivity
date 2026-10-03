/**
 * Smart Developer Productivity — Extension Popup Script
 */

const PLATFORM_ICONS = {
  github: "🐙",
  leetcode: "💻",
  coursera: "📚",
  nptel: "🎓",
  geeksforgeeks: "🟢",
  freecodecamp: "🔥",
  linkedin: "💼",
  naukri: "🌐",
};

let currentTrackingState = false;
let activeSessionStartedAt = null;
let timerInterval = null;

// DOM Elements
const trackingBadge = document.getElementById("tracking-state-badge");
const toggleTrackingBtn = document.getElementById("toggle-tracking-btn");
const consentBox = document.getElementById("consent-explanation");
const connectionPill = document.getElementById("connection-status-pill");
const connectionStatusText = document.getElementById("connection-status-text");

const activeSessionCard = document.getElementById("active-session-card");
const activePlatformIcon = document.getElementById("active-platform-icon");
const activePlatformName = document.getElementById("active-platform-name");
const activeSessionTimer = document.getElementById("active-session-timer");

const platformStatsList = document.getElementById("platform-stats-list");
const totalTodayTime = document.getElementById("total-today-time");
const queueStatusText = document.getElementById("queue-status-text");
const lastSyncTime = document.getElementById("last-sync-time");
const syncNowBtn = document.getElementById("sync-now-btn");

const loginContainer = document.getElementById("login-form-container");
const loggedInContainer = document.getElementById("logged-in-container");
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("auth-username");
const passwordInput = document.getElementById("auth-password");
const loginError = document.getElementById("login-error");
const connectedUserName = document.getElementById("connected-user-name");
const logoutBtn = document.getElementById("logout-btn");
const openDashboardBtn = document.getElementById("open-dashboard-btn");

// =========================================================
// UI HELPERS
// =========================================================

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function formatTimer(elapsedMs) {
  const totalSec = Math.floor(elapsedMs / 1000);
  const hrs = Math.floor(totalSec / 3600).toString().padStart(2, "0");
  const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
  const secs = (totalSec % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

function renderStats(todayStats) {
  const platforms = todayStats?.platforms || {};
  const entries = Object.entries(platforms).filter(([_, secs]) => secs > 0);

  let totalSecs = 0;
  platformStatsList.innerHTML = "";

  if (entries.length === 0) {
    platformStatsList.innerHTML = '<div class="empty-state">No platform activity recorded today yet.</div>';
    totalTodayTime.textContent = "0m";
    return;
  }

  entries.forEach(([plat, secs]) => {
    totalSecs += secs;
    const item = document.createElement("div");
    item.className = "stat-item";
    const icon = PLATFORM_ICONS[plat.toLowerCase()] || "⚡";
    item.innerHTML = `
      <span class="stat-name"><span>${icon}</span> ${plat.charAt(0).toUpperCase() + plat.slice(1)}</span>
      <span class="stat-time">${formatDuration(secs)}</span>
    `;
    platformStatsList.appendChild(item);
  });

  totalTodayTime.textContent = formatDuration(totalSecs);
}

function startTimer(startedAt) {
  if (timerInterval) clearInterval(timerInterval);
  activeSessionStartedAt = startedAt;

  function update() {
    if (!activeSessionStartedAt) return;
    const diff = Date.now() - activeSessionStartedAt;
    activeSessionTimer.textContent = formatTimer(diff);
  }

  update();
  timerInterval = setInterval(update, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  activeSessionStartedAt = null;
}

// =========================================================
// STATE SYNC
// =========================================================

function refreshState() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (state) => {
    if (!state) return;

    currentTrackingState = state.trackingEnabled;

    // 1. Tracking State Toggle
    if (currentTrackingState) {
      trackingBadge.textContent = "● ON";
      trackingBadge.className = "badge badge-on";
      toggleTrackingBtn.textContent = "Pause Activity Tracking";
      toggleTrackingBtn.className = "btn btn-secondary btn-block";
      consentBox.classList.add("hidden");
    } else {
      trackingBadge.textContent = "○ OFF";
      trackingBadge.className = "badge badge-off";
      toggleTrackingBtn.textContent = "Enable Activity Tracking";
      toggleTrackingBtn.className = "btn btn-primary btn-block";
      consentBox.classList.remove("hidden");
    }

    // 2. Active Session Display
    if (state.activeSession && currentTrackingState) {
      activeSessionCard.classList.remove("hidden");
      activePlatformName.textContent = state.activeSession.name || state.activeSession.platform;
      const platKey = (state.activeSession.platform || "").toLowerCase();
      activePlatformIcon.textContent = PLATFORM_ICONS[platKey] || "💻";
      startTimer(state.activeSession.startedAt);
    } else {
      activeSessionCard.classList.add("hidden");
      stopTimer();
    }

    // 3. Today's Breakdown
    renderStats(state.todayStats);

    // 4. Offline Queue & Sync Status
    if (state.queueLength > 0) {
      queueStatusText.textContent = `⚡ ${state.queueLength} item(s) queued offline`;
      queueStatusText.style.color = "var(--amber)";
    } else {
      queueStatusText.textContent = "✓ Synced with Cloud";
      queueStatusText.style.color = "var(--success)";
    }

    if (state.lastSync) {
      const syncDate = new Date(state.lastSync);
      lastSyncTime.textContent = `Last sync: ${syncDate.toLocaleTimeString()}`;
    } else {
      lastSyncTime.textContent = "Last sync: Pending";
    }

    // 5. Auth Connection Status
    if (state.authToken) {
      connectionPill.className = "status-pill online";
      connectionStatusText.textContent = "Connected";
      loginContainer.classList.add("hidden");
      loggedInContainer.classList.remove("hidden");
      connectedUserName.textContent = state.userInfo?.username || "Smart Developer";
    } else {
      connectionPill.className = "status-pill offline";
      connectionStatusText.textContent = "Offline / Login Required";
      loginContainer.classList.remove("hidden");
      loggedInContainer.classList.add("hidden");
    }
  });
}

// =========================================================
// EVENT LISTENERS
// =========================================================

// Tracking Toggle
toggleTrackingBtn.addEventListener("click", () => {
  const nextState = !currentTrackingState;
  chrome.runtime.sendMessage(
    { type: "SET_TRACKING_ENABLED", enabled: nextState },
    () => refreshState()
  );
});

// Force Sync
syncNowBtn.addEventListener("click", () => {
  syncNowBtn.disabled = true;
  syncNowBtn.textContent = "Syncing...";
  chrome.runtime.sendMessage({ type: "FORCE_SYNC" }, () => {
    setTimeout(() => {
      syncNowBtn.disabled = false;
      syncNowBtn.textContent = "Sync Now";
      refreshState();
    }, 500);
  });
});

// Login
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) return;

  const submitBtn = document.getElementById("login-submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Connecting...";

  chrome.runtime.sendMessage(
    { type: "LOGIN", username, password },
    (res) => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Connect Extension";

      if (res && res.success) {
        passwordInput.value = "";
        refreshState();
      } else {
        loginError.textContent = res?.error || "Login failed. Check credentials.";
        loginError.classList.remove("hidden");
      }
    }
  );
});

// Logout
logoutBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    refreshState();
  });
});

// Open Dashboard
openDashboardBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "http://localhost:5173" });
});

// Initialize on load
document.addEventListener("DOMContentLoaded", refreshState);
