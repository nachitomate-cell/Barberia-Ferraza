(() => {
  'use strict';

  function setRootVariable(name, value) {
    if (!value) return;
    document.documentElement.style.setProperty(name, value);
  }

  function updateMetaTag(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el && value) el.setAttribute(attr, value);
  }

  function applyTenantTheme() {
    const store = window.AppStore;
    const theme = store?.get('theme');
    const profile = store?.get('profile');

    if (!theme || !profile) return;

    setRootVariable('--brand-bg', theme.colorBg);
    setRootVariable('--brand-surface', theme.colorSurface);
    setRootVariable('--brand-surface-alt', theme.colorSurfaceAlt || theme.colorSurface);
    setRootVariable('--brand-primary', theme.colorPrimary);
    setRootVariable('--brand-accent', theme.colorAccent);
    setRootVariable('--brand-text', theme.colorText);
    setRootVariable('--brand-muted', theme.colorMuted);
    setRootVariable('--brand-border', theme.colorBorder);
    setRootVariable('--brand-glow', theme.colorGlow);
    setRootVariable('--brand-button-text', theme.colorButtonText || theme.colorText);
    setRootVariable('--brand-progress-track', theme.colorProgressTrack || theme.colorSurfaceAlt || theme.colorSurface);

    if (profile.pageTitle) document.title = profile.pageTitle;
    updateMetaTag('meta[name="description"]', 'content', profile.metaDescription);
    updateMetaTag('meta[property="og:title"]', 'content', profile.pageTitle || profile.name);
    updateMetaTag('meta[property="og:description"]', 'content', profile.metaDescription);
    updateMetaTag('meta[name="apple-mobile-web-app-title"]', 'content', profile.shortName || profile.name);
    updateMetaTag('meta[name="theme-color"]', 'content', theme.colorBg);

    const img = document.querySelector('#shopLogo');
    if (img && profile.logoUrl) {
      img.src = profile.logoUrl;
      img.alt = profile.name || profile.shortName || 'Logo';
    }

    const textMap = [
      ['#pageTitle', profile.pageTitle || `Agendar Hora | ${profile.name}`],
      ['#shopNombre', profile.name],
      ['#shopSlogan', profile.slogan],
      ['#shopClubNombre', profile.club],
      ['#shopDireccion', profile.address],
      ['#shopHorario', profile.scheduleText],
      ['#heroTitle', profile.heroTitle],
      ['#heroSubtitle', profile.heroSubtitle],
    ];

    textMap.forEach(([selector, value]) => {
      const node = document.querySelector(selector);
      if (node && value) node.textContent = value;
    });
  }

  function initThemeBindings() {
    if (!window.AppStore) return;
    window.AppStore.subscribe('theme', () => applyTenantTheme());
    window.AppStore.subscribe('profile', () => applyTenantTheme());
  }

  window.TenantTheme = {
    applyTenantTheme,
    initThemeBindings,
  };
})();
