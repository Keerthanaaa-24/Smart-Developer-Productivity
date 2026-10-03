/**
 * Smart Developer Productivity — Storage Helper
 * Provides a clean Promise-based API for chrome.storage.local
 * Enforces Consent-First, Offline Queueing, and Local Telemetry Caching
 */

const STORAGE_KEYS = {
  TRACKING_ENABLED: "sdp_tracking_enabled",
  AUTH_TOKEN: "sdp_auth_token",
  USER_INFO: "sdp_user_info",
  OFFLINE_QUEUE: "sdp_offline_queue",
  TODAY_STATS: "sdp_today_stats",
  ACTIVE_SESSION: "sdp_active_session",
  API_URL: "sdp_api_url",
  LAST_SYNC: "sdp_last_sync",
};

const DEFAULT_API_URL = "http://127.0.0.1:8001";

export const StorageService = {
  /**
   * Consent Status: DISABLED by default.
   */
  async isTrackingEnabled() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.TRACKING_ENABLED], (res) => {
        resolve(res[STORAGE_KEYS.TRACKING_ENABLED] === true);
      });
    });
  },

  async setTrackingEnabled(enabled) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.TRACKING_ENABLED]: Boolean(enabled) }, () => {
        resolve(Boolean(enabled));
      });
    });
  },

  /**
   * Authentication Storage
   */
  async getAuthToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.AUTH_TOKEN], (res) => {
        resolve(res[STORAGE_KEYS.AUTH_TOKEN] || null);
      });
    });
  },

  async setAuth(token, userInfo = {}) {
    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          [STORAGE_KEYS.AUTH_TOKEN]: token,
          [STORAGE_KEYS.USER_INFO]: userInfo,
        },
        () => resolve(true)
      );
    });
  },

  async getUserInfo() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.USER_INFO], (res) => {
        resolve(res[STORAGE_KEYS.USER_INFO] || null);
      });
    });
  },

  async clearAuth() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER_INFO], () => {
        resolve(true);
      });
    });
  },

  /**
   * API Base URL configuration
   */
  async getApiUrl() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.API_URL], (res) => {
        resolve(res[STORAGE_KEYS.API_URL] || DEFAULT_API_URL);
      });
    });
  },

  async setApiUrl(url) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.API_URL]: url || DEFAULT_API_URL }, () => {
        resolve(true);
      });
    });
  },

  /**
   * Offline Local Activity Queue
   */
  async getQueue() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.OFFLINE_QUEUE], (res) => {
        resolve(res[STORAGE_KEYS.OFFLINE_QUEUE] || []);
      });
    });
  },

  async enqueueActivity(activity) {
    const queue = await this.getQueue();
    // Prevent duplicate event IDs in local queue
    const exists = queue.some(
      (item) => item.extension_event_id === activity.extension_event_id
    );
    if (!exists) {
      queue.push(activity);
      return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEYS.OFFLINE_QUEUE]: queue }, () => {
          resolve(queue);
        });
      });
    }
    return queue;
  },

  async removeQueuedItems(eventIds = []) {
    const queue = await this.getQueue();
    const idSet = new Set(eventIds);
    const updated = queue.filter((item) => !idSet.has(item.extension_event_id));
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.OFFLINE_QUEUE]: updated }, () => {
        resolve(updated);
      });
    });
  },

  async clearQueue() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.OFFLINE_QUEUE]: [] }, () => {
        resolve(true);
      });
    });
  },

  /**
   * Active Session Tracking (Current tab & start timestamp)
   */
  async getActiveSession() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.ACTIVE_SESSION], (res) => {
        resolve(res[STORAGE_KEYS.ACTIVE_SESSION] || null);
      });
    });
  },

  async setActiveSession(session) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_SESSION]: session }, () => {
        resolve(session);
      });
    });
  },

  async clearActiveSession() {
    return new Promise((resolve) => {
      chrome.storage.local.remove([STORAGE_KEYS.ACTIVE_SESSION], () => {
        resolve(true);
      });
    });
  },

  /**
   * Today's Local Stats Cache for instant Popup Display
   */
  async getTodayStats() {
    const todayStr = new Date().toISOString().slice(0, 10);
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.TODAY_STATS], (res) => {
        const stats = res[STORAGE_KEYS.TODAY_STATS] || {};
        if (stats.date !== todayStr) {
          // New day reset
          const fresh = { date: todayStr, platforms: {} };
          chrome.storage.local.set({ [STORAGE_KEYS.TODAY_STATS]: fresh });
          resolve(fresh);
        } else {
          resolve(stats);
        }
      });
    });
  },

  async addTodaySeconds(platform, seconds) {
    const stats = await this.getTodayStats();
    const platKey = platform.toLowerCase();
    stats.platforms[platKey] = (stats.platforms[platKey] || 0) + seconds;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.TODAY_STATS]: stats }, () => {
        resolve(stats);
      });
    });
  },

  /**
   * Last sync timestamp
   */
  async setLastSync(timestampStr) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.LAST_SYNC]: timestampStr }, () => {
        resolve(true);
      });
    });
  },

  async getLastSync() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.LAST_SYNC], (res) => {
        resolve(res[STORAGE_KEYS.LAST_SYNC] || null);
      });
    });
  },
};
