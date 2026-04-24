// ════════════════════════════════════════════════════════════════
//  sw.js — Service Worker de Barbería Ferraza
//  Cubre: cache offline + Firebase Cloud Messaging (push)
// ════════════════════════════════════════════════════════════════

// ── 1. IMPORTAR FIREBASE PARA MENSAJERÍA EN BACKGROUND ──────────
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── 2. CONFIGURACIÓN FIREBASE (igual que firebase-config.js) ─────
firebase.initializeApp({
  apiKey:            "AIzaSyAJ-ACAJlo3_Jk8mP0T3SJ2WpLEmzbQj0g",
  authDomain:        "barberiaferraza-edc26.firebaseapp.com",
  projectId:         "barberiaferraza-edc26",
  storageBucket:     "barberiaferraza-edc26.firebasestorage.app",
  messagingSenderId: "460382362540",
  appId:             "1:460382362540:web:4a62e471d6b5c895c93809"
});

const messaging = firebase.messaging();

// ── 3. CACHE ─────────────────────────────────────────────────────
const CACHE_VERSION = 'ferraza-v5';
const STATIC_ASSETS = [
  '/gestion-interna.html',
  '/output.css',
  '/firebase-config.js',
  '/firebaseUtils.js',
  '/config.js',
  '/db.js',
  '/manifest-admin.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first para HTML; cache-first para el resto
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // No interceptar peticiones de Firebase / APIs externas
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('fonts') ||
    url.hostname.includes('unpkg') ||
    url.hostname.includes('vercel') ||
    url.protocol === 'chrome-extension:'
  ) return;

  const isHTML = event.request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    // Network-first: siempre intenta la red para HTML
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first: CSS, JS, imágenes locales
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
          return res;
        });
      })
    );
  }
});

// ── 4. PUSH EN BACKGROUND (Firebase Messaging) ───────────────────
// Se dispara cuando llega un mensaje FCM y la pestaña NO está activa/visible
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Mensaje en background recibido:', payload);

  const notifTitle = payload.notification?.title
    || payload.data?.title
    || 'Nueva reserva';

  const notifOptions = {
    body:    payload.notification?.body  || payload.data?.body  || 'Tienes una nueva cita agendada.',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag:     'nueva-cita',          // colapsa notificaciones duplicadas
    renotify: true,
    data: {
      url: payload.data?.url || '/gestion-interna.html',
      citaId: payload.data?.citaId || null
    },
    actions: [
      { action: 'abrir', title: 'Ver cita' }
    ]
  };

  return self.registration.showNotification(notifTitle, notifOptions);
});

// ── 5. CLIC EN LA NOTIFICACIÓN ───────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/gestion-interna.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Si ya hay una pestaña de gestion-interna abierta → enfocarla
      for (const client of clientList) {
        if (client.url.includes('gestion-interna') && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no → abrir nueva pestaña
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── 6. PUSH MANUAL (fallback si el payload no viene del SDK) ─────
// Captura pushes raw que no pasan por onBackgroundMessage
self.addEventListener('push', event => {
  // Si Firebase Messaging ya lo manejaría, salir
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch (_) { data = { title: event.data.text() }; }

  // Si ya tiene estructura de FCM (manejada por onBackgroundMessage), no duplicar
  if (data.notification || data.data?.handled_by_fcm) return;

  const title = data.title || 'Barbería Ferraza';
  const options = {
    body:  data.body  || 'Nueva notificación',
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data:  { url: data.url || '/gestion-interna.html' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
