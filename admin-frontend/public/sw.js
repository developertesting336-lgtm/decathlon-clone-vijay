/* eslint-disable no-restricted-globals */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: "Decathlon Admin Alert",
        body: event.data.text(),
      };
    }
  }

  const title = data.title || "Decathlon Admin Alert";
  const options = {
    body: data.body || "",
    icon: "/favicon.ico",
    badge: "/favicon-32x32.png",
    data: {
      url: data.url || "/dashboard",
      type: data.type || "GENERAL",
      orderId: data.orderId || null,
      notificationId: data.notificationId || null,
      timestamp: Date.now(),
    },
    tag: data.notificationId || `admin_notif_${data.type || "gen"}_${Date.now()}`,
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
