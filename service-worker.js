self.addEventListener("install", (e) => {
  console.log("🛠️ Service Worker Installed");
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  console.log("✅ Service Worker Activated");
});

self.addEventListener("fetch", (e) => {
  // Optional: Intercept requests for offline caching
});
self.addEventListener('install', (e) => {
  console.log('✅ Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('✅ Service Worker activated');
});

self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
