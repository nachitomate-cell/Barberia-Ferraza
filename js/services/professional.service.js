(() => {
  'use strict';

  function getProfessionalMocks(tenantId) {
    const mocks = {
      ferraza: [
        {
          id: 'prof-ferraza-1',
          displayName: 'Nicolas Fabian',
          photoUrl: 'Fabian.png',
          active: true,
          role: 'barbero',
          order: 0,
        },
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

    window.AppStore?.set({
      professionals: normalized,
      professionalsSource: source,
    });

    return normalized;
  }

  window.ProfessionalService = {
    fetchProfessionals,
    getProfessionalMocks,
  };
})();
