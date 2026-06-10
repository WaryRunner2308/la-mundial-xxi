/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        verde: {
          50:  '#e6f8ee',
          100: '#c2edcf',
          200: '#89dca7',
          300: '#4fc97e',
          400: '#1ebb60',
          500: '#009A3A',
          600: '#007b2e',
          700: '#005c23',
          800: '#003d17',
          900: '#001f0c',
        },
        vermelho: {
          50:  '#fce8ec',
          100: '#f8c2cb',
          200: '#f19099',
          300: '#e85c6b',
          400: '#df2f3e',
          500: '#C8102E',
          600: '#a00d25',
          700: '#78091c',
          800: '#500612',
          900: '#280309',
        },
        surface: {
          DEFAULT: '#161b22',
          raised:  '#1c2128',
          overlay: '#21262d',
        },
        bg: {
          base: '#0d1117',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Impact', 'sans-serif'],
        body:    ['Nunito', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'verde':     '0 0 20px rgba(0,154,58,0.25), 0 4px 12px rgba(0,0,0,0.4)',
        'verde-lg':  '0 0 40px rgba(0,154,58,0.4), 0 8px 24px rgba(0,0,0,0.5)',
        'vermelho':  '0 0 20px rgba(200,16,46,0.3), 0 4px 12px rgba(0,0,0,0.4)',
        'glass':     '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card':      '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
}
