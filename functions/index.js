// ════════════════════════════════════════════════════════════════
//  functions/index.js — Firebase Cloud Functions v2
//  Dispara notificación push FCM cuando se crea una reserva.
//
//  Cubre dos colecciones:
//    1. /citas/{citaId}                          ← reservas creadas desde admin
//    2. /tenants/{tenantId}/bookings/{bookingId}  ← reservas del flujo público web
//
//  DEPLOY:
//    firebase deploy --only functions
// ════════════════════════════════════════════════════════════════

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions }  = require('firebase-functions/v2');
const { logger }            = require('firebase-functions');
const admin                 = require('firebase-admin');

admin.initializeApp();
const db        = admin.firestore();
const messaging = admin.messaging();

// Región: us-central1 es el default de FCM; cambia a southamerica-east1 si prefieres Brasil
setGlobalOptions({ region: 'us-central1' });

// ─────────────────────────────────────────────────────────────────
//  HELPER: obtener todos los tokens FCM activos
// ─────────────────────────────────────────────────────────────────
async function getTokensActivos() {
  const snap = await db.collection('fcm_tokens')
    .where('activo', '==', true)
    .get();
  return snap.docs.map(d => d.data().token).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────
//  HELPER: enviar push a todos los dispositivos registrados
// ─────────────────────────────────────────────────────────────────
async function enviarPush({ title, body, citaId, fecha, hora }) {
  const tokens = await getTokensActivos();

  if (!tokens.length) {
    logger.warn('[FCM] No hay tokens registrados. Omitiendo envío.');
    return null;
  }

  const message = {
    notification: { title, body },
    data: {
      citaId:  citaId || '',
      url:     '/gestion-interna/',
      fecha:   fecha  || '',
      hora:    hora   || '',
    },
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        title,
        body,
        icon:     '/icons/icon-192.png',
        badge:    '/icons/icon-192.png',
        vibrate:  [200, 100, 200],
        tag:      'nueva-cita',
        renotify: true,
        actions:  [{ action: 'abrir', title: 'Ver cita' }],
        data:     { url: '/gestion-interna/', citaId: citaId || '' }
      },
      fcmOptions: { link: '/gestion-interna/' }
    },
    tokens,
  };

  const response = await messaging.sendEachForMulticast(message);
  logger.info(`[FCM] Enviado: ${response.successCount} OK, ${response.failureCount} errores`);

  // Limpiar tokens inválidos
  const invalidos = [];
  response.responses.forEach((res, idx) => {
    if (!res.success) {
      const code = res.error?.code;
      logger.warn(`[FCM] Token ${idx} falló: ${code}`);
      if (
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/registration-token-not-registered'
      ) invalidos.push(tokens[idx]);
    }
  });

  if (invalidos.length) {
    const batch = db.batch();
    invalidos.forEach(t => batch.update(db.collection('fcm_tokens').doc(t), { activo: false }));
    await batch.commit();
    logger.info(`[FCM] ${invalidos.length} tokens marcados inactivos`);
  }
}

// ─────────────────────────────────────────────────────────────────
//  TRIGGER 1: reservas desde el admin (/citas/{citaId})
// ─────────────────────────────────────────────────────────────────
exports.notificarCitaAdmin = onDocumentCreated('citas/{citaId}', async (event) => {
  const cita   = event.data?.data();
  if (!cita) return null;

  const citaId  = event.params.citaId;
  const cliente = cita.clienteNombre || cita.nombre || 'Cliente';
  const servicio = cita.servicioNombre || cita.servicio || 'Servicio';
  const hora    = cita.hora  || '';
  const fecha   = cita.fecha || '';
  const barbero = cita.barbero || cita.barberoNombre || '';

  const title = `Nueva cita — ${hora} ${fecha}`.trim();
  const body  = barbero
    ? `${cliente} · ${servicio} · con ${barbero}`
    : `${cliente} · ${servicio}`;

  logger.info('[FCM] Cita admin creada:', { citaId, cliente, servicio, hora, fecha });

  try {
    await enviarPush({ title, body, citaId, fecha, hora });
  } catch (err) {
    logger.error('[FCM] Error al enviar (admin):', err);
  }
  return null;
});

// ─────────────────────────────────────────────────────────────────
//  TRIGGER 2: reservas del flujo público web
//  /tenants/{tenantId}/bookings/{bookingId}
// ─────────────────────────────────────────────────────────────────
exports.notificarReservaPublica = onDocumentCreated(
  'tenants/{tenantId}/bookings/{bookingId}',
  async (event) => {
    const booking = event.data?.data();
    if (!booking) return null;

    const bookingId = event.params.bookingId;
    const cliente   = booking.customerData?.name  || 'Cliente';
    const servicio  = booking.serviceNameSnapshot  || 'Servicio';
    const hora      = booking.startTime            || '';
    const fecha     = booking.date                 || '';
    const barbero   = booking.professionalNameSnapshot || '';

    const title = `Nueva reserva — ${hora} ${fecha}`.trim();
    const body  = barbero
      ? `${cliente} · ${servicio} · con ${barbero}`
      : `${cliente} · ${servicio}`;

    logger.info('[FCM] Reserva pública creada:', { bookingId, cliente, servicio, hora, fecha });

    try {
      await enviarPush({ title, body, citaId: bookingId, fecha, hora });
    } catch (err) {
      logger.error('[FCM] Error al enviar (público):', err);
    }
    return null;
  }
);
