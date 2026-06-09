/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF6F1',
        surface: {
          DEFAULT: '#F4EDE3',
          raised: '#EFE5D6',
          overlay: '#FDFAF6',
        },
        ink: {
          DEFAULT: '#1C1410',
          2: '#4A3728',
          3: '#7A6358',
          4: '#A89080',
        },
        line: {
          DEFAULT: '#DDD4CB',
          soft: '#EBE5DF',
          strong: '#C4B8AE',
        },
        price: {
          DEFAULT: '#C47A1E',
          subtle: '#FBF0DC',
          muted: '#D4A843',
          hover: '#A36416',
        },
        profit: {
          DEFAULT: '#1A5C3A',
          subtle: '#E8F5EE',
          hover: '#145030',
        },
        danger: {
          DEFAULT: '#922B1D',
          subtle: '#FDECEB',
          hover: '#7A2418',
        },
      },
    },
  },
  plugins: [],
}