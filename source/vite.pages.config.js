import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { rtlTextAlias, plyrSpriteAlias } from './rtlTextAlias.js';

// This config is copied beside TREK's unchanged client config by build-trek.mjs.
// A separate entry/output keeps the local full TREK application unchanged.
export default defineConfig({
  base: '/kansai-trip/',
  publicDir: false,
  plugins: [react()],
  define: { __TREK_UI_VERSION__: JSON.stringify('5.1.0-static') },
  resolve: { alias: [
    rtlTextAlias, plyrSpriteAlias,
  ] },
  build: {
    outDir: '../../github-pages-trek',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    rolldownOptions: { input: 'pages.html' },
  },
});
