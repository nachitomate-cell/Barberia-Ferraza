(() => {
  'use strict';

  function getProfessionalMocks(tenantId) {
    const mocks = {
      ferraza: [
        { id: 'prof-ferraza-1', displayName: 'Nicolas Fabian', photoUrl: 'Fabian.png', active: true, role: 'barbero', order: 0 },
      ],
      navaja: [
        { id: 'prof-navaja-1', displayName: 'Diego Rojas', photoUrl: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22 viewBox=%220 0 240 240%22%3E%3Crect width=%22240%22 height=%22240%22 rx=%22120%22 fill=%22%231e293b%22/%3E%3Ctext x=%22120%22 y=%22133%22 text-anchor=%22middle%22 font-family=%22Inter,Arial,sans-serif%22 font-size=%2256%22 font-weight=%22700%22 fill=%22%2360a5fa%22%3EDR%3C/text%3E%3C/svg%3E', active: true, role: 'barbero', order: 0 },
        { id: 'prof-navaja-2', displayName: 'Matias Leon', photoUrl: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22 viewBox=%220 0 240 240%22%3E%3Crect width=%22240%22 height=%22240%22 rx=%22120%22 fill=%22%237f1d1d%22/%3E%3Ctext x=%22120%22 y=%22133%22 text-anchor=%22middle%22 font-family=%22Inter,Arial,sans-serif%22 font-size=%2256%22 font-weight=%22700%22 fill=%22%23fecaca%22%3EML%3C/text%3E%3C/svg%3E', active: true, role: 'barbero', order: 1 },
      ],
      'brows-kelly': [
        { id: 'prof-kelly-1', displayName: 'Kelly Morales', photoUrl: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22 viewBox=%220 0 240 240%22%3E%3Crect width=%22240%22 height=%22240%22 rx=%22120%22 fill=%22%2336281d%22/%3E%3Ctext x=%22120%22 y=%22133%22 text-anchor=%22middle%22 font-family=%22Inter,Arial,sans-serif%22 font-size=%2256%22 font-weight=%22700%22 fill=%22%23e9d3aa%22%3EKM%3C/text%3E%3C/svg%3E', active: true, role: 'esteticista', order: 0 },
        { id: 'prof-kelly-2', displayName: 'Amanda Reyes', photoUrl: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22240%22 height=%22240%22 viewBox=%220 0 240 240%22%3E%3Crect width=%22240%22 height=%22240%22 rx=%22120%22 fill=%22%232a221d%22/%3E%3Ctext x=%22120%22 y=%22133%22 text-anchor=%22middle%22 font-family=%22Inter,Arial,sans-serif%22 font-size=%2256%22 font-weight=%22700%22 fill=%22%23f6e7cb%22%3EAR%3C/text%3E%3C/svg%3E', active: true, role: 'esteticista', order: 1 },
      ],
    };
    return mocks[tenantId] || mocks.ferraza;
  }

  async function fetchProfessionals(tenantId) {
    let professionals = [];
    let source = 'mock';

    try {
      if (typeof db !== 'undefined') {
        const snap = await db.collection('tenants').doc(tenantId).collection('professionals').orderBy('order').get();
        if (!snap.empty) {
          professionals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          source = 'firestore';
        }
      }
    } catch (error) {
      console.warn(`[ProfessionalService] Firestore no disponible para "${tenantId}", usando fallback:`, error.message);
    }

    if (!professionals.length) {
      professionals = getProfessionalMocks(tenantId);
    }

    const normalized = professionals
      .filter(item => item.active !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    window.AppStore?.set({ professionals: normalized, professionalsSource: source });
    return normalized;
  }

  /**
   * Activa o desactiva un profesional verificando en tiempo real
   * el límite de sillas desde Firestore ANTES de escribir.
   * Esto previene burlas al límite por dejar la pestaña abierta.
   */
  async function toggleProfessionalActive(tenantId, professionalId, desiredActive) {
    // Si queremos ACTIVAR, verificar el límite primero
    if (desiredActive) {
      let limiteActual = 1;
      try {
        const tenantSnap = await db.collection('tenants').doc(tenantId).get();
        if (tenantSnap.exists) {
          const data = tenantSnap.data();
          limiteActual = data?.license?.limite_sillas || 1;
        }
      } catch (e) {
        console.warn('[ProfessionalService] No se pudo verificar el límite de sillas en tiempo real:', e.message);
      }

      // Contar cuántos profesionales activos hay actualmente en Firestore
      let activosActuales = 0;
      try {
        const activeSnap = await db.collection('tenants').doc(tenantId)
          .collection('professionals')
          .where('active', '==', true)
          .get();
        activosActuales = activeSnap.size;
      } catch (e) {
        console.warn('[ProfessionalService] No se pudo contar activos:', e.message);
        // Usar cache local como fallback
        const cached = window.AppStore?.get('professionals') || [];
        activosActuales = cached.filter(p => p.active).length;
      }

      if (activosActuales >= limiteActual) {
        return {
          success: false,
          reason: 'limit_reached',
          limit: limiteActual,
          current: activosActuales,
        };
      }
    }

    // Escribir el cambio en Firestore
    try {
      await db.collection('tenants').doc(tenantId)
        .collection('professionals').doc(professionalId)
        .update({ active: desiredActive });
      return { success: true };
    } catch (e) {
      console.error('[ProfessionalService] Error al actualizar profesional:', e.message);
      return { success: false, reason: 'write_error', error: e.message };
    }
  }

  window.ProfessionalService = {
    fetchProfessionals,
    getProfessionalMocks,
    toggleProfessionalActive,
  };
})();
