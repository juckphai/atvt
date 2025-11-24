// service-worker.js
const staticCacheName = 'activity-tracker-static-v560';
const dynamicCacheName = 'activity-tracker-dynamic-v560';

// ไฟล์ที่ต้องการ cache (รวมไลบรารีภายนอกเพื่อให้ทำงาน Offline ได้)
const assets = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './script.js',
  './192.png',
  './512.png',
  './service-worker.js',
  // เพิ่มไลบรารีภายนอกที่จำเป็นสำหรับฟีเจอร์ Export
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Install event: ติดตั้งและ Cache ไฟล์
self.addEventListener('install', evt => {
  console.log('Service Worker: Installing');
  evt.waitUntil(
    caches.open(staticCacheName)
      .then(cache => {
        console.log('Caching shell assets');
        return cache.addAll(assets);
      })
      .catch(err => {
        console.error('Cache addAll error:', err);
      })
  );
  self.skipWaiting();
});

// Activate event: ลบ Cache เก่า
self.addEventListener('activate', evt => {
  console.log('Service Worker: Activated');
  evt.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== staticCacheName && key !== dynamicCacheName)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch event: จัดการการโหลดข้อมูล
self.addEventListener('fetch', evt => {
  // ตรวจสอบว่าเป็น request ที่รองรับหรือไม่ (เช่น http/https)
  if (evt.request.url.indexOf('http') !== 0) return;

  // ข้ามการ cache สำหรับ non-GET requests (เช่น POST, PUT)
  if (evt.request.method !== 'GET') {
    return fetch(evt.request);
  }

  evt.respondWith(
    caches.match(evt.request)
      .then(cacheRes => {
        // 1. ถ้ามีใน Cache ให้ใช้จาก Cache เลย (เร็วที่สุด)
        if (cacheRes) {
          return cacheRes;
        }
        
        // 2. ถ้าไม่มี ให้โหลดจาก Network
        return fetch(evt.request)
          .then(fetchRes => {
            // ตรวจสอบว่า response ถูกต้อง
            if (!fetchRes || fetchRes.status !== 200 || fetchRes.type !== 'basic' && fetchRes.type !== 'cors') {
              return fetchRes;
            }

            // 3. เก็บลง Dynamic Cache สำหรับการใช้งานครั้งหน้า
            return caches.open(dynamicCacheName)
              .then(cache => {
                cache.put(evt.request.url, fetchRes.clone());
                return fetchRes;
              });
          })
          .catch(() => {
            // 4. Fallback กรณี Offline และหาไฟล์ไม่ได้
            if (evt.request.destination === 'document') {
              return caches.match('./index.html');
            }
            if (evt.request.destination === 'image') {
              return caches.match('./192.png'); // หรือรูป placeholder อื่นๆ
            }
          });
      })
  );
});