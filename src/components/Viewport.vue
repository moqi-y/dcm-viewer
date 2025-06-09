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
    LengthTool,
    DragProbeTool,
    AngleTool,
    RectangleROITool,
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

// 初始化工具组
const toolGroupId = 'ctToolGroup';
toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

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


    addTool(ZoomTool);
    addTool(WindowLevelTool);
    addTool(DragProbeTool);
    addTool(LengthTool);
    addTool(AngleTool);
    addTool(RectangleROITool);
    toolGroup.addTool(ZoomTool.toolName);
    toolGroup.addTool(WindowLevelTool.toolName);
    toolGroup.addTool(DragProbeTool.toolName);
    toolGroup.addTool(LengthTool.toolName);
    toolGroup.addTool(AngleTool.toolName);
    toolGroup.addTool(RectangleROITool.toolName);

    // 添加工具组到渲染引擎
    toolGroup.addViewport(viewportId, renderingEngineId);

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

const toolMapping = {
    'ZoomTool': ZoomTool.toolName,
    'WindowLevelTool': WindowLevelTool.toolName,
    'LengthTool': LengthTool.toolName, // 假设 LengthTool 是另一个工具
    'DragProbeTool': DragProbeTool.toolName,
    'AngleTool': AngleTool.toolName,
    'RectangleROITool': RectangleROITool.toolName,
};

//绑定工具
const activeTool = (toolNameSet) => {
    // 设置工具绑定
    // WindowLevelTool、ZoomTool、LengthTool
    console.log("toolMapping[toolNameSet]:", toolMapping[toolNameSet]);

    toolGroup.setToolActive(toolMapping[toolNameSet], {
        bindings: [
            {
                mouseButton: csToolsEnums.MouseBindings.Primary, // 鼠标左键
            },
        ],
    });
    // toolGroup.setToolActive(toolMapping[toolNameSet[1]], {
    //     bindings: [
    //         {
    //             mouseButton: csToolsEnums.MouseBindings.Wheel, // 鼠标滚轮
    //         },
    //     ],
    // });
    // toolGroup.setToolActive(toolMapping[toolNameSet[2]], {
    //     bindings: [
    //         {
    //             mouseButton: csToolsEnums.MouseBindings.Secondary, // 鼠标右键
    //         },
    //     ]
    // })

}

// 解绑工具
const deactiveTool = () => {
    Object.keys(toolMapping).forEach((toolName) => {
        toolGroup.setToolPassive(toolMapping[toolName]);
    });
}

// 清除所有标记
const clearAllMark = () => {
    Object.keys(toolMapping).forEach((toolName) => {
        toolGroup.setToolDisabled(toolMapping[toolName]);
    });
}


// 暴露方法
defineExpose({
    activeTool,
    deactiveTool,
    clearAllMark
})

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