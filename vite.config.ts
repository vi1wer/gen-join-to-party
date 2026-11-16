import { defineConfig } from 'vite'

export default defineConfig({
  // On GitHub Pages the site lives under /gen-join-to-party/
  base: process.env.GITHUB_ACTIONS ? '/gen-join-to-party/' : '/',
  server: {
    host: true,
    port: 5173,
  },
})
