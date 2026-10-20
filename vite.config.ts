import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Bind explicitly to IPv4 + IPv6 loopback. On some Windows setups Vite's
    // default "localhost" binding resolves to ::1 only, so a browser that
    // resolves localhost -> 127.0.0.1 gets ERR_CONNECTION_REFUSED even
    // though the dev server is running.
    host: true,
  },
})
