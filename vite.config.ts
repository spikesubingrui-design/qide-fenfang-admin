import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 部署时 base 为仓库名
const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [react()],
  base: isProduction ? '/qide-fenfang-admin/' : '/',
  server: {
    port: 8000,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true }
    }
  }
})
