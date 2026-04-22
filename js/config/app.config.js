(() => {
  'use strict';

  document.documentElement.dataset.appLoading = 'true';

  const TENANT_QUERY_PARAM = 'local';
  const TENANT_SESSION_KEY = 'saas_current_tenant';
  const DEFAULT_TENANT_ID = 'ferraza';

  // Catalogo inicial para el bootstrap SaaS.
  // En el Paso 2 pasara a cargarse desde Firestore.
  const TENANT_CATALOG = {
    ferraza: {
      id: 'ferraza',
      slug: 'barberia-ferraza',
      displayName: 'Barberia Ferraza',
      shortName: 'Ferraza',
      status: 'active',
      theme: {
        colorBg: '#050505',
        colorSurface: '#0a0a0d',
        colorPrimary: '#ffffff',
        colorAccent: '#d4d4d8',
      },
    },
    navaja: {
      id: 'navaja',
      slug: 'navaja',
      displayName: 'El Club de la Navaja',
      shortName: 'Navaja',
      status: 'draft',
      theme: {
        colorBg: '#09090b',
        colorSurface: '#111111',
        colorPrimary: '#f5f5f4',
        colorAccent: '#d6d3d1',
      },
    },
    'brows-kelly': {
      id: 'brows-kelly',
      slug: 'brows-kelly',
      displayName: 'Brows Kelly',
      shortName: 'Kelly',
      status: 'draft',
      theme: {
        colorBg: '#fffaf7',
        colorSurface: '#f4ede7',
        colorPrimary: '#2f241f',
        colorAccent: '#b08968',
      },
    },
  };

  window.APP_CONFIG = Object.freeze({
    appName: 'Barberia SaaS Engine',
    tenantQueryParam: TENANT_QUERY_PARAM,
    tenantSessionKey: TENANT_SESSION_KEY,
    defaultTenantId: DEFAULT_TENANT_ID,
    tenants: TENANT_CATALOG,
  });
})();
