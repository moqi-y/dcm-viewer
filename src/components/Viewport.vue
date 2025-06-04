<template>
    <div id="viewer"></div>
</template>

<script setup>
import { onMounted } from 'vue';
import { RenderingEngine, Enums, init as coreInit } from '@cornerstonejs/core';
import { init as dicomImageLoaderInit } from '@cornerstonejs/dicom-image-loader';


const init = async () => {
    // 初始化 CornerstoneJS 和加载器
    await coreInit();
    await dicomImageLoaderInit();

    // 获取元素
    const element = document.getElementById('viewer');

    // 创建 RenderingEngine
    const renderingEngineId = 'myRenderingEngine';
    const renderingEngine = new RenderingEngine(renderingEngineId);

    // 创建 Viewport
    const viewportId = 'CT_AXIAL_STACK'; //'MRI_SAGITTAL_STACK'：用于 MRI 的矢状位堆叠视图;'USG_DOPPLER_VIEW'：用于超声多普勒视图;'GENERAL_VIEWPORT'：通用视图;
    const viewportInput = {
        viewportId,
        element,
        type: Enums.ViewportType.STACK,
    };

    // 启用元素
    renderingEngine.enableElement(viewportInput);

    // 获取 Viewport 对象
    const viewport = renderingEngine.getViewport(viewportId);

    // 加载图像
    const imageId = 'wadouri:http://127.0.0.1:8080/image_5';
    const imageIds = [imageId]; // 将单个图像 ID 放入数组

    // 设置图像堆栈并渲染
    viewport.setStack(imageIds, 0); // 设置堆栈并显示第 0 张图像
    viewport.render();
}

onMounted(() => {
    init();
});

</script>

<style scoped>
#viewer {
    width: 800px;
    height: 500px;
}
</style>