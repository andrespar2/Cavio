/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amoled: '#000000',
        deep: '#050505',
        surface: '#0A0A0A',
        surface2: '#111111',
        surface3: '#171717',
        line: 'rgba(255,255,255,0.08)',
        lime: '#C6F36B',
        'lime-dim': '#A9D953',
        muted: '#777777',
        soft: '#E8E8E8',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'Inter',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
        '4xl': '2rem',
      },
      boxShadow: {
        glass: '0 20px 60px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)',
        soft: '0 10px 30px -12px rgba(0,0,0,0.8)',
        lime: '0 10px 40px -12px rgba(198,243,107,0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.2,.8,.2,1) both',
        'fade-in': 'fade-in .25s ease-out both',
        'slide-up': 'slide-up .38s cubic-bezier(.2,.8,.2,1) both',
        'pulse-soft': 'pulseSoft 1.8s ease-in-out infinite',
      },
      screens: {
        xs: '360px',
        '3xl': '1800px',
      },
    },
  },
  plugins: [],
}
