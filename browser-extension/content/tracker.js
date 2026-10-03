/**
 * Smart Developer Productivity — Content Presence Tracker
 * 
 * PRIVACY NOTICE:
 * This script DOES NOT read passwords, keystrokes, form inputs, cookies,
 * private messages, or page DOM contents.
 * 
 * It solely detects user presence/interaction (throttled pointer/scroll events)
 * to prevent idle false positives while keeping full privacy intact.
 */

(() => {
  let lastHeartbeat = 0;
  const THROTTLE_MS = 10000; // Send heartbeat at most once every 10 seconds

  function reportUserPresence() {
    const now = Date.now();
    if (now - lastHeartbeat < THROTTLE_MS) return;
    lastHeartbeat = now;

    try {
      if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          type: "USER_PRESENCE_HEARTBEAT",
          timestamp: now,
          url: window.location.hostname,
        });
      }
    } catch {
      // Ignore disconnected port errors if extension was reloaded
    }
  }

  // Listen to minimal interaction signals
  window.addEventListener("mousemove", reportUserPresence, { passive: true });
  window.addEventListener("keydown", reportUserPresence, { passive: true });
  window.addEventListener("scroll", reportUserPresence, { passive: true });
  window.addEventListener("click", reportUserPresence, { passive: true });

  // Initial presence on load
  reportUserPresence();
})();
