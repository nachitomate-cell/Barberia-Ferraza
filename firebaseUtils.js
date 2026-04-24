// firebaseUtils.js — Capa de datos Firestore
// Requiere: config.js y firebase-config.js cargados antes.
// Reemplaza completamente la dependencia de localStorage para
// citas, servicios y configuración.

'use strict';

/* ════════════════════════════════════════════════════════════════
   FDB — API de Firestore (equivalente a firebaseUtils.js en React)
   ════════════════════════════════════════════════════════════════ */
const FDB = (() => {

  // Nombres canónicos de colecciones
  const COL = {
    CITAS:     'citas',
    SERVICIOS: 'servicios',
    CONFIG:    'configuracion',
    USERS:     'users',
    BLOQUEOS:  'bloqueos',
    PREMIOS:   'premios',
  };

  const configRef = () => db.collection(COL.CONFIG).doc('main');

  /* ──────────────────────────────────────────────────────────────
     MIGRACIÓN: localStorage → Firestore (se ejecuta solo 1 vez)
     Mueve datos existentes sin borrar nada de Firestore.
     ────────────────────────────────────────────────────────────── */
  async function migrarDesdeLocalStorage() {
    const FLAG = 'fs_migrated_v2';
    if (localStorage.getItem(FLAG)) return;

    console.info('[FDB] Migrando localStorage → Firestore…');

    // ── Servicios ────────────────────────────────────────────────
    const lsSrvs = JSON.parse(localStorage.getItem('barber_services') || '[]');
    if (lsSrvs.length) {
      const snap = await db.collection(COL.SERVICIOS).limit(1).get();
      if (snap.empty) {
        const batch = db.batch();
        lsSrvs.forEach((s, i) => {
          const ref = db.collection(COL.SERVICIOS).doc(String(s.id));
          batch.set(ref, {
            nombre:   s.nombre,
            precio:   Number(s.precio),
            duracion: Number(s.duracion),
            orden:    i,
            activo:   true,
          });
        });
        await batch.commit();
        console.info('[FDB] Servicios migrados:', lsSrvs.length);
      }
    }

    // ── Configuración ────────────────────────────────────────────
    const lsSet = JSON.parse(localStorage.getItem('barber_settings') || '{}');
    // Leer config antigua de Firestore si existe (barber_settings/main)
    let fsOldData = {};
    try {
      const oldSnap = await db.collection('barber_settings').doc('main').get();
      if (oldSnap.exists) fsOldData = oldSnap.data();
    } catch (_) { /* ignorar */ }

    const configInit = {
      horarioInicio:    fsOldData.horarioInicio    || lsSet.horarioInicio    || '09:00',
      horarioFin:       fsOldData.horarioFin       || lsSet.horarioFin       || '20:00',
      intervaloMinutos: fsOldData.intervaloMinutos || lsSet.intervaloMinutos || 30,
      diasLaborales:    fsOldData.diasLaborales    || lsSet.diasLaborales    || [1,2,3,4,5,6],
      telefonoAdmin:    fsOldData.telefonoAdmin    || lsSet.telefonoAdmin    || SHOP.telefono,
      diasBloqueados:   fsOldData.fechasBloqueadas || [],
      colacion:         fsOldData.colacion         || null,
      diasConfig:       fsOldData.diasConfig        || {},
    };
    await configRef().set(configInit, { merge: true });

    // ── Citas ────────────────────────────────────────────────────
    const lsCitas = JSON.parse(localStorage.getItem('barber_bookings') || '[]');
    if (lsCitas.length) {
      const snap = await db.collection(COL.CITAS).limit(1).get();
      if (snap.empty) {
        // Firestore permite 500 escrituras por batch
        const chunks = [];
        for (let i = 0; i < lsCitas.length; i += 400) chunks.push(lsCitas.slice(i, i + 400));
        for (const chunk of chunks) {
          const batch = db.batch();
          chunk.forEach(b => {
            const ref = db.collection(COL.CITAS).doc(String(b.id));
            batch.set(ref, {
              fecha:            b.fecha            || '',
              hora:             b.hora             || '',
              clienteNombre:    b.clienteNombre    || '',
              clienteTelefono:  b.clienteTelefono  || '',
              clienteEmail:     b.clienteEmail     || '',
              servicioNombre:   b.servicioNombre   || '',
              duracionServicio: Number(b.duracionServicio) || 30,
              barbero:          b.barbero          || '',
              estado:           b.estado           || 'Confirmado',
              nota:             b.nota             || '',
              creadoEn:         firebase.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
        }
        console.info('[FDB] Citas migradas:', lsCitas.length);
      }
    }

    localStorage.setItem(FLAG, '1');
    console.info('[FDB] Migración completada.');
  }

  /* ──────────────────────────────────────────────────────────────
     SERVICIOS
     ────────────────────────────────────────────────────────────── */
  async function getServicios() {
    const snap = await db.collection(COL.SERVICIOS).orderBy('orden').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function addServicio({ nombre, precio, duracion, categoria }) {
    // Calcular el siguiente orden
    const snap = await db.collection(COL.SERVICIOS).orderBy('orden', 'desc').limit(1).get();
    const nextOrden = snap.empty ? 0 : (snap.docs[0].data().orden || 0) + 1;
    const ref = await db.collection(COL.SERVICIOS).add({
      nombre,
      precio:   Number(precio),
      duracion: Number(duracion),
      categoria: categoria || 'Otro',
      orden:    nextOrden,
      activo:   true,
    });
    return ref.id;
  }

  async function updateServicio(id, data) {
    await db.collection(COL.SERVICIOS).doc(String(id)).update(data);
  }

  async function deleteServicio(id) {
    await db.collection(COL.SERVICIOS).doc(String(id)).delete();
  }

  async function reordenarServicios(serviciosOrdenados) {
    // serviciosOrdenados: array de {id, ...} en el nuevo orden
    const batch = db.batch();
    serviciosOrdenados.forEach((s, i) => {
      batch.update(db.collection(COL.SERVICIOS).doc(String(s.id)), { orden: i });
    });
    await batch.commit();
  }

  // onSnapshot → callback recibe array de servicios en tiempo real
  function onServiciosChange(callback) {
    return db.collection(COL.SERVICIOS).orderBy('orden').onSnapshot(snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('[FDB] onServiciosChange:', err));
  }

  /* ──────────────────────────────────────────────────────────────
     CONFIGURACIÓN
     ────────────────────────────────────────────────────────────── */
  const _defaultConfig = () => ({
    horarioInicio:    '09:00',
    horarioFin:       '20:00',
    intervaloMinutos: 30,
    diasLaborales:    [1, 2, 3, 4, 5, 6],
    telefonoAdmin:    (typeof SHOP !== 'undefined' ? SHOP.telefono : '56900000000'),
    diasBloqueados:   [],
    colacion:         null,
    diasConfig:       {},
  });

  async function getConfig() {
    const snap = await configRef().get();
    if (!snap.exists) {
      const def = _defaultConfig();
      await configRef().set(def);
      return def;
    }
    return { ..._defaultConfig(), ...snap.data() };
  }

  async function updateConfig(data) {
    await configRef().set(data, { merge: true });
  }

  // onSnapshot → callback recibe el objeto de configuración
  function onConfigChange(callback) {
    return configRef().onSnapshot(snap => {
      if (snap.exists) callback({ ..._defaultConfig(), ...snap.data() });
    }, err => console.error('[FDB] onConfigChange:', err));
  }

  /* ──────────────────────────────────────────────────────────────
     CITAS
     ────────────────────────────────────────────────────────────── */
  async function getCitas(fecha) {
    const snap = await db.collection(COL.CITAS)
      .where('fecha', '==', fecha)
      .get();
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }

  async function getCitasMes(yyyyMM) {
    // yyyyMM = "2026-04"
    const snap = await db.collection(COL.CITAS)
      .where('fecha', '>=', yyyyMM + '-01')
      .where('fecha', '<=', yyyyMM + '-31')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Legacy: el flujo publico multi-tenant usa BookingService.createBooking().
  // Se mantiene temporalmente para compatibilidad con vistas antiguas.
  async function addCita(cita) {
    const ref = await db.collection(COL.CITAS).add({
      fecha:            cita.fecha            || '',
      hora:             cita.hora             || '',
      clienteNombre:    cita.clienteNombre    || '',
      clienteTelefono:  cita.clienteTelefono  || '',
      clienteEmail:     cita.clienteEmail     || '',
      servicioNombre:   cita.servicioNombre   || '',
      duracionServicio: Number(cita.duracionServicio) || 30,
      barbero:          cita.barbero          || '',
      estado:           'Confirmado',
      nota:             '',
      creadoEn:         firebase.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async function updateCitaEstado(id, estado) {
    await db.collection(COL.CITAS).doc(id).update({ estado });
  }

  async function updateCitaNota(id, nota) {
    await db.collection(COL.CITAS).doc(id).update({ nota });
  }

  async function deleteCita(id) {
    await db.collection(COL.CITAS).doc(id).delete();
  }

  // onSnapshot para un día específico → autoactualiza el panel admin
  function onCitasDiaChange(fecha, callback) {
    return db.collection(COL.CITAS)
      .where('fecha', '==', fecha)
      .onSnapshot(snap => {
        const citas = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.hora.localeCompare(b.hora));
        callback(citas);
      }, err => console.error('[FDB] onCitasDiaChange:', err));
  }

  /* ──────────────────────────────────────────────────────────────
     BLOQUEOS MANUALES
     ────────────────────────────────────────────────────────────── */
  async function addBloqueo({ fecha, todo_el_dia, hora_inicio, hora_fin, motivo }) {
    const ref = await db.collection(COL.BLOQUEOS).add({
      fecha,
      todo_el_dia:  !!todo_el_dia,
      hora_inicio:  todo_el_dia ? null : (hora_inicio || null),
      hora_fin:     todo_el_dia ? null : (hora_fin    || null),
      motivo:       motivo || '',
      creadoEn:     firebase.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async function getBloqueosDia(fecha) {
    const snap = await db.collection(COL.BLOQUEOS).where('fecha', '==', fecha).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function getBloqueosMes(yyyyMM) {
    const snap = await db.collection(COL.BLOQUEOS)
      .where('fecha', '>=', yyyyMM + '-01')
      .where('fecha', '<=', yyyyMM + '-31')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function deleteBloqueo(id) {
    await db.collection(COL.BLOQUEOS).doc(id).delete();
  }

  function onBloqueosDiaChange(fecha, callback) {
    return db.collection(COL.BLOQUEOS)
      .where('fecha', '==', fecha)
      .onSnapshot(
        snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err  => console.error('[FDB] onBloqueosDiaChange:', err)
      );
  }

  /* ──────────────────────────────────────────────────────────────
     PREMIOS DEL CLUB
     ────────────────────────────────────────────────────────────── */
  async function getPremios() {
    const snap = await db.collection(COL.PREMIOS).orderBy('costoSellos').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function addPremio(nombre, costoSellos) {
    const ref = await db.collection(COL.PREMIOS).add({
      nombre,
      costoSellos: Number(costoSellos),
      creadoEn:    firebase.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async function deletePremio(id) {
    await db.collection(COL.PREMIOS).doc(id).delete();
  }

  function onPremiosChange(callback) {
    return db.collection(COL.PREMIOS)
      .orderBy('costoSellos')
      .onSnapshot(
        snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err  => console.error('[FDB] onPremiosChange:', err)
      );
  }

  /* ──────────────────────────────────────────────────────────────
     DISPONIBILIDAD (reemplaza DB.getAvailableHours — ahora async)
     Filtra citas ocupadas, colación y bloqueos manuales.
     ────────────────────────────────────────────────────────────── */
  // Legacy: el flujo publico multi-tenant usa BookingService.getAvailableSlots().
  // Se mantiene temporalmente para compatibilidad con paneles existentes.
  async function getHorasDisponibles(fecha, duracionServicio, configOverride = null) {
    const cfg = configOverride || await getConfig();

    // Cargar citas y bloqueos en paralelo
    const [citas, bloqueos] = await Promise.all([
      getCitas(fecha),
      getBloqueosDia(fecha),
    ]);

    // Día completamente bloqueado → sin slots
    if (bloqueos.some(b => b.todo_el_dia)) return [];

    const toMins  = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const fromMin = m => `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;

    // Horario específico del día (si está configurado)
    const dw  = new Date(fecha + 'T12:00:00').getDay();
    const dc  = (cfg.diasConfig || {})[dw] || {};
    const ini = toMins(dc.inicio || cfg.horarioInicio || '09:00');
    const fin = toMins(dc.fin    || cfg.horarioFin    || '20:00');
    const interval = cfg.intervaloMinutos || 30;

    const ocupados = citas
      .filter(c => c.estado !== 'Cancelada')
      .map(c => ({
        start: toMins(c.hora),
        end:   toMins(c.hora) + parseInt(c.duracionServicio),
      }));

    // Rangos de bloqueo manual parciales
    const rangosBloq = bloqueos
      .filter(b => !b.todo_el_dia && b.hora_inicio && b.hora_fin)
      .map(b => ({ start: toMins(b.hora_inicio), end: toMins(b.hora_fin) }));

    const col   = cfg.colacion;
    const slots = [];
    let cur = ini;

    while (cur + parseInt(duracionServicio) <= fin) {
      // Saltar colación
      if (col) {
        const colS = toMins(col.inicio), colE = toMins(col.fin);
        if (cur >= colS && cur < colE) { cur += interval; continue; }
      }
      // Saltar bloqueo manual: omite el slot si el servicio solaparía el rango
      const bloqueado = rangosBloq.some(r =>
        cur < r.end && (cur + parseInt(duracionServicio)) > r.start
      );
      if (bloqueado) { cur += interval; continue; }

      const occupied = ocupados.some(o =>
        cur < o.end && (cur + parseInt(duracionServicio)) > o.start
      );
      slots.push({ time: fromMin(cur), occupied });
      cur += interval;
    }
    return slots;
  }

  /* ──────────────────────────────────────────────────────────────
     USUARIOS / SELLOS
     ────────────────────────────────────────────────────────────── */
  async function incrementarSellos(uid, nota = 'Sello sumado') {
    await db.collection(COL.USERS).doc(uid).update({
      stamps:      firebase.firestore.FieldValue.increment(1),
      ultimoSello: new Date().toISOString(),
      historialSellos: firebase.firestore.FieldValue.arrayUnion({
        fecha: new Date().toISOString(), tipo: 'suma', cantidad: 1, nota,
      }),
    });
  }

  async function modificarSellos(uid, delta, nota = '') {
    await db.collection(COL.USERS).doc(uid).update({
      stamps: firebase.firestore.FieldValue.increment(delta),
      historialSellos: firebase.firestore.FieldValue.arrayUnion({
        fecha: new Date().toISOString(),
        tipo:  delta > 0 ? 'suma' : 'resta',
        cantidad: delta,
        nota,
      }),
    });
  }

  async function canjearSellos(uid, costo, premio) {
    const ref  = db.collection(COL.USERS).doc(uid);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Cliente no encontrado.');
    const actual = snap.data().stamps || 0;
    if (actual < costo) throw new Error(`Sellos insuficientes (tiene ${actual}, necesita ${costo}).`);
    await ref.update({
      stamps: firebase.firestore.FieldValue.increment(-costo),
      historialSellos: firebase.firestore.FieldValue.arrayUnion({
        fecha: new Date().toISOString(), tipo: 'canje', cantidad: -costo, nota: premio,
      }),
    });
    return (await ref.get()).data();
  }

  /* ── API pública ────────────────────────────────────────────── */
  return {
    migrarDesdeLocalStorage,
    // Servicios
    getServicios, addServicio, updateServicio, deleteServicio,
    reordenarServicios, onServiciosChange,
    // Configuración
    getConfig, updateConfig, onConfigChange,
    // Citas
    getCitas, getCitasMes, addCita,
    updateCitaEstado, updateCitaNota, deleteCita,
    onCitasDiaChange,
    // Disponibilidad
    getHorasDisponibles,
    // Bloqueos manuales
    addBloqueo, getBloqueosDia, getBloqueosMes, deleteBloqueo, onBloqueosDiaChange,
    // Premios del club
    getPremios, addPremio, deletePremio, onPremiosChange,
    // Sellos
    incrementarSellos, modificarSellos, canjearSellos,
  };
})();


/* ════════════════════════════════════════════════════════════════
   AppState — Equivalente al Context Provider de React
   Centraliza datos de Firestore y notifica a los suscriptores.
   Uso:
     AppState.subscribe('servicios', srvs => renderServicios(srvs));
     AppState.subscribe('config',    cfg  => applyConfig(cfg));
   ════════════════════════════════════════════════════════════════ */
const AppState = (() => {
  const _state = { servicios: [], config: null, premios: [], loading: true };
  const _subs  = {};       // { key: [fn, fn, ...] }
  const _unsubs = [];      // funciones de cleanup onSnapshot

  function subscribe(key, fn) {
    if (!_subs[key]) _subs[key] = [];
    _subs[key].push(fn);
    // Emitir valor actual de inmediato si ya existe
    if (_state[key] !== null && _state[key] !== undefined) fn(_state[key]);
    // Retorna función para desuscribirse
    return () => { _subs[key] = (_subs[key] || []).filter(f => f !== fn); };
  }

  function _emit(key, value) {
    _state[key] = value;
    (_subs[key] || []).forEach(fn => fn(value));
  }

  function get(key) { return _state[key]; }

  // Subscripción temporal para citas de un día (se gestiona externamente)
  function subscribeCitasDia(fecha, fn) {
    return FDB.onCitasDiaChange(fecha, fn);
  }

  async function init() {
    // 1. Migrar datos locales si es la primera vez
    try { await FDB.migrarDesdeLocalStorage(); } catch (e) { console.warn('[AppState] Migración:', e.message); }

    // 2. Asegurar que existe doc de configuración
    try { await FDB.getConfig(); } catch (e) { console.warn('[AppState] getConfig:', e.message); }

    // 3. Suscripciones en tiempo real (se mantienen durante toda la sesión)
    _unsubs.push(
      FDB.onServiciosChange(srvs => _emit('servicios', srvs)),
      FDB.onConfigChange(cfg   => _emit('config',    cfg)),
      FDB.onPremiosChange(ps   => _emit('premios',   ps)),
    );

    _emit('loading', false);
  }

  function destroy() {
    _unsubs.forEach(u => u());
    _unsubs.length = 0;
  }

  return { init, subscribe, subscribeCitasDia, get, destroy };
})();
