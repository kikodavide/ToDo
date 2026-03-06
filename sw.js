// ── PROMEMORIA SERVICE WORKER ──
// Gestisce notifiche in background anche con app chiusa

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Mappa dei timer attivi: id -> timeoutId
const activeTimers = {};

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE') {
    const { id, title, body, triggerMs } = e.data;
    const delay = triggerMs - Date.now();
    if (delay <= 0) return;

    // Cancella eventuale timer precedente con stesso id
    if (activeTimers[id]) {
      clearTimeout(activeTimers[id]);
      delete activeTimers[id];
    }

    activeTimers[id] = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: 'rem_' + id,
        data: { id },
        vibrate: [200, 100, 200],
        requireInteraction: false
      });
      delete activeTimers[id];
    }, delay);
  }

  if (e.data.type === 'CANCEL') {
    const id = e.data.id;
    // Cancella tutti i timer che iniziano con questo id
    Object.keys(activeTimers).forEach(key => {
      if (key === String(id) || key.startsWith(id + '_')) {
        clearTimeout(activeTimers[key]);
        delete activeTimers[key];
      }
    });
    // Chiudi notifiche già mostrate
    self.registration.getNotifications()
      .then(ns => ns.filter(n => n.tag && n.tag.startsWith('rem_' + id))
                    .forEach(n => n.close()));
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const focused = cs.find(c => c.visibilityState === 'visible');
      if (focused) return focused.focus();
      if (cs.length) return cs[0].focus();
      return clients.openWindow('./');
    })
  );
});
