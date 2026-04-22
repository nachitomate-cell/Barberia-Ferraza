(() => {
  'use strict';

  function toMinutes(value) {
    if (!value) return 0;
    const [h, m] = String(value).split(':').map(Number);
    return (h * 60) + m;
  }

  function fromMinutes(value) {
    const h = Math.floor(value / 60).toString().padStart(2, '0');
    const m = (value % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  async function getBookingConfig() {
    try {
      if (typeof FDB !== 'undefined' && FDB.getConfig) {
        return await FDB.getConfig();
      }
    } catch (_) {
      // fallback below
    }

    return {
      horarioInicio: '09:00',
      horarioFin: '20:00',
      intervaloMinutos: 30,
      diasLaborales: [1, 2, 3, 4, 5, 6],
      diasBloqueados: [],
      colacion: null,
      diasConfig: {},
    };
  }

  async function getDayBlocks(date) {
    try {
      if (typeof FDB !== 'undefined' && FDB.getBloqueosDia) {
        return await FDB.getBloqueosDia(date);
      }
    } catch (_) {
      // ignore
    }
    return [];
  }

  async function getBookingsForDate(tenantId, date) {
    try {
      if (typeof db === 'undefined') return [];
      const snap = await db.collection('tenants').doc(tenantId).collection('citas')
        .where('date', '==', date)
        .get();

      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn(`[BookingService] No se pudieron leer reservas para ${tenantId} en ${date}:`, error.message);
      return [];
    }
  }

  function resolveActiveProfessionals(professionalId) {
    const professionals = (window.AppStore?.get('professionals') || []).filter(p => p.active !== false);
    if (professionalId === 'any') return professionals;
    return professionals.filter(p => String(p.id) === String(professionalId));
  }

  function computeProfessionalSlots({ config, date, blocks, bookings, professional, serviceDurationMin }) {
    const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
    const dayConfig = (config.diasConfig || {})[dayOfWeek] || {};
    const interval = Number(config.intervaloMinutos) || 30;
    const slotCount = Math.max(1, Math.ceil(Number(serviceDurationMin) / interval));
    const start = toMinutes(dayConfig.inicio || config.horarioInicio || '09:00');
    const end = toMinutes(dayConfig.fin || config.horarioFin || '20:00');

    const professionalBookings = bookings
      .filter(item => item.status !== 'cancelled' && item.estado !== 'Cancelada')
      .filter(item => String(item.professionalId || '') === String(professional.id))
      .map(item => ({
        start: toMinutes(item.startTime || item.hora),
        end: toMinutes(item.endTime || fromMinutes(toMinutes(item.startTime || item.hora) + Number(item.durationMin || item.duracionServicio || 30))),
      }));

    const blockRanges = blocks
      .filter(block => !block.todo_el_dia)
      .filter(block => !block.professionalId || String(block.professionalId) === String(professional.id))
      .filter(block => block.hora_inicio && block.hora_fin)
      .map(block => ({
        start: toMinutes(block.hora_inicio),
        end: toMinutes(block.hora_fin),
      }));

    const lunch = config.colacion;
    const available = [];

    for (let cursor = start; cursor + (slotCount * interval) <= end; cursor += interval) {
      let canFit = true;
      for (let step = 0; step < slotCount; step++) {
        const slotStart = cursor + (step * interval);
        const slotEnd = slotStart + interval;

        if (lunch) {
          const lunchStart = toMinutes(lunch.inicio);
          const lunchEnd = toMinutes(lunch.fin);
          if (slotStart < lunchEnd && slotEnd > lunchStart) {
            canFit = false;
            break;
          }
        }

        const blocked = blockRanges.some(range => slotStart < range.end && slotEnd > range.start);
        if (blocked) {
          canFit = false;
          break;
        }

        const occupied = professionalBookings.some(range => slotStart < range.end && slotEnd > range.start);
        if (occupied) {
          canFit = false;
          break;
        }
      }

      if (canFit) {
        available.push(fromMinutes(cursor));
      }
    }

    return available;
  }

  async function getAvailableSlots(tenantId, date, professionalId, serviceDurationMin) {
    const [config, blocks, bookings] = await Promise.all([
      getBookingConfig(),
      getDayBlocks(date),
      getBookingsForDate(tenantId, date),
    ]);

    if ((config.diasBloqueados || []).includes(date)) return [];
    if (blocks.some(block => block.todo_el_dia && !block.professionalId)) return [];

    const professionals = resolveActiveProfessionals(professionalId);
    if (!professionals.length) return [];

    const slotsByTime = new Map();

    professionals.forEach(professional => {
      const availableTimes = computeProfessionalSlots({
        config,
        date,
        blocks,
        bookings,
        professional,
        serviceDurationMin,
      });

      availableTimes.forEach(time => {
        if (!slotsByTime.has(time)) {
          slotsByTime.set(time, {
            time,
            occupied: false,
            availableProfessionalIds: [],
          });
        }

        slotsByTime.get(time).availableProfessionalIds.push(professional.id);
      });
    });

    return [...slotsByTime.values()].sort((a, b) => a.time.localeCompare(b.time));
  }

  async function createBooking(bookingData = {}) {
    const draft = window.AppStore?.get('currentBookingDraft') || {};
    const tenantId = bookingData.tenantId || window.AppStore?.get('tenantId');
    if (!tenantId) throw new Error('Tenant no resuelto.');

    const date = bookingData.date || draft.date;
    const startTime = bookingData.startTime || draft.startTime;
    const durationMin = Number(bookingData.durationMin || draft.serviceDuration || 30);
    if (!date || !startTime) throw new Error('Faltan fecha u hora para crear la reserva.');

    let professionalId = bookingData.professionalId || draft.professionalId || 'any';
    let availableProfessionalIds = bookingData.availableProfessionalIds || draft.availableProfessionalIds || [];

    if (professionalId === 'any') {
      if (!availableProfessionalIds.length) {
        const recalculated = await getAvailableSlots(tenantId, date, 'any', durationMin);
        const target = recalculated.find(slot => slot.time === startTime);
        availableProfessionalIds = target?.availableProfessionalIds || [];
      }

      professionalId = availableProfessionalIds[0];
      if (!professionalId) {
        throw new Error('No se encontro un profesional libre para la hora seleccionada.');
      }
    }

    const professionals = window.AppStore?.get('professionals') || [];
    const services = window.AppStore?.get('services') || [];
    const assignedProfessional = professionals.find(item => String(item.id) === String(professionalId));
    const selectedService = services.find(item => String(item.id) === String(bookingData.serviceId || draft.serviceId));

    const payload = {
      // --- New SaaS Schema ---
      tenantId,
      professionalId,
      professionalNameSnapshot: assignedProfessional?.displayName || draft.professionalName || '',
      serviceId: bookingData.serviceId || draft.serviceId,
      serviceNameSnapshot: bookingData.serviceNameSnapshot || draft.serviceName || selectedService?.nombre || '',
      durationMin,
      date,
      startTime,
      endTime: fromMinutes(toMinutes(startTime) + durationMin),
      customerData: bookingData.customerData || {},
      status: 'confirmed',
      createdAt: typeof firebase !== 'undefined'
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString(),
      source: 'web',
      
      // --- Legacy Schema (Compatibilidad con gestion-interna.html) ---
      clienteNombre: bookingData.customerData?.name || '',
      clienteTelefono: bookingData.customerData?.phone || '',
      servicioNombre: bookingData.serviceNameSnapshot || draft.serviceName || selectedService?.nombre || '',
      hora: startTime,
      fecha: date,
      barberoId: professionalId,
      estado: 'agendado',
    };

    const ref = await db.collection('tenants').doc(tenantId).collection('citas').add(payload);

    window.AppStore?.set('currentBookingDraft', {
      ...draft,
      professionalId,
      professionalName: payload.professionalNameSnapshot,
      startTime,
      date,
      availableProfessionalIds,
      bookingId: ref.id,
    });

    return {
      id: ref.id,
      ...payload,
    };
  }

  window.BookingService = {
    getAvailableSlots,
    createBooking,
  };
})();
