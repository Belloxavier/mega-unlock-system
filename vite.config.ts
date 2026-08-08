import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Separa el vendor (React/Supabase, cambian poco) del código propio
        // (cambia en cada deploy) — así Chrome no tiene que re-descargar el
        // vendor completo cada vez que se sube un cambio chico, en PC y
        // sobre todo en celular con datos móviles.
        manualChunks(id: string) {
          if (id.includes('node_modules') && (id.includes('react') || id.includes('@supabase'))) {
            return 'vendor';
          }
        },
      },
    },
  },
});