<template>
    <div id="viewer"></div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { RenderingEngine, Enums } from '@cornerstonejs/core';
import {
    ToolGroupManager,
    WindowLevelTool,
    ZoomTool,
    Enums as csToolsEnums,
    addTool,
} from '@cornerstonejs/tools'; // 引入 cornerstoneTools

const props = defineProps({
    currentImgIndex: Number,
    totalUrls: Array,
});

const renderingEngineId = 'myRenderingEngine';
const viewportId = 'CT_AXIAL_STACK';

let renderingEngine;
let viewport;
let toolGroup;

const init = async () => {
    // 获取元素
    const element = document.getElementById('viewer');

    // 创建 RenderingEngine
    renderingEngine = new RenderingEngine(renderingEngineId);

    // 创建 Viewport
    const viewportInput = {
        viewportId,
        element,
        type: Enums.ViewportType.STACK,
    };

    // 启用元素
    renderingEngine.enableElement(viewportInput);

    // 获取 Viewport 对象
    viewport = renderingEngine.getViewport(viewportId);

    // 初始化工具组
    const toolGroupId = 'ctToolGroup';
    toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
    addTool(ZoomTool);
    addTool(WindowLevelTool);
    toolGroup.addTool(ZoomTool.toolName);
    toolGroup.addTool(WindowLevelTool.toolName);

    toolGroup.addViewport(viewportId, renderingEngineId);

    // 设置工具绑定
    toolGroup.setToolActive(ZoomTool.toolName, {
        bindings: [
            {
                mouseButton: csToolsEnums.MouseBindings.Wheel, // 鼠标滚轮
            },
        ],
    });
    toolGroup.setToolActive(WindowLevelTool.toolName, {
        bindings: [
            {
                mouseButton: csToolsEnums.MouseBindings.Primary, // 鼠标左键
            },
        ],
    });

    // 首次渲染图片
    renderImage();
};

const renderImage = () => {
    if (!props.totalUrls || props.totalUrls.length === 0) {
        console.warn('No image URLs provided');
        return;
    }

    // 获取当前图片的 imageId
    const imageId = 'wadouri:' + props.totalUrls[props.currentImgIndex];
    const imageIds = [imageId]; // 将单个图像 ID 放入数组

    // 设置图像堆栈并渲染
    viewport.setStack(imageIds, 0); // 设置堆栈并显示第 0 张图像
    viewport.render();
};

watch(() => props.currentImgIndex, (newVal, oldVal) => {
    if (newVal !== undefined && newVal !== null) {
        // 当当前图片索引更改时，重新渲染图片
        renderImage();
    }
});

onMounted(() => {
    init();
});

</script>

<style scoped>
#viewer {
    width: 100%;
    height: calc(100vh - 100px);
}
</style>