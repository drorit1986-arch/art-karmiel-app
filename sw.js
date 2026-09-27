// ארט כרמיאל – Service Worker: עובד גם בלי אינטרנט ונטען מהר
const V = 'ak-v4';
const SHELL = ['./', 'index.html', 'products.json', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // האפליקציה וקטלוג המוצרים: קודם מהרשת (כדי ללבל מחירים עדכניים), ואם אין רשת – מהמטמון
  e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(V).then(c => c.put(req, copy)); return res; })
    .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
