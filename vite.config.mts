import { defineConfig } from 'vite'
import rails from 'vite-plugin-rails'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3036,
  },
  plugins: [
    rails(),
  ]
})