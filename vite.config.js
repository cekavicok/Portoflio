import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const r = (p) => resolve(import.meta.dirname, p);

export default defineConfig({
  // Relative asset URLs, so the built site works from any path:
  // a domain root, a /portfolio/ subfolder, or file://.
  base: './',

  server: {
    port: 5173,
    open: true,
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Every page needs an entry here. Add new pages to this list.
      input: {
        home: r('index.html'),
        cv: r('cv.html'),
        about: r('about.html'),
        projects: r('projects/index.html'),
        loremEngine: r('projects/lorem-engine.html'),
        ipsumDashboard: r('projects/ipsum-dashboard.html'),
        dolorCli: r('projects/dolor-cli.html'),
      },
    },
  },
});
