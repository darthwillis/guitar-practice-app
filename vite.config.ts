/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works from a domain root or a GitHub Pages subpath.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
})
