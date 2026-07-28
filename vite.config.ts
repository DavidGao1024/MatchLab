import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署在 /MatchLab/ 子路径（base = 实际仓库名，图纸 Phase 0 步骤 7）
  base: '/MatchLab/',
  plugins: [vue(), tailwindcss()],
  server: { host: true },
})
