/**
 * Smart Developer Productivity — Privacy-First Presence Heartbeat
 * 
 * STRICT PRIVACY GUARANTEE:
 * - NO keystrokes, form inputs, text values, or passwords captured.
 * - NO page DOM, cookies, or personal messages read or transmitted.
 * - Only signals presence (passive activity event) to ensure active-time accuracy.
 */

let lastHeartbeatSent = 0;
const HEARTBEAT_THROTTLE_MS = 20000; // Throttle to at most once per 20 seconds

function sendPresenceHeartbeat() {
  const now = Date.now();
  if (now - lastHeartbeatSent > HEARTBEAT_THROTTLE_MS) {
    lastHeartbeatSent = now;
    try {
      if (chrome?.runtime?.id) {
        chrome.runtime.sendMessage({ type: "USER_PRESENCE_HEARTBEAT" }, () => {
          // Ignore error if background worker is asleep
          if (chrome.runtime.lastError) {}
        });
      }
    } catch {
      // Ignore context invalidated
    }
  }
}

// Passive event listeners only - zero DOM data inspection
window.addEventListener("scroll", sendPresenceHeartbeat, { passive: true });
window.addEventListener("click", sendPresenceHeartbeat, { passive: true });
window.addEventListener("mousemove", sendPresenceHeartbeat, { passive: true });
window.addEventListener("keydown", sendPresenceHeartbeat, { passive: true });
