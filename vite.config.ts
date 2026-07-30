import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // 개발 중에는 /api 를 백엔드로 프록시해 CORS 설정 없이 붙는다.
    // 백엔드: C:\work\dogether (Spring Boot, 기본 8080)
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
        configure: (proxy) => {
          /*
            브라우저는 same-origin 이어도 POST 에 Origin 헤더를 붙인다.
            백엔드 CORS 허용 목록(CORS_ALLOWED_ORIGINS)에 5173 이 없으면
            Spring 이 "Invalid CORS request" 로 403 을 낸다.
            프록시를 지난 뒤에는 실제로 서버 간 요청이므로 Origin 을 떼는 것이
            맞다. 백엔드 설정을 프론트 사정으로 바꾸지 않기 위한 선택이다.
          */
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin')
          })
        },
      },
    },
  },
})
