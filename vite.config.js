import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'; // 引入插件

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteCommonjs(), // 使用插件
  ],
  //只在开发环境使用
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader'],
    include: ['dicom-parser'],
  },
  //构建的配置
  worker: {
    format: 'es',
  },
  // 别名
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
