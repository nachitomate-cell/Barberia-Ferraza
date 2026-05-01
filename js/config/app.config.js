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
      slug: 'ferraza',
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
  };

  window.APP_CONFIG = Object.freeze({
    appName: 'Barberia SaaS Engine',
    tenantQueryParam: TENANT_QUERY_PARAM,
    tenantSessionKey: TENANT_SESSION_KEY,
    defaultTenantId: DEFAULT_TENANT_ID,
    tenants: TENANT_CATALOG,
  });
})();
