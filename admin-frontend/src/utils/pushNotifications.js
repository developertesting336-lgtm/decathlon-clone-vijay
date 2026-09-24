/**
 * Convert base64 VAPID public key to Uint8Array for PushManager subscribe
 */
export const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Check if the browser supports Web Push & Service Workers
 */
export const isPushSupported = () => {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

/**
 * Get current browser notification permission status
 */
export const getNotificationPermission = () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission; // 'default' | 'granted' | 'denied'
};

/**
 * Subscribe user to Web Push Notifications
 */
export const subscribeToPushNotifications = async (apiClient) => {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported by your browser");
  }

  // 1. Request permission if not already granted
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    return {
      success: false,
      permission,
      message:
        permission === "denied"
          ? "Notification permission was denied. You can enable it in browser site settings."
          : "Notification permission was dismissed.",
    };
  }

  // 2. Register Service Worker
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  // 3. Fetch VAPID Public Key from backend or fallback to environment
  let vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  try {
    const vapidRes = await apiClient.get("/notifications/vapid-public-key");
    if (vapidRes.data?.publicKey) {
      vapidPublicKey = vapidRes.data.publicKey;
    }
  } catch (keyErr) {
    console.warn("Could not fetch VAPID key dynamically, falling back to configured key:", keyErr.message);
  }

  if (!vapidPublicKey) {
    vapidPublicKey = "BGiiZyPdJO5Z-I0hm24HoO3dlrlJ-CXMSWOmq91Mi3mJ4HQPfr4AKT2QnMXoXc04P-_Mf53mrgYUKvjKor03OQQ";
  }

  // 4. Check for existing subscription or create new
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });
  }

  // 5. Send subscription to backend
  await apiClient.post("/notifications/subscribe", {
    subscription: subscription.toJSON(),
    userAgent: navigator.userAgent,
  });

  return {
    success: true,
    permission: "granted",
    subscription,
  };
};

/**
 * Unsubscribe user from Web Push Notifications
 */
export const unsubscribeFromPushNotifications = async (apiClient) => {
  if (!isPushSupported()) return { success: true };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe on backend first
      try {
        await apiClient.delete("/notifications/unsubscribe", {
          data: { endpoint: subscription.endpoint },
        });
      } catch (err) {
        console.warn("Backend unsubscribe error:", err.message);
      }

      // Unsubscribe locally
      await subscription.unsubscribe();
    }

    return { success: true };
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return { success: false, message: error.message };
  }
};
