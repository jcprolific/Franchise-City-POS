/**
 * COFTEA POS PWA service worker — installability + owner sale Web Push.
 */
var SW_VERSION = '20260714181500';

self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  var url = event.request.url || '';
  if (url.indexOf('supabase.co') !== -1 || url.indexOf('supabase.in') !== -1) {
    return;
  }
  if (url.indexOf('127.0.0.1') !== -1 || url.indexOf('localhost') !== -1) {
    return;
  }
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', function (event) {
  var payload = {
    title: 'COFTEA POS',
    body: 'New sale',
    url: '/dashboard',
    tag: 'owner-sale',
  };
  if (event.data) {
    try {
      var parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        payload = Object.assign({}, payload, parsed);
      }
    } catch (_) {
      try {
        var t = event.data.text();
        if (t) payload.body = t;
      } catch (_) {}
    }
  }
  var opts = {
    body: payload.body || 'Tap to open',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: payload.url || '/dashboard' },
    tag: payload.tag || ('owner-sale-' + Date.now()),
  };
  event.waitUntil(
    self.registration.showNotification(payload.title || 'COFTEA POS', opts).catch(function (err) {
      console.warn('[sw] showNotification failed', err);
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/dashboard';
  var abs = new URL(url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i];
        if (c.url.indexOf(self.location.origin) === 0 && 'focus' in c) {
          if (typeof c.navigate === 'function') {
            return c.navigate(abs).then(function () {
              return c.focus();
            });
          }
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(abs);
    })
  );
});
