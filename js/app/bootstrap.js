(() => {
  'use strict';

  function announceTenant(runtime) {
    if (!runtime?.tenant) {
      console.warn('[SaaS Bootstrap] No se pudo resolver un tenant valido.');
      return;
    }

    console.info(
      `[SaaS Bootstrap] Cargando negocio "${runtime.tenant.displayName}" (tenant: ${runtime.tenantId}, resolver: ${runtime.source}, config: ${runtime.tenantConfigSource || 'unknown'})`
    );
  }

  function finishLoading() {
    document.documentElement.dataset.appLoading = 'false';
  }

  async function initSaaSRuntime() {
    if (!window.APP_CONFIG || !window.TenantResolver || !window.AppStore) {
      console.warn('[SaaS Bootstrap] Dependencias de configuracion incompletas.');
      finishLoading();
      return null;
    }

    try {
      const resolved = window.TenantResolver.resolveTenant();
      const runtime = {
        ...resolved,
        config: window.APP_CONFIG,
        store: window.AppStore,
      };

      window.AppRuntime = runtime;
      window.App = window.App || {};
      window.App.runtime = runtime;
      window.App.config = runtime.config;

      window.AppStore.setState({
        tenant: runtime.tenant,
        tenantId: runtime.tenantId,
        config: runtime.config,
      });

      if (window.TenantTheme?.initThemeBindings) {
        window.TenantTheme.initThemeBindings();
      }

      if (window.TenantService?.fetchTenantConfig) {
        const tenantConfig = await window.TenantService.fetchTenantConfig(runtime.tenantId);
        runtime.profile = tenantConfig.profile;
        runtime.theme = tenantConfig.theme;
        runtime.tenantConfigSource = tenantConfig.source;
      }

      if (window.ProfessionalService?.fetchProfessionals) {
        runtime.professionals = await window.ProfessionalService.fetchProfessionals(runtime.tenantId);
      }

      if (window.ServiceCatalogService?.fetchServices) {
        runtime.services = await window.ServiceCatalogService.fetchServices(runtime.tenantId);
      }

      window.AppStore.setState({
        initialized: true,
        currentBookingDraft: window.AppStore.get('currentBookingDraft') || {
          professionalId: 'any',
          professionalName: 'Cualquiera / El mas proximo',
          serviceId: null,
          serviceName: null,
        },
      });

      if (window.TenantTheme?.applyTenantTheme) {
        window.TenantTheme.applyTenantTheme();
      }

      announceTenant(runtime);
      window.dispatchEvent(new CustomEvent('app:tenant-ready', { detail: runtime }));
      finishLoading();
      return runtime;
    } catch (error) {
      console.error('[SaaS Bootstrap] Error inicializando runtime:', error);
      finishLoading();
      return null;
    }
  }

  initSaaSRuntime();
})();
