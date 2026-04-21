(() => {
  'use strict';

  function normalizeTenantId(value) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  function getTenantCatalog() {
    return (window.APP_CONFIG && window.APP_CONFIG.tenants) || {};
  }

  function getTenantById(tenantId) {
    const catalog = getTenantCatalog();
    return catalog[tenantId] || null;
  }

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
    } catch (_) {
      // Ignorar storage deshabilitado.
    }
  }

  function resolveTenant() {
    const defaultTenantId = normalizeTenantId(window.APP_CONFIG?.defaultTenantId || 'ferraza');
    const requestedTenantId = getTenantFromQuery() || getTenantFromSession() || defaultTenantId;

    const resolvedTenant = getTenantById(requestedTenantId) || getTenantById(defaultTenantId);
    const resolvedTenantId = resolvedTenant?.id || defaultTenantId;

    persistTenantId(resolvedTenantId);

    return {
      tenantId: resolvedTenantId,
      tenant: resolvedTenant,
      requestedTenantId,
      source: getTenantFromQuery() ? 'query' : (getTenantFromSession() ? 'session' : 'default'),
      found: Boolean(getTenantById(requestedTenantId)),
    };
  }

  window.TenantResolver = {
    normalizeTenantId,
    getTenantById,
    resolveTenant,
  };
})();
