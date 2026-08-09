import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: {
    plugins: [externalizeDepsPlugin()],
    // Un preload « sandbox » ne peut pas charger de vrai module ESM : piège
    // déjà payé sur Ohmnia, voir APP/CONTEXTE.md.
    build: { rollupOptions: { output: { format: 'cjs', entryFileNames: 'index.js' } } }
  },
  renderer: {
    root: resolve('src/renderer'),
    build: { rollupOptions: { input: resolve('src/renderer/index.html') } },
    plugins: [react()]
  }
})
