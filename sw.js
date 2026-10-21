/* clickzauber Service Worker — hält die App startfähig und macht sie installierbar. */
const CACHE = 'cz-v36';
const KERN = [
  './',
  'index.html',
  'clickzauber-login.html',
  'clickzauber-app.html',
  'clickzauber-anmelden.html',
  'clickzauber-editor.html',
  'clickzauber-cockpit-live.html',
  'einbauen.html',
  'offline.html',
  'assets/cz-apple-180.png',
  'favicon.ico',
  'site.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(KERN).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // API niemals aus dem Zwischenspeicher — Anfragen müssen aktuell sein.
  if (url.pathname.startsWith('/api/') || url.hostname.includes('vercel.app')) return;
  // Schriften ändern sich nie: Zwischenspeicher zuerst. Zweiter Besuch braucht dafür kein Netz.
  if (url.hostname === 'fonts.bunny.net') {
    e.respondWith(caches.open(CACHE).then((c) => c.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { c.put(e.request, r.clone()).catch(() => {}); return r; }))));
    return;
  }
  if (url.origin !== location.origin) return;

  // Netz zuerst und am Browser-Zwischenspeicher vorbei: nach dem Hochladen läuft sofort der neue Stand.
  // Der eigene Zwischenspeicher dient nur, wenn gar kein Netz da ist.
  // Ohne Netz: die zuletzt geladene Fassung der Seite, sonst offline.html. Skripte bekommen nie eine Seite untergeschoben.
  const frisch = e.request.mode === 'navigate'
    ? new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' })
    : new Request(e.request, { cache: 'no-cache' });
  e.respondWith(
    fetch(frisch)
      .then((r) => {
        if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then((r) => r || (e.request.mode === 'navigate' ? caches.match('offline.html') : null))
        .then((r) => r || Response.error()))
  );
});

/* ── Push-Nachrichten ─────────────────────────────────────────────────
   Der Server schickt eine kleine JSON-Nachricht, der Browser weckt diese
   Datei dafür auf — auch wenn clickzauber geschlossen ist. Auf dem iPhone
   klappt das nur, wenn clickzauber auf dem Home-Bildschirm liegt; ein
   Safari-Lesezeichen genügt dort nicht.                                  */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { text: e.data ? e.data.text() : '' }; }
  const titel = d.titel || 'clickzauber';
  /* Zahl auf dem App-Symbol (seit 15.10.2026): offene Anfragen vom Server (lib/lead.js). Fehlt sie, nur ein Punkt.
     Geht nur auf dem Home-Bildschirm (iPhone ab iOS 16.4) und mit erlaubten Mitteilungen. Das Cockpit setzt sie beim Öffnen richtig. */
  const zahl = self.navigator && self.navigator.setAppBadge
    ? (Number.isFinite(+d.anzahl) && d.anzahl != null ? (+d.anzahl > 0 ? self.navigator.setAppBadge(+d.anzahl) : self.navigator.clearAppBadge()) : self.navigator.setAppBadge()).catch(() => {})
    : Promise.resolve();
  e.waitUntil(zahl.then(() => self.registration.showNotification(titel, {
    body: d.text || 'Eine neue Anfrage ist da.',
    icon: 'assets/cz-apple-180.png',
    badge: 'assets/cz-apple-180.png',
    tag: d.tag || 'cz-anfrage',
    renotify: true,
    data: { url: d.url || 'clickzauber-cockpit-live.html' }
  })));
});

/* Tipp auf die Nachricht: ein schon offenes Cockpit nach vorn holen und
   ihm sagen, welche Anfrage es sofort zeigen soll (mit Annehmen/Ablehnen).
   Ist keins offen, öffnet sich das Cockpit direkt mit dieser Anfrage. */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const ziel = (e.notification.data && e.notification.data.url) || 'clickzauber-cockpit-live.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenster) => {
      for (const f of fenster) {
        if (f.url.includes('clickzauber-cockpit-live') && 'focus' in f) {
          f.postMessage({ typ: 'cz-oeffnen', ziel });
          return f.focus();
        }
      }
      return self.clients.openWindow(ziel);
    })
  );
});
