import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        brand: {
          primary: '#FF8FAB',
          secondary: '#FFD6E0',
          accent: '#FFB3C6',
          bg: '#FFF5F7',
          dark: '#C97B98',
          text: '#4A2533',
        },
      },
      borderRadius: {
        '2xl': '0.875rem',
        '3xl': '1.25rem',
        '4xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 2px 20px -3px rgba(255,143,171,0.25)',
        card: '0 4px 24px -4px rgba(255,143,171,0.18)',
        glow: '0 0 24px rgba(255,143,171,0.4)',
      },
      backgroundImage: {
        'pink-gradient': 'linear-gradient(135deg, #FFF5F7 0%, #FFE8F0 100%)',
        'hero-gradient': 'linear-gradient(160deg, #FFD6E0 0%, #FFF5F7 60%)',
        'card-gradient': 'linear-gradient(135deg, #FFFFFF 0%, #FFF0F5 100%)',
      },
    },
  },
  plugins: [],
}

export default config
