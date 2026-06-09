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
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Impact', 'sans-serif'],
        body:    ['Nunito', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
