import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    deps: {
      interopDefault: true,
    },
    environmentMatchGlobs: [
      ['src/__tests__/ui/**', 'jsdom'],
      ['src/__tests__/**', 'node'],
    ],
    setupFiles: ['./src/__tests__/setup.ts', './src/__tests__/ui/setup.ts'],
  },
})
