<template>
    <div class="layout">
        <div class="header">
            <div class="logo">
                <div class="title">DCMVIEWER</div>
            </div>
            <div class="nav-tools">
                <div class="tool-box" v-for="(item, index) in toolList" :key="index">
                    <SvgImg :imgSrc="item.path" :imgTitle="item.name" @onClick="onClickTool(item)" />
                </div>
            </div>
        </div>
        <div class="main">
            <div class="left">
                <UpLoad style="margin-top: 10px;" @change="onUpLoad"></UpLoad>
                <div class="list-box">
                    <ImgViewer v-for="(item, index) in totalUrls" :key="index" style="margin:0 auto;"
                        :indexNumber="index" :imageUrl="item" @onClick="onClickImg(index)">
                    </ImgViewer>
                </div>
            </div>
            <Viewport :currentImgIndex="currentImgIndex" :totalUrls="totalUrls"></Viewport>
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

const totalUrls = ref([]);
// 当前绑定工具[左键、滚轮、右键]
const currentTool = ref([null, "ZoomTool", null]);

const onUpLoad = (files) => {
    // 将 FileList 转换为数组
    const fileArray = Array.from(files);
    totalUrls.value = fileArray.map(file => URL.createObjectURL(file));
    console.log(totalUrls.value);
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
        name: '缩放',
        path: '/public/icon/放大_zoom.svg',
        toolName: 'ZoomTool'
    },
    {
        id: 1,
        name: '探针工具',
        path: '/public/icon/瞄准_aiming.svg',
        toolName: 'DragProbeTool'
    },
    {
        id: 2,
        name: '长度测量工具',
        path: '/public/icon/尺子_ruler.svg',
        toolName: 'LengthTool'
    },
    {
        id: 3,
        name: '角度测量工具',
        path: '/public/icon/角度_rotation-one.svg',
        toolName: 'AngleTool'
    },
    {
        id: 4,
        name: '矩形工具',
        path: '/public/icon/矩形_rectangle-one.svg',
        toolName: 'RectTool'
    }
]);

// 点击工具栏
const onClickTool = (tool) => {
    console.log(tool);
}

onMounted(() => {

});

</script>

<style scoped>
.layout {
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