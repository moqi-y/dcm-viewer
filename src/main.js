import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import { init as coreInit } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';
import { init as cornerstoneToolsInit } from '@cornerstonejs/tools';

// 创建并挂载应用  
const app = createApp(App);
const pinia = createPinia()
// 初始化 cornerstone相关库
coreInit();
dicomImageLoaderInit();
cornerstoneToolsInit();

app.use(pinia);
app.mount('#app');
