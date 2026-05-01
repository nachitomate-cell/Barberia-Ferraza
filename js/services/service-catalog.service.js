(() => {
  'use strict';

  function getServiceMocks(tenantId) {
    const mocks = {
      ferraza: [
        { id: 'srv-ferraza-1', nombre: 'Corte Clasico', precio: 15000, duracion: 60, activo: true, orden: 0 },
        { id: 'srv-ferraza-2', nombre: 'Barba Premium', precio: 10000, duracion: 30, activo: true, orden: 1 },
        { id: 'srv-ferraza-3', nombre: 'Corte + Barba', precio: 22000, duracion: 90, activo: true, orden: 2 },
      ],
    };

    return mocks[tenantId] || mocks.ferraza;
  }

  async function fetchServices(tenantId) {
    let services = [];
    let source = 'mock';

    try {
      if (typeof db !== 'undefined') {
        const snap = await db.collection('tenants').doc(tenantId).collection('services').orderBy('orden').get();
        if (!snap.empty) {
          services = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          source = 'firestore';
        }
      }
    } catch (error) {
      console.warn(`[ServiceCatalog] Firestore no disponible para "${tenantId}", usando fallback:`, error.message);
    }

    if (!services.length) {
      services = getServiceMocks(tenantId);
    }

    const normalized = services
      .filter(item => item.activo !== false)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));

    window.AppStore?.set({
      services: normalized,
      servicesSource: source,
    });

    return normalized;
  }

  window.ServiceCatalogService = {
    fetchServices,
    getServiceMocks,
  };
})();
