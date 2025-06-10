<template>
    <div id="layout">
        <div class="header">
            <div class="logo">
                <div class="title">DCMVIEWER</div>
            </div>
            <div class="nav-tools">
                <div class="tool-box" v-for="(item, index) in toolList" :key="index">
                    <SvgImg :imgSrc="item.path" :imgTitle="item.name" @onClick="onClickTool(item)" />
                </div>
                <SvgImg class="tool-box " imgSrc="/icon/擦除_erase.svg" imgTitle="擦除标记" @onClick="clearMarks" />
                <SvgImg class="tool-box " imgSrc="/icon/格式_format.svg" imgTitle="移除工具" @onClick="deactiveAllTools" />
            </div>
        </div>
        <div class="main">
            <div class="left">
                <UpLoad style="margin-top: 10px;" @change="onUpLoad"></UpLoad>
                <!-- 下载示例dcm -->
                 <a style="color: aliceblue;font-size: 12px;" href="/dcm/PATIENT_DICOM/image_100" download="DICOM示例.dcm">下载示例dcm文件</a>
                <div class="list-box">
                    <ImgViewer v-for="(item, index) in totalUrls" :key="index" style="margin:0 auto;"
                        :indexNumber="index" :imageUrl="item" @onClick="onClickImg(index)">
                    </ImgViewer>
                </div>
            </div>
            <Viewport ref="viewportRef" :currentImgIndex="currentImgIndex" :totalUrls="totalUrls"
                :currentTool="currentTool"></Viewport>
        </div>
        <div class="footer">
            <div class="footer-content">准备就绪</div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Viewport from '@/components/viewport.vue'
import UpLoad from '@/components/UpLoad.vue';
import ImgViewer from '@/components/ImgViewer.vue';
import SvgImg from '@/components/SvgImg.vue';

const viewportRef = ref(null);
const totalUrls = ref([]);
// 当前绑定工具[左键]
const currentTool = ref("");

const onUpLoad = (files) => {
    // 将 FileList 转换为数组
    const fileArray = Array.from(files);
    totalUrls.value = fileArray.map(file => URL.createObjectURL(file));
};

//当前查看图
const currentImgIndex = ref(null);

//点击预览图
const onClickImg = (index) => {
    console.log(index);
    currentImgIndex.value = index;
}

//工具栏
const toolList = ref([
    {
        id: 0,
        name: '缩放工具',
        path: '/icon/放大_zoom.svg',
        toolName: 'ZoomTool'
    },
    {
        id: 1,
        name: '窗位窗宽',
        path: '/icon/对比_contrast-view.svg',
        toolName: 'WindowLevelTool'
    },
    {
        id: 2,
        name: '探针工具',
        path: '/icon/瞄准_aiming.svg',
        toolName: 'DragProbeTool'
    },
    {
        id: 3,
        name: '长度测量工具',
        path: '/icon/尺子_ruler.svg',
        toolName: 'LengthTool'
    },
    {
        id: 4,
        name: '角度测量工具',
        path: '/icon/角度_rotation-one.svg',
        toolName: 'AngleTool'
    },
    {
        id: 5,
        name: '矩形工具',
        path: '/icon/矩形_rectangle-one.svg',
        toolName: 'RectangleROITool'
    }
]);

// 点击工具栏
const onClickTool = (tool) => {
    console.log(tool);
    console.log("viewportRef.value", viewportRef.value);
    currentTool.value = tool.toolName;
    viewportRef.value.activeTool(currentTool.value);
}
//解绑工具
const deactiveAllTools = () => {
    viewportRef.value.deactiveTool();
}

//擦除标记
const clearMarks = () => {
    viewportRef.value.clearAllMark();
}

onMounted(() => {
   
});

</script>

<style scoped>
#layout {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}


.header {
    width: 100%;
    height: 70px;
    background-color: #041C4A;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    color: aliceblue;
}

.logo {
    width: 20%;
}

.logo .title {
    color: white;
    font-size: 20px;
    font-weight: bold;
    line-height: 70px;
    margin-left: 20px;
}

.nav-tools {
    width: 80%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
}

.tool-box {
    margin: 0 20px;
}


.main {
    width: 100%;
    height: calc(100vh - 70px);
    display: flex;
    flex-direction: row;
}

.main .left {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    width: 20%;
    height: 100%;
    background-color: #090C2A;
    color: white;
}

.list-box {
    width: 90%;
    height: 94%;
    margin-top: 5%;
    overflow: scroll;
    overflow-x: hidden;
    text-align: center;
    scrollbar-width: none;
    /* Firefox 兼容*/
    -ms-overflow-style: none;
    /* IE 10+ 兼容*/
}

.list-box::-webkit-scrollbar {
    display: none;
    /* Chrome Safari 兼容*/
}

.footer {
    width: 100%;
    height: 30px;
    line-height: 30px;
    background-color: #041C4A;
    color: aliceblue;
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    bottom: 0;
    z-index: -1;
}

.footer-content {
    width: fit-content;
    height: 30px;
    position: absolute;
    bottom: 0;
    right: 0;
    transform: translateX(-50%);
    font-size: 12px;
    color: #6c757d;
}
</style>