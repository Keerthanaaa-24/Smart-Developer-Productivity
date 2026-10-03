# 🛡️ Smart Developer Productivity — Browser Extension

Privacy-First, Consent-First browser activity companion for the **Smart Developer Productivity** platform.

---

## 🌟 Overview

The **Smart Developer Productivity Browser Extension** is designed to automatically record verified active time spent across supported developer, learning, and career platforms. It directly integrates with the **Phase 5 Unified Activity Engine**, **Phase 2 Home Dashboard**, **Analytics**, and the **AI Productivity Coach**.

### **Core Principles**
1. **Disabled by Default**: Tracking requires explicit user consent before any telemetry is recorded.
2. **Strict Domain Whitelist**: Only runs on 8 pre-configured platforms. Never inspects arbitrary websites.
3. **No Spyware / No Scraping**: Does **NOT** collect passwords, cookies, auth tokens, form inputs, keystrokes, private messages, screenshots, or page DOM contents.
4. **Offline Resilient**: Local queue buffers activity segments when offline or if the backend is temporarily unreachable.

---

## 📋 Supported Platforms & Mapping

| Platform | Domain | Category | Normalized Activity Type |
| :--- | :--- | :--- | :--- |
| **GitHub** | `github.com` | `coding` | `Active development on GitHub` |
| **LeetCode** | `leetcode.com` | `problem_solving` | `Problem solving on LeetCode` |
| **Coursera** | `coursera.org` | `learning` | `Learning session on Coursera` |
| **NPTEL** | `nptel.ac.in` | `learning` | `Course session on NPTEL` |
| **GeeksforGeeks** | `geeksforgeeks.org` | `problem_solving` | `Technical practice on GeeksforGeeks` |
| **freeCodeCamp** | `freecodecamp.org` | `learning` | `Coding practice on freeCodeCamp` |
| **LinkedIn** | `linkedin.com` | `career` | `Platform visit on LinkedIn` |
| **Naukri** | `naukri.com` | `career` | `Platform visit on Naukri` |

> [!NOTE]
> For career platforms like LinkedIn and Naukri, the extension **only** records active time spent on the platform. It **never** scrapes job postings, recruiter messages, or private profile information. Specific applications and interview milestones remain tracked via the Phase 7 Manual Career Activity Logger.

---

## 🔒 Permissions & Security Explanation

- **`storage`**: Used exclusively to store user consent status (`sdp_tracking_enabled`), offline activity queue (`sdp_offline_queue`), and JWT authentication token.
- **`idle`**: Detects when the user is inactive for > 60 seconds to automatically pause session tracking and prevent false positive counts.
- **`tabs`**: Detects URL changes and active tab switching between whitelisted platforms.
- **`alarms`**: Triggers a periodic background synchronization (every 1 minute) to safely flush queued records to the backend.

---

## 🚀 Installation Guide (Developer Mode)

1. Open Google Chrome, Brave, Microsoft Edge, or any Chromium-based browser.
2. Navigate to `chrome://extensions/` (or `edge://extensions/`).
3. Enable **Developer mode** toggle (usually in the top right corner).
4. Click **Load unpacked**.
5. Select the `browser-extension` folder in this repository:
   ```text
   Smart-Developer-Productivity/browser-extension
   ```
6. The extension icon **⚡ Smart Developer Productivity** will appear in your browser toolbar.
7. Click the extension icon, sign in with your credentials, and click **Enable Activity Tracking**.

---

## ⚙️ How It Works

```text
User Visits Supported Domain (e.g. github.com)
            ↓
User Consent Verified (Tracking ON)
            ↓
Active Tab Timer Runs
            ↓
Idle Detection (>60s inactivity pauses timer)
            ↓
Tab Switch / Navigation Commits Session Segment (≥5s duration)
            ↓
Local Offline Queue Buffer (chrome.storage.local)
            ↓
Authenticated POST /activity/extension-sync
            ↓
Unified Activity Engine (Deduplication via external_id)
            ↓
Dashboard 2.0 / Analytics / AI Coach
```

---

## 🛠️ Troubleshooting

- **Extension shows "Offline / Login Required"**: Open popup, enter your username/email and password, and click **Connect Extension**.
- **Activity not appearing on Dashboard**: Ensure tracking is toggled **ON** in the popup and that `Activity Tracking` is enabled in your **Settings → Privacy Settings**.
- **Server URL**: Default API server is configured to `http://127.0.0.1:8001`. Ensure the backend server is running.
