import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      '@design': resolve(__dirname, 'src/design'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@games': resolve(__dirname, 'src/games'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@updaters': resolve(__dirname, 'src/updaters'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
