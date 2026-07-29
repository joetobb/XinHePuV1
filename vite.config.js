import { defineConfig } from 'vite'

export default defineConfig({
  // 👇 必须和你的仓库名完全一致，带斜杠
  base: '/XinHePuV1/',
  resolve: {
    alias: {
      cesium: 'cesium/Build/Cesium'
    }
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify('/XinHePuV1/cesium')
  }
})
