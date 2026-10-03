/**
 * Smart Developer Productivity — Background Service Worker (Manifest V3)
 * 
 * CORE PRINCIPLES:
 * 1. PRIVACY-FIRST: Only tracks active time on strictly whitelisted domains.
 * 2. CONSENT-FIRST: Disabled by default until user explicitly enables tracking.
 * 3. NO SPYWARE: No page content scraping, no cookie access, no password logging.
 * 4. OFFLINE RESILIENT: Local queue buffers data until online sync succeeds.
 */

// Supported Platform Mapping Whitelist
const DOMAIN_PLATFORM_MAP = [
  { domain: "github.com", platform: "github", category: "coding", name: "GitHub" },
  { domain: "leetcode.com", platform: "leetcode", category: "problem_solving", name: "LeetCode" },
  { domain: "coursera.org", platform: "coursera", category: "learning", name: "Coursera" },
  { domain: "nptel.ac.in", platform: "nptel", category: "learning", name: "NPTEL" },
  { domain: "geeksforgeeks.org", platform: "geeksforgeeks", category: "problem_solving", name: "GeeksforGeeks" },
  { domain: "freecodecamp.org", platform: "freecodecamp", category: "learning", name: "freeCodeCamp" },
  { domain: "linkedin.com", platform: "linkedin", category: "career", name: "LinkedIn" },
  { domain: "naukri.com", platform: "naukri", category: "career", name: "Naukri" },
];

const DEFAULT_API_URL = "http://127.0.0.1:8001";
const MIN_SESSION_SECONDS = 5; // Ignore sessions shorter than 5 seconds (prevent tab-switch noise)
const IDLE_TIMEOUT_SECONDS = 60; // 60 seconds of inactivity triggers idle pause

let activeSession = null; // { platform, category, startedAt, domain, tabId }
let isIdle = false;

// =========================================================
// HELPER FUNCTIONS
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

function generateEventId() {
  const rand = Math.random().toString(36).substring(2, 10);
  return `ext_${Date.now()}_${rand}`;
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
// SESSION MANAGEMENT
// =========================================================

async function commitActiveSession(reason = "tab_changed") {
  if (!activeSession) return null;

  const now = Date.now();
  const startedAt = activeSession.startedAt;
  const durationSeconds = Math.round((now - startedAt) / 1000);

  const sessionData = { ...activeSession };
  activeSession = null;
  await setStorageData({ sdp_active_session: null });

  if (durationSeconds < MIN_SESSION_SECONDS) {
    return null;
  }

  const startDate = new Date(startedAt);
  const endDate = new Date(now);

  const eventPayload = {
    extension_event_id: generateEventId(),
    platform: sessionData.platform,
    category: sessionData.category,
    activity_type: "platform_session",
    title: `Active session on ${sessionData.name}`,
    details: `Active browser session verified via Extension (${durationSeconds}s duration)`,
    started_at: startDate.toISOString(),
    ended_at: endDate.toISOString(),
    duration_seconds: durationSeconds,
    source: "browser_extension",
  };

  // 1. Buffer into local offline queue
  const store = await getStorageData(["sdp_offline_queue", "sdp_today_stats"]);
  const queue = store.sdp_offline_queue || [];
  queue.push(eventPayload);

  // 2. Update local today's stats cache
  const todayStr = startDate.toISOString().slice(0, 10);
  const todayStats = store.sdp_today_stats || { date: todayStr, platforms: {} };
  if (todayStats.date !== todayStr) {
    todayStats.date = todayStr;
    todayStats.platforms = {};
  }
  const platKey = sessionData.platform.toLowerCase();
  todayStats.platforms[platKey] = (todayStats.platforms[platKey] || 0) + durationSeconds;

  await setStorageData({
    sdp_offline_queue: queue,
    sdp_today_stats: todayStats,
  });

  // 3. Trigger immediate sync attempt
  syncQueueWithBackend();

  return eventPayload;
}

async function startSessionForTab(tab) {
  if (!tab || !tab.url || isIdle) return;

  const storage = await getStorageData(["sdp_tracking_enabled"]);
  if (!storage.sdp_tracking_enabled) {
    return; // Respect consent: disabled
  }

  const platformInfo = identifyPlatform(tab.url);
  if (!platformInfo) {
    // Navigated to unsupported domain: commit previous session if any
    await commitActiveSession("navigated_away");
    return;
  }

  // If already tracking the same platform on this tab, keep going
  if (
    activeSession &&
    activeSession.platform === platformInfo.platform &&
    activeSession.tabId === tab.id
  ) {
    return;
  }

  // Commit previous session before switching
  await commitActiveSession("switched_platform");

  // Start new active session
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
// BACKEND SYNCHRONIZATION
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
  if (!token) return; // User not logged in yet

  const apiUrl = store.sdp_api_url || DEFAULT_API_URL;
  const syncEndpoint = `${apiUrl}/activity/extension-sync`;

  try {
    const response = await fetch(syncEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ events: queue }),
    });

    if (response.ok) {
      const data = await response.json();
      // Remove successfully synced events from local queue
      const syncedEventIds = new Set(
        (data.synced_items || []).map((i) =>
          i.external_id ? i.external_id.replace(/^ext_/, "") : null
        )
      );

      const remainingQueue = queue.filter(
        (item) => !syncedEventIds.has(item.extension_event_id)
      );

      await setStorageData({
        sdp_offline_queue: remainingQueue,
        sdp_last_sync: new Date().toISOString(),
      });
    } else if (response.status === 401) {
      // Token expired or invalid
      console.warn("Smart Developer Productivity: Extension Auth Token Expired.");
    }
  } catch (err) {
    // Network error: keep items in queue for next scheduled sync
    console.debug("Extension offline sync deferred:", err.message);
  }
}

// =========================================================
// EVENT LISTENERS & LIFECYCLE
// =========================================================

// 1. Tab Activated (Switch tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    startSessionForTab(tab);
  } catch {}
});

// 2. Tab Updated (URL changed or page reloaded)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    if (tab.active) {
      startSessionForTab(tab);
    }
  }
});

// 3. Window Focus Changed
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // User switched to another OS application
    await commitActiveSession("window_blur");
  } else {
    // User returned to browser window
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) {
      startSessionForTab(tab);
    }
  }
});

// 4. Idle State Detection
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

// 5. Periodic Sync Alarm (Runs every 1 minute)
chrome.alarms.create("sdp_periodic_sync", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sdp_periodic_sync") {
    syncQueueWithBackend();
  }
});

// 6. Content Script Heartbeat & User Presence
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

  // Popup & Frontend Communication Messages
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
      await commitActiveSession("manual_sync_trigger");
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
            sdp_user_info: { username: message.username },
            sdp_api_url: apiUrl,
          });
          syncQueueWithBackend();
          sendResponse({ success: true, user: message.username });
        } else {
          const errData = await resp.json().catch(() => ({}));
          sendResponse({ success: false, error: errData.detail || "Invalid credentials" });
        }
      } catch (err) {
        sendResponse({ success: false, error: "Unable to connect to server." });
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
