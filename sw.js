// Service Worker para Male 360 — Offline Shell, Assets Compartidos y Notificaciones
const CACHE_SHELL = 'male-360-shell-v2';
const CACHE_ASSETS = 'male-360-assets-v2';

const CORE_SHELL_URLS = [
  '/',
  '/index.html',
  '/gym/',
  '/gym/index.html',
  '/nutri/',
  '/nutri/index.html',
  '/nutri/mama.html',
  '/shared/male-core.js',
  '/shared/male-tokens.css',
  '/manifest.json',
  '/gym/manifest.json',
  '/nutri/manifest.json',
  '/icon.png',
  '/gym/icon.png',
  '/nutri/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then((cache) => Promise.allSettled(CORE_SHELL_URLS.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([CACHE_SHELL, CACHE_ASSETS]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isLiveApiRequest(url) {
  const host = url.hostname;
  if (host.endsWith('firebaseio.com')) return true;
  if (host === 'generativelanguage.googleapis.com') return true;
  if (host.includes('firebaseinstallations') || host.includes('identitytoolkit')) return true;
  return false;
}

function isStaticCdnAsset(url) {
  return url.hostname === 'www.gstatic.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';
}

function resolveShellFallback(request) {
  return caches.match(request).then((hit) => {
    if (hit) return hit;
    const url = new URL(request.url);
    if (url.pathname === '/gym' || url.pathname === '/gym/') return caches.match('/gym/index.html');
    if (url.pathname === '/nutri' || url.pathname === '/nutri/') return caches.match('/nutri/index.html');
    if (url.pathname === '/' || url.pathname === '') return caches.match('/index.html');
    return caches.match('/index.html');
  });
}

async function networkFirstWithCache(request) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 4500) : null;
  try {
    const fetchOpts = ctrl ? { signal: ctrl.signal } : {};
    const networkRes = await fetch(request, fetchOpts);
    if (timer) clearTimeout(timer);
    if (networkRes && networkRes.ok) {
      const cache = await caches.open(CACHE_SHELL);
      cache.put(request, networkRes.clone()).catch(() => {});
    }
    return networkRes;
  } catch (err) {
    if (timer) clearTimeout(timer);
    const cached = await resolveShellFallback(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_ASSETS);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((networkRes) => {
      if (networkRes && (networkRes.ok || networkRes.type === 'opaque')) {
        cache.put(request, networkRes.clone()).catch(() => {});
      }
      return networkRes;
    })
    .catch(() => null);
  return cached || (await fetchPromise);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (isLiveApiRequest(url)) return;

  const isSameOrigin = url.origin === self.location.origin;
  const isNavOrHtmlOrCore = req.mode === 'navigate' ||
    (isSameOrigin && (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '/gym/' || url.pathname === '/nutri/' || url.pathname === '/shared/male-core.js'));

  if (isNavOrHtmlOrCore) {
    event.respondWith(networkFirstWithCache(req));
    return;
  }

  if (isSameOrigin || isStaticCdnAsset(url)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

// Manejo de clics en la notificación de Android
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la app ya está abierta en segundo plano, traerla al frente
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Si está cerrada, abrir la app directamente
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
