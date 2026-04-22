(() => {
  'use strict';

  // ════════════════════════════════════════════════════════════════
  // TENANT RESOLVER v3.1 — Path-Based Routing con Slugs
  //
  // Prioridad de resolución:
  //   1. PATHNAME  →  /{slug}  o  /{slug}/admin
  //   2. QUERY     →  ?local=tenantId  (retrocompatibilidad + dev local)
  //   3. SESSION   →  sessionStorage
  //   4. DEFAULT   →  'ferraza'
  //
  // El slug es la parte visible en la URL (ej: "barberia-ferraza").
  // El id es la clave interna de Firestore (ej: "ferraza").
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
   * Busca un tenant por su slug (la parte de la URL).
   * Si no lo encuentra por slug, intenta por ID como fallback.
   */
  function getTenantBySlug(slug) {
    if (!slug) return null;
    const catalog = getTenantCatalog();
    // Primero buscar por slug
    for (const key of Object.keys(catalog)) {
      if (catalog[key].slug === slug) return catalog[key];
    }
    // Fallback: buscar por ID directo (retrocompatibilidad)
    return catalog[slug] || null;
  }

  /**
   * Extrae el slug desde el pathname.
   * /barberia-ferraza       → 'barberia-ferraza'
   * /barberia-ferraza/admin → 'barberia-ferraza'
   * /navaja                 → 'navaja'
   * /                       → ''
   * /ceo                    → '' (ruta reservada)
   * /js/app/store.js        → '' (asset estático)
   */
  function getTenantFromPath() {
    try {
      const path = window.location.pathname;
      if (!path || path === '/') return '';

      const segments = path.split('/').filter(Boolean);
      if (!segments.length) return '';

      const first = normalizeTenantId(segments[0]);

      // Ignorar archivos estáticos y rutas reservadas
      const reserved = ['js', 'css', 'img', 'fonts', 'assets', 'output.css',
                        'ceo', 'api', '_vercel', 'favicon.ico', 'node_modules'];
      if (reserved.includes(first)) return '';
      if (first.includes('.')) return ''; // archivos como index.html

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

  /** Detecta si estamos en la vista /admin de un tenant. */
  function isAdminView() {
    const segs = window.location.pathname.split('/').filter(Boolean);
    return segs.length >= 2 && segs[1] === 'admin';
  }

  function resolveTenant() {
    const defaultTenantId = normalizeTenantId(window.APP_CONFIG?.defaultTenantId || 'ferraza');

    // Prioridad: PATH > QUERY > SESSION > DEFAULT
    const pathSlug = getTenantFromPath();
    const queryTenant = getTenantFromQuery();
    const sessionTenant = getTenantFromSession();

    let resolvedTenant = null;
    let source;

    if (pathSlug) {
      // El path trae un slug → resolver por slug
      resolvedTenant = getTenantBySlug(pathSlug);
      source = 'path';
    }

    if (!resolvedTenant && queryTenant) {
      // Query trae un ID directo → resolver por ID (o slug)
      resolvedTenant = getTenantBySlug(queryTenant) || getTenantById(queryTenant);
      source = 'query';
    }

    if (!resolvedTenant && sessionTenant) {
      resolvedTenant = getTenantById(sessionTenant);
      source = 'session';
    }

    if (!resolvedTenant) {
      resolvedTenant = getTenantById(defaultTenantId);
      source = 'default';
    }

    const resolvedTenantId = resolvedTenant?.id || defaultTenantId;

    // Si el nuevo tenant es distinto al de la sesión → limpiar memoria
    if (sessionTenant && sessionTenant !== resolvedTenantId && (pathSlug || queryTenant)) {
      console.info(`[TenantResolver] Cambio de tenant: ${sessionTenant} → ${resolvedTenantId}. Limpiando store.`);
      _clearStoreMemory();
    }

    persistTenantId(resolvedTenantId);

    return {
      tenantId: resolvedTenantId,
      tenant: resolvedTenant,
      slug: resolvedTenant?.slug || resolvedTenantId,
      requestedTenantId: resolvedTenantId,
      source,
      found: Boolean(resolvedTenant),
      isAdmin: isAdminView(),
    };
  }

  /**
   * Genera URLs canónicas usando el SLUG del tenant.
   * Uso: TenantResolver.url('ferraza', 'client')  → '/barberia-ferraza'
   *      TenantResolver.url('navaja',  'admin')   → '/navaja/admin'
   *      TenantResolver.url(null,      'ceo')     → '/ceo'
   */
  function url(tenantId, view = 'client') {
    if (view === 'ceo') return '/ceo';
    // Buscar el slug del tenant para generar la URL bonita
    const tenant = getTenantById(tenantId);
    const slug = tenant?.slug || tenantId;
    if (view === 'admin') return `/${slug}/admin`;
    return `/${slug}`;
  }

  window.TenantResolver = {
    normalizeTenantId,
    getTenantById,
    getTenantBySlug,
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
