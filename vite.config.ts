import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {SITE} from './site.config';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Fills %SITE_*% placeholders in index.html from site.config.ts.
      {
        name: 'site-config',
        transformIndexHtml: (html: string) =>
          html
            .replaceAll('%SITE_TITLE%', esc(SITE.title))
            .replaceAll('%SITE_DESCRIPTION%', esc(SITE.description))
            .replaceAll('%SITE_NAME%', esc(SITE.name))
            .replaceAll('%SITE_THEME%', esc(SITE.themeColor))
            .replaceAll('%SITE_THEME_URL%', encodeURIComponent(SITE.themeColor))
            .replaceAll('%SITE_INITIAL%', encodeURIComponent(SITE.name.charAt(0))),
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // Payment API (server/index.ts, `npm run dev:api`) runs beside Vite in development.
      proxy: { '/api': 'http://localhost:3001' },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
