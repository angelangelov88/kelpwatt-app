// Kelpwatt's service worker: only shows push notifications. No caching and no
// fetch handler, so the app always loads from the network as before.

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Not ours; shown with the fallback title below.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "Kelpwatt", {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag || "kelpwatt",
      // A new one of the same kind replaces the old one, but still alerts.
      renotify: true,
      data: { url: payload.url || "/activity" },
    }),
  );
});

// Opens the page the notification is about, in a Kelpwatt window if one is
// already open. Only same-site paths are followed.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data && event.notification.data.url;
  const url = new URL(
    typeof path === "string" && path.startsWith("/") ? path : "/activity",
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find(
          (w) => new URL(w.url).origin === self.location.origin,
        );
        if (open) return open.focus().then((w) => w.navigate(url));
        return self.clients.openWindow(url);
      }),
  );
});
