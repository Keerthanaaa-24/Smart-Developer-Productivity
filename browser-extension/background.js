// Privacy-First Session Telemetry Service Worker
let activeTabSession = null;
let lastInteraction = Date.now();
const IDLE_TIMEOUT_SECONDS = 60;

function getPlatformFromUrl(url) {
  if (!url) return null;
  if (url.includes("github.com")) return "github";
  if (url.includes("leetcode.com")) return "leetcode";
  if (url.includes("geeksforgeeks.org")) return "geeksforgeeks";
  if (url.includes("freecodecamp.org")) return "freecodecamp";
  if (url.includes("nptel.ac.in")) return "nptel";
  return null;
}

async function flushSession() {
  if (!activeTabSession) return;

  const now = Date.now();
  const durationSecs = Math.round((now - activeTabSession.startTime) / 1000);

  if (durationSecs >= 5) {
    const { apiToken, apiBaseUrl = "http://127.0.0.1:8001" } = await chrome.storage.local.get([
      "apiToken",
      "apiBaseUrl",
    ]);

    if (apiToken) {
      const payload = {
        events: [
          {
            platform: activeTabSession.platform,
            category:
              activeTabSession.platform === "github"
                ? "coding"
                : activeTabSession.platform === "leetcode" || activeTabSession.platform === "geeksforgeeks"
                ? "problem_solving"
                : "learning",
            activity_type: "platform_session",
            title: `Active session on ${activeTabSession.platform.toUpperCase()}`,
            details: `Active browser session on ${activeTabSession.platform} (${durationSecs}s active focus)`,
            started_at: new Date(activeTabSession.startTime).toISOString(),
            ended_at: new Date(now).toISOString(),
            duration_seconds: durationSecs,
            source: "browser_extension",
            extension_event_id: `ext_${activeTabSession.startTime}_${now}`,
          },
        ],
      };

      try {
        await fetch(`${apiBaseUrl}/activity/extension-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn("[Smart Productivity] Extension sync network error:", err);
      }
    }
  }

  activeTabSession = null;
}

// Listen to tab switches
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await flushSession();
  const tab = await chrome.tabs.get(activeInfo.tabId);
  const platform = getPlatformFromUrl(tab.url);
  if (platform) {
    activeTabSession = {
      platform,
      startTime: Date.now(),
    };
  }
});

// Listen to tab updates (URL change)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    await flushSession();
    const platform = getPlatformFromUrl(changeInfo.url);
    if (platform) {
      activeTabSession = {
        platform,
        startTime: Date.now(),
      };
    }
  }
});

// Periodic flush every 60s
chrome.alarms.create("syncTelemetry", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "syncTelemetry" && activeTabSession) {
    const currentPlatform = activeTabSession.platform;
    await flushSession();
    activeTabSession = {
      platform: currentPlatform,
      startTime: Date.now(),
    };
  }
});
