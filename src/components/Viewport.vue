<template>
    <div id="viewer"></div>
</template>

<script setup>
import { onMounted } from 'vue';
import { RenderingEngine, Enums} from '@cornerstonejs/core';
import {
    ToolGroupManager,
    WindowLevelTool,
    ZoomTool,
    Enums as csToolsEnums,
    addTool,
} from '@cornerstonejs/tools'; // 引入 cornerstoneTools


const init = async () => {

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
    const imageURL = 'http://127.0.0.1:8080/image_5';
    const imageId = 'wadouri:'+ imageURL;
    const imageIds = [imageId]; // 将单个图像 ID 放入数组

    /** 添加窗位窗宽工具 */
    element.oncontextmenu = (e) => e.preventDefault(); // 阻止默认的右键菜单
    const toolGroupId = 'ctToolGroup';
    const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
    addTool(ZoomTool);
    addTool(WindowLevelTool);
    toolGroup.addTool(ZoomTool.toolName);
    toolGroup.addTool(WindowLevelTool.toolName);

    toolGroup.addViewport(viewportId, renderingEngineId);

    /**
     * Primary: 鼠标左键
     * Secondary: 鼠标右键
     * Auxiliary: 鼠标中键
     * Wheel: 鼠标滚轮
     * Primary_And_Secondary：鼠标左键和右键同时按下
     */
    // 缩放工具
    toolGroup.setToolActive(ZoomTool.toolName, {
        bindings: [
            {
                mouseButton: csToolsEnums.MouseBindings.Wheel, // 鼠标滚轮
            },
        ]
    });
    // 窗宽窗位工具
    toolGroup.setToolActive(WindowLevelTool.toolName, {
        bindings: [
            {
                mouseButton: csToolsEnums.MouseBindings.Primary,  // 鼠标左键
            },
        ]
    });

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
    width: 100%;
    height: calc(100vh - 100px);
}
</style>