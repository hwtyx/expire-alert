// Service Worker - 过期预警 PWA 离线缓存
const CACHE_NAME = 'expire-alert-v1';
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json'
];

// 安装：预缓存核心文件
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', function(event) {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // 有缓存就返回缓存，同时后台更新
        fetch(event.request).then(function(resp) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, resp.clone());
          });
        }).catch(function() {});
        return cached;
      }
      // 无缓存，走网络
      return fetch(event.request).then(function(resp) {
        // 成功的请求缓存一份
        if (resp && resp.status === 200 && resp.type === 'basic') {
          var respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, respClone);
          });
        }
        return resp;
      }).catch(function() {
        // 网络也失败，返回离线首页
        return caches.match('./index.html');
      });
    })
  );
});
