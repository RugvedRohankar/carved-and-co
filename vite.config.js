import { defineConfig } from 'vite';
import { STORE_URL } from './src/store.js';

// The site is served from https://<user>.github.io/etched-in-oak/ on GitHub Pages.
export default defineConfig({
  base: '/etched-in-oak/',
  plugins: [
    {
      name: 'store-url',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) => html.replaceAll('%STORE_URL%', STORE_URL),
      },
    },
  ],
});
