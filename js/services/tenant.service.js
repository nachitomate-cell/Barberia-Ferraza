(() => {
  'use strict';

  function svgLogoDataUrl(label, bgColor, textColor) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
        <rect width="240" height="240" rx="120" fill="${bgColor}" />
        <circle cx="120" cy="120" r="100" fill="none" stroke="${textColor}" stroke-width="4" opacity="0.35" />
        <text x="120" y="133" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="56" font-weight="700" fill="${textColor}">${label}</text>
      </svg>
    `.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function getMockTenantConfig(tenantId) {
    const fallbackMap = {
      ferraza: {
        profile: {
          name: 'Barberia Ferraza',
          shortName: 'Ferraza',
          slogan: 'El cambio comienza por ti',
          club: 'Club Ferraza',
          address: 'Av. Libertad 63 / Local 28',
          scheduleText: 'Lun a Sab 10:00 - 20:00 hrs.',
          phone: '56994269228',
          logoUrl: '/logo.jpg',
          pageTitle: 'Agendar Hora | Barberia Ferraza',
          metaDescription: 'Reserva tu hora en Barberia Ferraza. Cortes, barba y mas. Elige tu barbero, servicio y horario en segundos.',
          heroTitle: 'Que servicio buscas?',
          heroSubtitle: 'Reserva tu hora en segundos',
          shopCompat: {
            nombre: 'Barberia Ferraza',
            nombreCorto: 'Ferraza',
            slogan: 'El cambio comienza por ti',
            logo: '/logo.jpg',
            direccion: 'Av. Libertad 63 / Local 28',
            horario: 'Lun a Sab 10:00 - 20:00 hrs.',
            telefono: '56994269228',
            club: 'Club Ferraza',
            barberos: [
              { nombre: 'Nicolas Fabian', foto: '/Fabian.png', disponible: true }
            ],
          },
        },
        theme: {
          colorBg: '#050505',
          colorSurface: '#0a0a0d',
          colorSurfaceAlt: '#121217',
          colorPrimary: '#ffffff',
          colorAccent: '#d4d4d8',
          colorText: '#f8fafc',
          colorMuted: '#a1a1aa',
          colorBorder: 'rgba(255,255,255,0.14)',
          colorGlow: 'rgba(255,255,255,0.22)',
          colorButtonText: '#ffffff',
          colorProgressTrack: '#1a1a24',
        },
      },
    };

    return fallbackMap[tenantId] || fallbackMap.ferraza;
  }

  async function fetchTenantConfig(tenantId) {
    const fallback = getMockTenantConfig(tenantId);
    let profileData = null;
    let themeData = null;
    let source = 'mock';

    try {
      if (typeof db !== 'undefined') {
        const profileRef = db.collection('tenants').doc(tenantId).collection('profile').doc('main');
        const themeRef = db.collection('tenants').doc(tenantId).collection('settings').doc('theme');

        const [profileSnap, themeSnap] = await Promise.all([
          profileRef.get(),
          themeRef.get(),
        ]);

        if (profileSnap.exists) profileData = profileSnap.data();
        if (themeSnap.exists) themeData = themeSnap.data();
        if (profileData || themeData) source = 'firestore';
      }
    } catch (error) {
      console.warn(`[TenantService] Firestore no disponible para "${tenantId}", usando fallback:`, error.message);
    }

    const result = {
      tenantId,
      source,
      profile: {
        ...fallback.profile,
        ...(profileData || {}),
      },
      theme: {
        ...fallback.theme,
        ...(themeData || {}),
      },
    };

    if (window.AppStore) {
      window.AppStore.setState({
        tenantId,
        profile: result.profile,
        theme: result.theme,
        tenantConfigSource: result.source,
      });
    }

    return result;
  }

  window.TenantService = {
    fetchTenantConfig,
    getMockTenantConfig,
  };
})();
