import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/ - Updated for GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: '/kishna-attendance-tracker/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  }
})
