(() => {
  'use strict';

  // ════════════════════════════════════════════════════════════════
  // TENANT RESOLVER v3 — Path-Based Routing
  //
  // Prioridad de resolución:
  //   1. PATHNAME  →  /{tenantId}  o  /{tenantId}/admin
  //   2. QUERY     →  ?local=tenantId  (retrocompatibilidad + dev local)
  //   3. SESSION   →  sessionStorage
  //   4. DEFAULT   →  'ferraza'
  // ════════════════════════════════════════════════════════════════

  function normalizeTenantId(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getTenantCatalog() {
    return (window.APP_CONFIG && window.APP_CONFIG.tenants) || {};
  }

  function getTenantById(tenantId) {
    const catalog = getTenantCatalog();
    return catalog[tenantId] || null;
  }

  /**
   * Extrae el tenantId desde el pathname.
   * Soporta:  /navaja  →  'navaja'
   *           /navaja/admin  →  'navaja'
   *           /  →  ''
   *           /ceo  →  '' (no es un tenant)
   *           /js/app/store.js  →  '' (static asset, no tenant)
   */
  function getTenantFromPath() {
    try {
      const path = window.location.pathname;
      // Ignorar rutas raíz, rutas de assets conocidos, y la ruta /ceo
      if (!path || path === '/') return '';

      const segments = path.split('/').filter(Boolean);
      if (!segments.length) return '';

      const first = normalizeTenantId(segments[0]);

      // Ignorar si es un archivo estático o ruta reservada
      const reserved = ['js', 'css', 'img', 'fonts', 'assets', 'output.css',
                        'ceo', 'api', '_vercel', 'favicon.ico', 'node_modules'];
      if (reserved.includes(first)) return '';
      if (first.includes('.')) return ''; // archivos como index.html, firebase-config.js

      return first;
    } catch (_) {
      return '';
    }
  }

  /**
   * Retrocompatibilidad: sigue soportando ?local=tenantId
   * Útil para desarrollo local con `npm run dev` (serve) que no tiene rewrites.
   */
  function getTenantFromQuery() {
    try {
      const queryParam = window.APP_CONFIG?.tenantQueryParam || 'local';
      const url = new URL(window.location.href);
      return normalizeTenantId(url.searchParams.get(queryParam));
    } catch (_) {
      return '';
    }
  }

  function getTenantFromSession() {
    try {
      return normalizeTenantId(sessionStorage.getItem(window.APP_CONFIG?.tenantSessionKey || 'saas_current_tenant'));
    } catch (_) {
      return '';
    }
  }

  function persistTenantId(tenantId) {
    try {
      sessionStorage.setItem(window.APP_CONFIG?.tenantSessionKey || 'saas_current_tenant', tenantId);
    } catch (_) { /* Ignorar storage deshabilitado */ }
  }

  /**
   * Limpia toda la memoria del store anterior.
   * Previene cross-tenant data leak al cambiar de local.
   */
  function _clearStoreMemory() {
    if (window.AppStore) {
      const storeKeys = ['professionals', 'services', 'config', 'currentBookingDraft',
                         'tenantId', 'tenant', 'initialized'];
      storeKeys.forEach(key => {
        try { window.AppStore.set(key, null); } catch (_) {}
      });
    }
    if (window.App && window.App.store && window.App.store !== window.AppStore) {
      try { window.App.store.setState && window.App.store.setState({}); } catch (_) {}
    }
    if (window.AppState && typeof window.AppState.clear === 'function') {
      try { window.AppState.clear(); } catch (_) {}
    }
  }

  /**
   * Detecta si estamos en la vista /admin de un tenant.
   * Útil para que bootstrap.js sepa qué HTML cargar.
   */
  function isAdminView() {
    const segs = window.location.pathname.split('/').filter(Boolean);
    return segs.length >= 2 && segs[1] === 'admin';
  }

  function resolveTenant() {
    const defaultTenantId = normalizeTenantId(window.APP_CONFIG?.defaultTenantId || 'ferraza');

    // Prioridad: PATH > QUERY > SESSION > DEFAULT
    const pathTenant = getTenantFromPath();
    const queryTenant = getTenantFromQuery();
    const sessionTenant = getTenantFromSession();

    let requestedTenantId;
    let source;

    if (pathTenant) {
      source = 'path';
      requestedTenantId = pathTenant;
    } else if (queryTenant) {
      source = 'query';
      requestedTenantId = queryTenant;
    } else if (sessionTenant) {
      source = 'session';
      requestedTenantId = sessionTenant;
    } else {
      source = 'default';
      requestedTenantId = defaultTenantId;
    }

    // Si el nuevo tenant es distinto al de la sesión → limpiar memoria
    if (sessionTenant && sessionTenant !== requestedTenantId && (pathTenant || queryTenant)) {
      console.info(`[TenantResolver] Cambio de tenant: ${sessionTenant} → ${requestedTenantId}. Limpiando store.`);
      _clearStoreMemory();
    }

    const resolvedTenant = getTenantById(requestedTenantId) || getTenantById(defaultTenantId);
    const resolvedTenantId = resolvedTenant?.id || defaultTenantId;

    persistTenantId(resolvedTenantId);

    return {
      tenantId: resolvedTenantId,
      tenant: resolvedTenant,
      requestedTenantId,
      source,
      found: Boolean(getTenantById(requestedTenantId)),
      isAdmin: isAdminView(),
    };
  }

  /**
   * Genera URLs canónicas para navegar entre vistas del tenant.
   * Uso: TenantResolver.url('navaja', 'client')  → '/navaja'
   *      TenantResolver.url('navaja', 'admin')   → '/navaja/admin'
   *      TenantResolver.url(null,     'ceo')     → '/ceo'
   */
  function url(tenantId, view = 'client') {
    if (view === 'ceo') return '/ceo';
    if (view === 'admin') return `/${tenantId}/admin`;
    return `/${tenantId}`;
  }

  window.TenantResolver = {
    normalizeTenantId,
    getTenantById,
    getTenantCatalog,
    getTenantFromPath,
    getTenantFromQuery,
    getTenantFromSession,
    resolveTenant,
    clearStore: _clearStoreMemory,
    isAdminView,
    url,
  };
})();
