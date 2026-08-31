import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El backend sirve esta app en /checkout (express.static montado en esa ruta),
// asi que todos los assets deben resolver bajo ese prefijo.
export default defineConfig({
  base: '/checkout/',
  plugins: [react()],
  build: {
    outDir: '../backend/public/checkout',
    // IMPORTANTE: false. public/checkout tambien contiene manage.html,
    // manage.js, setup.html, ghl-mock.html, ghl-sso.js y logo.svg — archivos
    // de administracion/instalacion de GHL que NO son parte de este build de
    // Vite. emptyOutDir:true los borraria en cada `npm run build`.
    emptyOutDir: false,
  },
  server: {
    port: 5173,
    proxy: {
      // En desarrollo, proxear las llamadas de API al backend real (puerto 3000)
      '/checkout/config': 'http://localhost:3000',
      '/checkout/pay': 'http://localhost:3000',
      '/alphaeon': 'http://localhost:3000',
    },
  },
});
