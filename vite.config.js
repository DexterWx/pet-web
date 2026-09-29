import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 后端地址：默认本地 8000；可用环境变量 VITE_BACKEND 覆盖（便于对隔离端口/临时库联调）
const backend = process.env.VITE_BACKEND || 'http://127.0.0.1:8000'

// 管理后台 dev 服务：5173，/api 代理到后端（避免跨域，贴近生产 Nginx 反代）
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 临时：允许 cpolar 等公网临时域名访问（给人测试用）。
    // 正式上线路径改为 Nginx 同源托管 dist，不依赖此项，可删除或收紧为具体域名。
    allowedHosts: true,
    proxy: {
      '/api': {
        target: backend,
        changeOrigin: true,
      },
      // 本地图片存储（IMAGE_PROVIDER=local）走后端 /uploads 静态路由
      '/uploads': {
        target: backend,
        changeOrigin: true,
      },
    },
  },
})
