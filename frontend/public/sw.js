/* eslint-disable no-restricted-globals */
/**
 * Decathlon Clone Service Worker
 * Handles Web Push notifications and notification clicks.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const title = data.title || "Decathlon Alert";
    const options = {
      body: data.body || "A product you are tracking has an update!",
      icon: data.icon || "/favicon.svg",
      badge: data.badge || "/favicon-32x32.png",
      vibrate: [150, 80, 150],
      data: data.data || {},
      actions: data.actions || [
        { action: "explore", title: "View Product" },
        { action: "close", title: "Dismiss" },
      ],
      tag: data.data?.productId ? `price-drop-${data.data.productId}` : "decathlon-alert",
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error displaying push notification:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  if (event.action === "close") {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
