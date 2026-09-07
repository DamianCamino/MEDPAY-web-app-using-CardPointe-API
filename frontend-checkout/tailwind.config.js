/** @type {import('tailwindcss').Config} */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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
