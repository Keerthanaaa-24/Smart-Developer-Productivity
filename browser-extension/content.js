// Content script for user interaction detection (privacy-first: no DOM or keystrokes captured)
let lastActivity = Date.now();

function notifyActivity() {
  lastActivity = Date.now();
}

window.addEventListener("scroll", notifyActivity, { passive: true });
window.addEventListener("click", notifyActivity, { passive: true });
window.addEventListener("keydown", notifyActivity, { passive: true });
