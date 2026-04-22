(() => {
  'use strict';

  // Array de mocks para usarse si no existen locales en Firestore
  let mocksInMem = [
    {
      id: 'ferraza',
      displayName: 'Barbería Ferraza',
      slug: 'ferraza',
      status: 'active',
      license: {
        limite_sillas: 4,
        estado_cuenta: 'activo',
        features: { loyalty_program: true }
      }
    },
    {
      id: 'navaja',
      displayName: 'El Club de la Navaja',
      slug: 'navaja',
      status: 'draft',
      license: {
        limite_sillas: 2,
        estado_cuenta: 'activo',
        features: { loyalty_program: false }
      }
    },
    {
      id: 'brows-kelly',
      displayName: 'Brows Kelly',
      slug: 'brows-kelly',
      status: 'draft',
      license: {
        limite_sillas: 1,
        estado_cuenta: 'activo',
        features: { loyalty_program: true }
      }
    }
  ];

  async function fetchAllTenants() {
    try {
      if (typeof db !== 'undefined') {
        const snap = await db.collection('tenants').get();
        if (!snap.empty) {
          return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      }
    } catch (error) {
      console.warn('[SuperAdmin] Falló lectura de tenants reales, usando mocks.', error);
    }
    console.info('[SuperAdmin] Retornando Tenants de prueba (Mocks)');
    return [...mocksInMem];
  }

  /**
   * Actualiza licencia del tenant: sillas, estado_cuenta y features.
   * @param {string} tenantId
   * @param {object} licenseData - { limite_sillas, estado_cuenta, features }
   */
  async function updateTenantLicense(tenantId, licenseData) {
    try {
      if (typeof db !== 'undefined') {
        const docRef = db.collection('tenants').doc(tenantId);
        const snap = await docRef.get();
        if (snap.exists) {
          await docRef.set({ license: licenseData }, { merge: true });
          console.log(`[SuperAdmin] Licencia de ${tenantId} actualizada en Firestore.`);
          return true;
        } else {
          // El doc no existe aún → crearlo con datos base
          await docRef.set({
            id: tenantId,
            license: licenseData
          }, { merge: true });
          console.log(`[SuperAdmin] Tenant ${tenantId} creado en Firestore.`);
          return true;
        }
      }
    } catch (error) {
      console.warn('[SuperAdmin] Fallo actualización en Firestore, usando mocks.', error);
    }

    // Fallback: actualiza los mocks en memoria
    console.info(`[SuperAdmin] Actualizando Mock de ${tenantId}...`);
    const idx = mocksInMem.findIndex(t => t.id === tenantId);
    if (idx !== -1) {
      mocksInMem[idx].license = { ...mocksInMem[idx].license, ...licenseData };
    }
    return true;
  }

  window.SuperAdminService = {
    fetchAllTenants,
    updateTenantLicense,
  };
})();
