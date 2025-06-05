<template>
    <div style="width: 200px;height: 200px;" :id="`preview${indexNumber}`"></div>
</template>

<script setup>
import { onMounted } from 'vue';
import { RenderingEngine, Enums, init as coreInit } from '@cornerstonejs/core';

const props = defineProps({
    imageUrl: String,
    indexNumber: {
        type: Number,
        default: 0,
    },
})

// 初始化 CornerstoneJS 和加载器
coreInit();




// 创建全局的 RenderingEngine
const renderingEngineId = 'preRenderingEngine';
let renderingEngine;

// 确保 RenderingEngine 只初始化一次
if (!window.cornerstoneRenderingEngine) {
    renderingEngine = new RenderingEngine(renderingEngineId);
    window.cornerstoneRenderingEngine = renderingEngine;
} else {
    renderingEngine = window.cornerstoneRenderingEngine;
}

const init = async () => {
    // 获取元素
    const element = document.getElementById(`preview${props.indexNumber}`);

    // 创建 ViewportID
    const viewportId = `CT_AXIAL_STACK_${props.indexNumber}`; //'MRI_SAGITTAL_STACK'：用于 MRI 的矢状位堆叠视图;'USG_DOPPLER_VIEW'：用于超声多普勒视图;'GENERAL_VIEWPORT'：通用视图;
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
    const imageId = 'wadouri:' + props.imageUrl;
    const imageIds = [imageId]; // 将单个图像 ID 放入数组

    // 设置图像堆栈并渲染
    viewport.setStack(imageIds, 0); // 设置堆栈并显示第 0 张图像
    viewport.render();
}


onMounted(async() => {
    init();
});

</script>

<style scoped>
#preview {
    width: 80px;
    height: 80px;
}
</style>