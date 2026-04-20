/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './*.html',
    './instancia-2/*.html'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#050505',
          text: '#f8fafc',
          accent: '#ffffff',
          accentDark: '#e2e8f0',
          card: '#111115',
          border: '#1f2937',
          neon: '#ffffff'
        },
        admin: {
          bg: '#111827',
          card: '#1F2937',
          accent: '#34D399',
          border: '#374151'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-slide-up': 'fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'neon-pulse': 'neonPulse 3s infinite',
        'fade-up': 'fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'stamp-pop': 'stampPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
      },
      keyframes: {
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        neonPulse: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255,255,255,0.1)' },
          '50%': { boxShadow: '0 0 15px rgba(255,255,255,0.3)' },
        },
        stampPop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '70%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    }
  }
}
