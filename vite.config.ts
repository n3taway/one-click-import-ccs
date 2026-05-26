import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** Vite 配置：纯静态 Vue 站点，供 Vercel 构建部署 */
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist'
  }
})
