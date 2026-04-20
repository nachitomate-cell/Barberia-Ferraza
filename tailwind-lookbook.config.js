/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './lookbook.html'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#FAFAFA',
          text: '#111827',
          accent: '#10B981',
          accentDark: '#047857'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-slide-up': 'fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  }
}
