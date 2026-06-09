/**
 * Proof of Grass — Push Notification Architecture
 * Phase 8: Prepared but NOT active yet.
 *
 * When ready to implement, choose one provider:
 *   Option A: Web Push (native, no third party)
 *   Option B: Firebase Cloud Messaging (FCM)
 *   Option C: OneSignal (easiest SDK)
 *
 * Reminder types planned:
 *   - DAILY_REMINDER      "Time to touch grass 🌿"
 *   - STREAK_AT_RISK      "Your X-day streak is at risk!"
 *   - MILESTONE_NEAR      "You're 2 days from Day 30!"
 *   - WEEKLY_MISSION      "New weekly mission available"
 *   - SHIELD_WARNING      "You only have 1 shield left"
 *   - CHALLENGE_UPDATE    "@user logged their proof today"
 */

// ── Permission request (call when user opts in) ───────────────────────────────
export async function requestNotificationPermission() {
    // TODO: Implement when push is ready
    if (!("Notification" in window)) {
      console.warn("[Notifications] Not supported in this browser");
      return "unsupported";
    }
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
  
    const permission = await Notification.requestPermission();
    return permission;
  }
  
  // ── Subscribe to push (Web Push) ─────────────────────────────────────────────
  export async function subscribeToPush() {
    // TODO: Replace with your VAPID public key
    // const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    //
    // const registration = await navigator.serviceWorker.ready;
    // const subscription = await registration.pushManager.subscribe({
    //   userVisibleOnly: true,
    //   applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    // });
    //
    // await fetch("/api/push/subscribe", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ subscription, username }),
    // });
    console.log("[Notifications] subscribeToPush — not yet implemented");
  }
  
  // ── Notification types ────────────────────────────────────────────────────────
  export const NOTIFICATION_TYPES = {
    DAILY_REMINDER: "daily_reminder",
    STREAK_AT_RISK: "streak_at_risk",
    MILESTONE_NEAR: "milestone_near",
    WEEKLY_MISSION: "weekly_mission",
    SHIELD_WARNING:  "shield_warning",
    CHALLENGE_UPDATE: "challenge_update",
    WELCOME: "welcome",
  };
  
  // ── Send local notification (no server needed, for testing) ──────────────────
  export async function sendLocalNotification(type, data = {}) {
    if (Notification.permission !== "granted") return;
    const registration = await navigator.serviceWorker.ready;
  
    const templates = {
      [NOTIFICATION_TYPES.DAILY_REMINDER]: {
        title: "Time to touch grass 🌿",
        body: "Log today's proof to keep your streak alive.",
        url: "/",
      },
      [NOTIFICATION_TYPES.STREAK_AT_RISK]: {
        title: `⚠ Day ${data.streak} streak at risk`,
        body: "You haven't logged today. Don't break the chain!",
        url: "/",
      },
      [NOTIFICATION_TYPES.MILESTONE_NEAR]: {
        title: `Almost there! Day ${data.target} incoming`,
        body: `${data.daysLeft} more days to ${data.tierName}. Keep going.`,
        url: "/",
      },
      [NOTIFICATION_TYPES.CHALLENGE_UPDATE]: {
        title: `@${data.opponent} logged their proof`,
        body: `They're at ${data.opponentDays}/${data.total} days. You're at ${data.myDays}/${data.total}.`,
        url: `/challenge/${data.challengeSlug}`,
      },
      [NOTIFICATION_TYPES.SHIELD_WARNING]: {
        title: "⚠ Low shield count",
        body: `You only have ${data.shields} shield${data.shields === 1 ? "" : "s"} remaining.`,
        url: "/",
      },
    };
  
    const template = templates[type];
    if (!template) return;
  
    await registration.showNotification(template.title, {
      body: template.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: template.url },
      requireInteraction: false,
      silent: false,
    });
  }
  
  // ── Schedule preferences (stored locally for now) ────────────────────────────
  export function getNotificationPrefs() {
    try {
      return JSON.parse(localStorage.getItem("pog_notif_prefs") || "{}");
    } catch { return {}; }
  }
  
  export function setNotificationPrefs(prefs) {
    try {
      localStorage.setItem("pog_notif_prefs", JSON.stringify(prefs));
    } catch {}
  }
  
  // ── Helper: convert VAPID key for Web Push ───────────────────────────────────
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }