import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : l'appli fonctionne quel que soit le sous-dossier d'hébergement
// (GitHub Pages sert le site sous /<nom-du-repo>/).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
});
