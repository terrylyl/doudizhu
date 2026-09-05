/* 单人斗地主 - Service Worker
   作用域：本文件所在目录（GitHub Pages 项目站点即 /<仓库名>/），
   因此全部路径必须是相对路径，不能以 "/" 开头。

   改动页面后把 VERSION 加 1，用户下次打开即可拿到新版本。 */
const VERSION = 'v1';
const CACHE = `doudizhu-${VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/doudizhu-192.png',
  './icons/doudizhu-512.png',
  './icons/doudizhu-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* 逐个 add，避免某一项 404 让整个 addAll 失败 */
    await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  /* 页面导航：优先用缓存秒开，后台顺带更新；断网时回落到缓存 */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await network) || cache.match('./index.html');
    })());
    return;
  }

  /* 其余静态资源：cache-first */
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
