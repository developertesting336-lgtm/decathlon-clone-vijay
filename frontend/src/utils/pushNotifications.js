import api from "../api/axios";

/**
 * Convert VAPID base64 string to Uint8Array for PushManager subscription.
 */
export const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Check if Web Push is supported by the current browser.
 */
export const isPushSupported = () => {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
};

/**
 * Get current browser notification permission state.
 */
export const getPushPermission = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};

/**
 * Register Service Worker if not already registered.
 */
export const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (err) {
    console.error("Service worker registration error:", err);
    return null;
  }
};

/**
 * Request notification permission and subscribe to Web Push with backend VAPID key.
 */
export const subscribeToWebPush = async () => {
  if (!isPushSupported()) {
    console.warn("Web Push is not supported in this browser");
    return { success: false, reason: "unsupported" };
  }

  try {
    // 1. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, reason: "denied" };
    }

    // 2. Ensure Service Worker is registered and active
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register("/sw.js");
    }
    await navigator.serviceWorker.ready;

    // 3. Get VAPID public key from backend
    const vapidRes = await api.get("/notifications/vapid-public-key");
    const publicKey = vapidRes.data?.publicKey;
    if (!publicKey) {
      console.warn("VAPID public key missing from backend response");
      return { success: false, reason: "no_key" };
    }

    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // 4. Subscribe via PushManager
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // 5. Send subscription to backend
    const token = localStorage.getItem("token");
    if (token) {
      await api.post(
        "/notifications/subscribe",
        {
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    }

    return { success: true, subscription };
  } catch (error) {
    console.error("subscribeToWebPush Error:", error);
    return { success: false, error: error.message };
  }
};
