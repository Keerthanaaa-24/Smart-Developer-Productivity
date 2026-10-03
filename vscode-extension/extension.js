const vscode = require("vscode");
const https = require("https");
const http = require("http");

let statusBarItem;
let isTrackingEnabled = true;
let activeSessionStart = null;
let lastInteractionTimestamp = Date.now();
let totalSecondsToday = 0;
let syncTimer = null;
let pendingBuffer = [];

function getConfiguration() {
  const config = vscode.workspace.getConfiguration("smartProductivity");
  return {
    apiBaseUrl: config.get("apiBaseUrl") || "http://127.0.0.1:8001",
    apiToken: config.get("apiToken") || "",
    enabled: config.get("enabled") !== false,
    idleThresholdSeconds: config.get("idleThresholdSeconds") || 120,
    syncIntervalSeconds: config.get("syncIntervalSeconds") || 60,
  };
}

function postTelemetry(events) {
  const { apiBaseUrl, apiToken } = getConfiguration();
  if (!apiToken || events.length === 0) return;

  const payload = JSON.stringify({ events });
  const isHttps = apiBaseUrl.startsWith("https");
  const client = isHttps ? https : http;

  try {
    const url = new URL(`${apiBaseUrl}/activity/extension-sync`);
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        Authorization: `Bearer ${apiToken}`,
      },
      timeout: 5000,
    };

    const req = client.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        pendingBuffer = [];
      } else {
        console.warn(`[Smart Productivity] Sync returned HTTP ${res.statusCode}`);
      }
    });

    req.on("error", (err) => {
      console.warn("[Smart Productivity] Telemetry network error:", err.message);
    });

    req.write(payload);
    req.end();
  } catch (err) {
    console.warn("[Smart Productivity] Request formatting error:", err.message);
  }
}

function flushPendingSession() {
  if (!activeSessionStart) return;

  const now = Date.now();
  const sessionDurationSecs = Math.round((now - activeSessionStart) / 1000);

  if (sessionDurationSecs >= 5) {
    const activeEditor = vscode.window.activeTextEditor;
    const languageId = activeEditor ? activeEditor.document.languageId : "plaintext";
    const workspaceName = vscode.workspace.name || "Default Project";

    const eventItem = {
      platform: "vscode",
      category: "coding",
      activity_type: "coding_session",
      title: `VS Code: Active coding in ${workspaceName}`,
      details: `Active coding session in ${workspaceName} (${languageId})`,
      started_at: new Date(activeSessionStart).toISOString(),
      ended_at: new Date(now).toISOString(),
      duration_seconds: sessionDurationSecs,
      source: "vscode_extension",
      extension_event_id: `vsc_${activeSessionStart}_${now}`,
    };

    totalSecondsToday += sessionDurationSecs;
    pendingBuffer.push(eventItem);
    postTelemetry(pendingBuffer);
  }

  activeSessionStart = null;
  updateStatusBar();
}

function recordActivity() {
  const { enabled, idleThresholdSeconds } = getConfiguration();
  if (!enabled || !isTrackingEnabled) return;

  const now = Date.now();
  const idleSecs = (now - lastInteractionTimestamp) / 1000;

  if (idleSecs > idleThresholdSeconds) {
    flushPendingSession();
    activeSessionStart = now;
  } else if (!activeSessionStart) {
    activeSessionStart = now;
  }

  lastInteractionTimestamp = now;
  updateStatusBar();
}

function updateStatusBar() {
  if (!statusBarItem) return;
  const mins = Math.floor(totalSecondsToday / 60);
  const statusIcon = isTrackingEnabled ? "$(pulse)" : "$(circle-slash)";
  statusBarItem.text = `${statusIcon} Smart Dev: ${mins}m coding`;
  statusBarItem.tooltip = isTrackingEnabled
    ? `Tracking active coding time. Click to toggle.`
    : `Tracking is currently paused. Click to resume.`;
}

function activate(context) {
  const config = getConfiguration();
  isTrackingEnabled = config.enabled;

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "smartProductivity.toggleTracking";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
  updateStatusBar();

  // Listeners for active user interaction without reading private contents
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => recordActivity()));
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(() => recordActivity()));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => recordActivity()));
  context.subscriptions.push(vscode.window.onDidChangeWindowState((e) => {
    if (!e.focused) {
      flushPendingSession();
    } else {
      recordActivity();
    }
  }));

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("smartProductivity.syncNow", () => {
      flushPendingSession();
      vscode.window.showInformationMessage("Smart Productivity: Telemetry synced successfully!");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("smartProductivity.toggleTracking", () => {
      isTrackingEnabled = !isTrackingEnabled;
      if (!isTrackingEnabled) {
        flushPendingSession();
      }
      updateStatusBar();
      vscode.window.showInformationMessage(
        `Smart Productivity: Tracking ${isTrackingEnabled ? "Resumed" : "Paused"}`
      );
    })
  );

  // Periodic flush
  syncTimer = setInterval(() => {
    const now = Date.now();
    const idleSecs = (now - lastInteractionTimestamp) / 1000;
    if (activeSessionStart && idleSecs <= config.idleThresholdSeconds) {
      flushPendingSession();
      activeSessionStart = Date.now();
    }
  }, config.syncIntervalSeconds * 1000);

  console.log("[Smart Developer Productivity] VS Code telemetry extension activated.");
}

function deactivate() {
  flushPendingSession();
  if (syncTimer) clearInterval(syncTimer);
}

module.exports = {
  activate,
  deactivate,
};
