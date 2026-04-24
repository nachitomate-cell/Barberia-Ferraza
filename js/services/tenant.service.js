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
          logoUrl: 'logo.jpg',
          pageTitle: 'Agendar Hora | Barberia Ferraza',
          metaDescription: 'Reserva tu hora en Barberia Ferraza. Cortes, barba y mas. Elige tu barbero, servicio y horario en segundos.',
          heroTitle: 'Que servicio buscas?',
          heroSubtitle: 'Reserva tu hora en segundos',
          shopCompat: {
            nombre: 'Barberia Ferraza',
            nombreCorto: 'Ferraza',
            slogan: 'El cambio comienza por ti',
            logo: 'logo.jpg',
            direccion: 'Av. Libertad 63 / Local 28',
            horario: 'Lun a Sab 10:00 - 20:00 hrs.',
            telefono: '56994269228',
            club: 'Club Ferraza',
            barberos: [
              { nombre: 'Nicolas Fabian', foto: 'Fabian.png', disponible: true }
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
      navaja: {
        profile: {
          name: 'El Club de la Navaja',
          shortName: 'Navaja',
          slogan: 'Precision clasica, energia urbana',
          club: 'Club Navaja',
          address: 'Providencia 2451, Santiago',
          scheduleText: 'Mar a Dom 11:00 - 22:00 hrs.',
          phone: '56911112222',
          logoUrl: svgLogoDataUrl('CN', '#111827', '#ef4444'),
          pageTitle: 'Agendar Hora | El Club de la Navaja',
          metaDescription: 'Reserva tu cita en El Club de la Navaja. Multi barberos, estilo clasico y agenda rapida.',
          heroTitle: 'Que servicio buscas?',
          heroSubtitle: 'Reserva en el club correcto',
          shopCompat: {
            nombre: 'El Club de la Navaja',
            nombreCorto: 'Navaja',
            slogan: 'Precision clasica, energia urbana',
            logo: svgLogoDataUrl('CN', '#111827', '#ef4444'),
            direccion: 'Providencia 2451, Santiago',
            horario: 'Mar a Dom 11:00 - 22:00 hrs.',
            telefono: '56911112222',
            club: 'Club Navaja',
            barberos: [
              { nombre: 'Diego Rojas', foto: svgLogoDataUrl('DR', '#1e293b', '#60a5fa'), disponible: true }
            ],
          },
        },
        theme: {
          colorBg: '#060b16',
          colorSurface: '#101827',
          colorSurfaceAlt: '#172033',
          colorPrimary: '#ef4444',
          colorAccent: '#60a5fa',
          colorText: '#eff6ff',
          colorMuted: '#9fb3c8',
          colorBorder: 'rgba(96,165,250,0.24)',
          colorGlow: 'rgba(239,68,68,0.24)',
          colorButtonText: '#f8fafc',
          colorProgressTrack: '#1d2940',
        },
      },
      'brows-kelly': {
        profile: {
          name: 'Brows Kelly',
          shortName: 'Kelly',
          slogan: 'Luxury brows and signature detail',
          club: 'Kelly Signature Club',
          address: 'Las Condes 4430, Santiago',
          scheduleText: 'Lun a Vie 09:30 - 19:30 hrs.',
          phone: '56933334444',
          logoUrl: svgLogoDataUrl('BK', '#2b2117', '#d4af72'),
          pageTitle: 'Agendar Hora | Brows Kelly',
          metaDescription: 'Agenda tu visita en Brows Kelly con branding premium y experiencia personalizada.',
          heroTitle: 'Que experiencia buscas?',
          heroSubtitle: 'Agenda beauty con identidad premium',
          shopCompat: {
            nombre: 'Brows Kelly',
            nombreCorto: 'Kelly',
            slogan: 'Luxury brows and signature detail',
            logo: svgLogoDataUrl('BK', '#2b2117', '#d4af72'),
            direccion: 'Las Condes 4430, Santiago',
            horario: 'Lun a Vie 09:30 - 19:30 hrs.',
            telefono: '56933334444',
            club: 'Kelly Signature Club',
            barberos: [
              { nombre: 'Kelly M.', foto: svgLogoDataUrl('KM', '#36281d', '#e9d3aa'), disponible: true }
            ],
          },
        },
        theme: {
          colorBg: '#120f0d',
          colorSurface: '#1f1915',
          colorSurfaceAlt: '#2a221d',
          colorPrimary: '#d4af72',
          colorAccent: '#f2dfbc',
          colorText: '#f7efe2',
          colorMuted: '#c6b49d',
          colorBorder: 'rgba(212,175,114,0.24)',
          colorGlow: 'rgba(212,175,114,0.24)',
          colorButtonText: '#fff8ef',
          colorProgressTrack: '#302720',
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
