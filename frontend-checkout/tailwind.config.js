/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5c67ff',
          dark: '#4a54e1',
        },
        finance: '#dc2626',
      },
    },
  },
  plugins: [],
};
