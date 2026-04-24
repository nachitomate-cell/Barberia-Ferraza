// ════════════════════════════════════════════════════════════════
//  functions/index.js — Firebase Cloud Functions
//  Dispara notificación push FCM cada vez que se crea una /cita
//
//  SETUP:
//    1. firebase login && firebase use barberiaferraza-edc26
//    2. cd functions && npm install
//    3. firebase deploy --only functions
//
//  REQUISITOS:
//    - Plan Blaze (pago por uso) activado en Firebase Console
//    - SDK Admin: npm install firebase-admin firebase-functions
// ════════════════════════════════════════════════════════════════

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

admin.initializeApp();
const db        = admin.firestore();
const messaging = admin.messaging();

// ─────────────────────────────────────────────────────────────────
//  HELPER: obtener todos los tokens activos de /fcm_tokens
// ─────────────────────────────────────────────────────────────────
async function getTokensActivos() {
  const snap = await db.collection('fcm_tokens')
    .where('activo', '==', true)
    .get();
  return snap.docs.map(d => d.data().token).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────
//  CLOUD FUNCTION: enviarNotificacionNuevaCita
//  Trigger: onCreate en colección /citas
// ─────────────────────────────────────────────────────────────────
exports.enviarNotificacionNuevaCita = functions
  .region('us-central1')           // Cambia a 'southamerica-east1' si prefieres Brasil
  .firestore
  .document('citas/{citaId}')
  .onCreate(async (snap, context) => {
    const cita    = snap.data();
    const citaId  = context.params.citaId;

    // Extraer datos relevantes de la cita
    const cliente  = cita.clienteNombre || cita.nombre || 'Cliente';
    const servicio = cita.servicioNombre || cita.servicio || 'Servicio';
    const hora     = cita.hora  || '';
    const fecha    = cita.fecha || '';
    const barbero  = cita.barberoNombre || cita.barbero || '';

    // Construir textos de la notificación
    const title = `Nueva cita — ${hora} ${fecha}`.trim();
    const body  = barbero
      ? `${cliente} · ${servicio} · con ${barbero}`
      : `${cliente} · ${servicio}`;

    functions.logger.info('[FCM] Nueva cita creada:', { citaId, cliente, servicio, hora, fecha });

    // Obtener tokens de dispositivos administradores
    const tokens = await getTokensActivos();

    if (!tokens.length) {
      functions.logger.warn('[FCM] No hay tokens registrados. Omitiendo envío.');
      return null;
    }

    // Enviar mensaje multicast a todos los dispositivos
    const message = {
      notification: { title, body },
      data: {
        citaId,
        url:   '/gestion-interna.html',
        fecha,
        hora
      },
      // Configuración Android
      android: {
        priority: 'high',
        notification: {
          icon:  'ic_notification',   // nombre del recurso en drawable (app nativa)
          color: '#000000',
          channelId: 'nuevas_citas'
        }
      },
      // Configuración Web Push
      webpush: {
        headers:      { Urgency: 'high' },
        notification: {
          title,
          body,
          icon:  '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [200, 100, 200],
          tag:    'nueva-cita',
          renotify: true,
          actions: [{ action: 'abrir', title: 'Ver cita' }],
          data:   { url: '/gestion-interna.html', citaId }
        },
        fcmOptions: { link: '/gestion-interna.html' }
      },
      tokens
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      functions.logger.info(`[FCM] Enviado: ${response.successCount} OK, ${response.failureCount} errores`);

      // Limpiar tokens inválidos automáticamente
      const tokensAEliminar = [];
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            tokensAEliminar.push(tokens[idx]);
          }
          functions.logger.warn(`[FCM] Token ${idx} falló:`, code);
        }
      });

      if (tokensAEliminar.length) {
        const batch = db.batch();
        tokensAEliminar.forEach(token => {
          batch.update(db.collection('fcm_tokens').doc(token), { activo: false });
        });
        await batch.commit();
        functions.logger.info(`[FCM] ${tokensAEliminar.length} tokens marcados como inactivos`);
      }
    } catch (err) {
      functions.logger.error('[FCM] Error al enviar:', err);
    }

    return null;
  });
