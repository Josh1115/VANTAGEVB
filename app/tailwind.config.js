/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f97316',   // orange
        court: '#1e3a5f',     // deep navy (court color)
        surface: '#1e293b',   // dark slate
        bg: '#0f172a',        // app background
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'feedIn': {
          from: { opacity: '0', transform: 'translate(-50%, -8px)' },
          to:   { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        'win-flash': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
      },
      animation: {
        'fade-in':   'fade-in 150ms ease-out forwards',
        'feed-in':   'feedIn 0.2s ease-out forwards',
        'win-flash': 'win-flash 0.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
