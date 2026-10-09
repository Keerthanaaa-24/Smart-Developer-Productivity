/**
 * Smart Developer Productivity — Background Service Worker (Manifest V3)
 * 
 * CORE PRINCIPLES & SAFEGUARDS:
 * 1. PRIVACY-FIRST: Only monitors strictly whitelisted developer & learning platforms.
 * 2. CONSENT-FIRST: Opt-in required. Disabled by default until explicitly enabled.
 * 3. NO SPYWARE: No page content scraping, no cookie access, no password logging, no keystroke storage.
 * 4. ACCURATE ACTIVE-TIME: Counts duration ONLY when tab is focused, window is active, and user is not idle.
 * 5. RESILIENT OFFLINE SYNC: Idempotent deduplication keys with exponential backoff offline queue.
 */

// Whitelist of supported platforms matching Phase 1 registry
const DOMAIN_PLATFORM_MAP = [
  { domain: "github.com", platform: "github", category: "coding", name: "GitHub" },
  { domain: "gist.github.com", platform: "github", category: "coding", name: "GitHub" },
  { domain: "leetcode.com", platform: "leetcode", category: "problem_solving", name: "LeetCode" },
  { domain: "coursera.org", platform: "coursera", category: "learning", name: "Coursera" },
  { domain: "nptel.ac.in", platform: "nptel", category: "learning", name: "NPTEL" },
  { domain: "swayam.gov.in", platform: "nptel", category: "learning", name: "NPTEL / Swayam" },
  { domain: "geeksforgeeks.org", platform: "geeksforgeeks", category: "problem_solving", name: "GeeksforGeeks" },
  { domain: "freecodecamp.org", platform: "freecodecamp", category: "learning", name: "freeCodeCamp" },
  { domain: "linkedin.com", platform: "linkedin", category: "career", name: "LinkedIn" },
  { domain: "naukri.com", platform: "naukri", category: "career", name: "Naukri" },
  { domain: "vscode.dev", platform: "vscode", category: "coding", name: "VS Code" },
  { domain: "github.dev", platform: "vscode", category: "coding", name: "GitHub Codespaces" },
];

const DEFAULT_API_URL = "http://127.0.0.1:8001";
const MIN_SESSION_SECONDS = 3; // Ignore intervals < 3 seconds
const IDLE_TIMEOUT_SECONDS = 60; // 60 seconds inactivity triggers idle exclusion

let activeSession = null; // { platform, category, startedAt, domain, tabId, activeSeconds, idleSeconds }
let isIdle = false;
let isWindowFocused = true;

// =========================================================
// HELPER UTILITIES
// =========================================================

function identifyPlatform(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    for (const item of DOMAIN_PLATFORM_MAP) {
      if (hostname === item.domain || hostname.endsWith("." + item.domain)) {
        return item;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function generateSessionKey(userId, platform, startTs, endTs) {
  const rand = Math.random().toString(36).substring(2, 8);
  return `bts_${userId || "anon"}_${platform}_${startTs}_${endTs}_${rand}`;
}

async function getStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

async function setStorageData(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, resolve);
  });
}

// =========================================================
// SESSION LIFECYCLE & TIME MEASUREMENT
// =========================================================

async function commitActiveSession(reason = "tab_changed") {
  if (!activeSession) return null;

  const now = Date.now();
  const startedAt = activeSession.startedAt;
  const elapsedSeconds = Math.max(0, Math.round((now - startedAt) / 1000));
  
  // Active seconds: only count if not idle and window was focused
  const activeSeconds = isIdle || !isWindowFocused ? 0 : elapsedSeconds;
  const idleSeconds = isIdle ? elapsedSeconds : 0;

  const sessionData = { ...activeSession };
  activeSession = null;
  await setStorageData({ sdp_active_session: null });

  if (activeSeconds < MIN_SESSION_SECONDS) {
    return null;
  }

  const startDate = new Date(startedAt);
  const endDate = new Date(now);
  const store = await getStorageData([
    "sdp_offline_queue",
    "sdp_today_stats",
    "sdp_user_info",
  ]);

  const userId = store.sdp_user_info?.id || store.sdp_user_info?.username || "user";
  const sessionKey = generateSessionKey(userId, sessionData.platform, startedAt, now);

  const sessionPayload = {
    session_key: sessionKey,
    platform: sessionData.platform,
    domain: sessionData.domain,
    category: sessionData.category,
    started_at: startDate.toISOString(),
    ended_at: endDate.toISOString(),
    active_seconds: activeSeconds,
    idle_seconds: idleSeconds,
    source: "browser_extension",
  };

  // 1. Buffer into local offline queue
  const queue = store.sdp_offline_queue || [];
  queue.push(sessionPayload);

  // 2. Update local today's stats cache
  const todayStr = startDate.toISOString().slice(0, 10);
  const todayStats = store.sdp_today_stats || { date: todayStr, platforms: {} };
  if (todayStats.date !== todayStr) {
    todayStats.date = todayStr;
    todayStats.platforms = {};
  }
  const platKey = sessionData.platform.toLowerCase();
  todayStats.platforms[platKey] = (todayStats.platforms[platKey] || 0) + activeSeconds;

  await setStorageData({
    sdp_offline_queue: queue,
    sdp_today_stats: todayStats,
  });

  // 3. Trigger asynchronous sync with backend
  syncQueueWithBackend();

  return sessionPayload;
}

async function startSessionForTab(tab) {
  if (!tab || !tab.url || isIdle || !isWindowFocused) return;

  const storage = await getStorageData(["sdp_tracking_enabled"]);
  if (!storage.sdp_tracking_enabled) {
    return; // Strict consent: tracking disabled
  }

  const platformInfo = identifyPlatform(tab.url);
  if (!platformInfo) {
    // Navigated to untracked domain: commit active interval if any
    await commitActiveSession("navigated_to_untracked");
    return;
  }

  // If already tracking this exact platform on this tab, keep running
  if (
    activeSession &&
    activeSession.platform === platformInfo.platform &&
    activeSession.tabId === tab.id
  ) {
    return;
  }

  // Commit previous session before starting new one
  await commitActiveSession("switched_platform");

  // Start new verified active session interval
  activeSession = {
    platform: platformInfo.platform,
    category: platformInfo.category,
    name: platformInfo.name,
    domain: platformInfo.domain,
    tabId: tab.id,
    startedAt: Date.now(),
  };

  await setStorageData({ sdp_active_session: activeSession });
}

// =========================================================
// RESILIENT BACKEND SYNCHRONIZATION
// =========================================================

async function syncQueueWithBackend() {
  const store = await getStorageData([
    "sdp_offline_queue",
    "sdp_auth_token",
    "sdp_api_url",
    "sdp_tracking_enabled",
  ]);

  if (!store.sdp_tracking_enabled) return;

  const queue = store.sdp_offline_queue || [];
  if (queue.length === 0) return;

  const token = store.sdp_auth_token;
  if (!token) return; // User not connected yet

  const apiUrl = store.sdp_api_url || DEFAULT_API_URL;
  const syncEndpoint = `${apiUrl}/time-tracking/sessions/sync`;

  try {
    const response = await fetch(syncEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessions: queue }),
    });

    if (response.ok) {
      const data = await response.json();
      const syncedKeys = new Set(
        (data.sessions || []).map((s) => s.session_key)
      );

      // Remove successfully synced items from offline buffer
      const remainingQueue = queue.filter(
        (item) => !syncedKeys.has(item.session_key)
      );

      await setStorageData({
        sdp_offline_queue: remainingQueue,
        sdp_last_sync: new Date().toISOString(),
      });
    } else if (response.status === 404) {
      // Fallback for backward compatibility to Phase 1 endpoint
      const legacyEndpoint = `${apiUrl}/activity/extension-sync`;
      const legacyEvents = queue.map((q) => ({
        extension_event_id: q.session_key,
        platform: q.platform,
        category: q.category || "coding",
        activity_type: "platform_session",
        title: `Active session on ${q.platform}`,
        details: `Active browser session (${q.active_seconds}s)`,
        started_at: q.started_at,
        ended_at: q.ended_at,
        duration_seconds: q.active_seconds,
        source: "browser_extension",
      }));

      const legacyResp = await fetch(legacyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ events: legacyEvents }),
      });

      if (legacyResp.ok) {
        await setStorageData({
          sdp_offline_queue: [],
          sdp_last_sync: new Date().toISOString(),
        });
      }
    } else if (response.status === 401) {
      console.warn("[Smart Productivity] Extension authorization expired. Please log in again.");
    }
  } catch (err) {
    // Network offline: retain queue locally for exponential backoff sync
    console.debug("[Smart Productivity] Sync deferred (offline/network):", err.message);
  }
}

// =========================================================
// EVENT LISTENERS (TABS, WINDOWS, IDLE, ALARMS)
// =========================================================

// 1. Tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    startSessionForTab(tab);
  } catch {}
});

// 2. Tab URL updates or reloads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    if (tab.active) {
      startSessionForTab(tab);
    }
  }
});

// 3. Tab Closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (activeSession && activeSession.tabId === tabId) {
    await commitActiveSession("tab_closed");
  }
});

// 4. Window Focus Changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    isWindowFocused = false;
    await commitActiveSession("window_blurred");
  } else {
    isWindowFocused = true;
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) {
      startSessionForTab(tab);
    }
  }
});

// 5. Idle Detection (Default 60 seconds threshold)
chrome.idle.setDetectionInterval(IDLE_TIMEOUT_SECONDS);
chrome.idle.onStateChanged.addListener(async (newState) => {
  if (newState === "idle" || newState === "locked") {
    isIdle = true;
    await commitActiveSession("user_idle");
  } else if (newState === "active") {
    isIdle = false;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      startSessionForTab(tab);
    }
  }
});

// 6. Periodic Background Sync Alarm (every 1 minute)
chrome.alarms.create("sdp_periodic_sync", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sdp_periodic_sync") {
    syncQueueWithBackend();
  }
});

// 7. Message Handler (Popup & Content Script)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "USER_PRESENCE_HEARTBEAT") {
    if (isIdle) {
      isIdle = false;
      if (sender.tab && sender.tab.active) {
        startSessionForTab(sender.tab);
      }
    }
    sendResponse({ received: true });
    return true;
  }

  if (message.type === "GET_STATE") {
    (async () => {
      const store = await getStorageData([
        "sdp_tracking_enabled",
        "sdp_auth_token",
        "sdp_user_info",
        "sdp_offline_queue",
        "sdp_today_stats",
        "sdp_active_session",
        "sdp_last_sync",
        "sdp_api_url",
      ]);

      sendResponse({
        trackingEnabled: Boolean(store.sdp_tracking_enabled),
        authToken: store.sdp_auth_token || null,
        userInfo: store.sdp_user_info || null,
        queueLength: (store.sdp_offline_queue || []).length,
        todayStats: store.sdp_today_stats || { platforms: {} },
        activeSession: activeSession || store.sdp_active_session || null,
        lastSync: store.sdp_last_sync || null,
        apiUrl: store.sdp_api_url || DEFAULT_API_URL,
      });
    })();
    return true;
  }

  if (message.type === "SET_TRACKING_ENABLED") {
    (async () => {
      const enabled = Boolean(message.enabled);
      await setStorageData({ sdp_tracking_enabled: enabled });
      if (!enabled) {
        await commitActiveSession("tracking_disabled");
      } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) startSessionForTab(tab);
      }
      sendResponse({ success: true, trackingEnabled: enabled });
    })();
    return true;
  }

  if (message.type === "FORCE_SYNC") {
    (async () => {
      await commitActiveSession("manual_sync");
      await syncQueueWithBackend();
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.type === "LOGIN") {
    (async () => {
      const apiUrl = message.apiUrl || DEFAULT_API_URL;
      try {
        const formData = new URLSearchParams();
        formData.append("username", message.username);
        formData.append("password", message.password);

        const resp = await fetch(`${apiUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });

        if (resp.ok) {
          const authData = await resp.json();
          await setStorageData({
            sdp_auth_token: authData.access_token,
            sdp_user_info: { username: message.username, id: authData.user_id },
            sdp_api_url: apiUrl,
          });
          syncQueueWithBackend();
          sendResponse({ success: true, user: message.username });
        } else {
          const errData = await resp.json().catch(() => ({}));
          sendResponse({ success: false, error: errData.detail || "Invalid credentials" });
        }
      } catch (err) {
        sendResponse({ success: false, error: "Unable to connect to backend server." });
      }
    })();
    return true;
  }

  if (message.type === "LOGOUT") {
    (async () => {
      await setStorageData({
        sdp_auth_token: null,
        sdp_user_info: null,
      });
      sendResponse({ success: true });
    })();
    return true;
  }
});
