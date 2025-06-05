<template>
    <div class="layout">
        <div class="header">
            <div class="logo">
                <div class="title">DCMVIEWER</div>
            </div>
            <div class="nav-tools">
                <div class="tool-box">工具1</div>
                <div class="tool-box">工具2</div>
                <div class="tool-box">工具3</div>
            </div>
        </div>
        <div class="main">
            <div class="left">
                <UpLoad style="margin-top: 10px;" @change="onUpLoad"></UpLoad>
                <div class="list-box">
                    <ImageView style="margin:0 auto 5px auto;" v-for="(item, index) in urls" :key="index"
                        :imageUrl="item" :indexNumber="index">
                    </ImageView>
                </div>
            </div>
            <Viewport></Viewport>
        </div>
        <div class="footer">
            <div class="footer-content">准备就绪</div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Viewport from '@/components/viewport.vue'
import ImageView from '@/components/ImageView.vue'
import UpLoad from '@/components/UpLoad.vue';

const urls = ref([])

const totalUrls = ref([])

const onUpLoad = async (files) => {
    // 将 FileList 转换为数组
    const fileArray = Array.from(files);
    totalUrls.value = fileArray.map(file => URL.createObjectURL(file));
    console.log("totalUrls", totalUrls.value);
    urls.value = totalUrls.value.slice(0, 10);
};

// 监听list-box的滚动条事件
const handleScroll = () => {
    const list = document.querySelector('.list-box');
    const listHeight = list.offsetHeight;
    const scrollTop = list.scrollTop;
    const scrollHeight = list.scrollHeight;

    if (scrollTop + listHeight >= scrollHeight - 400) {
        console.log('滚动到底部了');
        // 在这里添加加载更多图片的逻辑
        const newUrls = totalUrls.value.slice(urls.value.length, urls.value.length + 10);
        urls.value = [...urls.value, ...newUrls];
    }
};

onMounted(() => {
    const list = document.querySelector('.list-box');
    if (list) {
        // 监听 list-box 的滚动事件
        list.addEventListener('scroll', handleScroll);
    } else {
        console.error('Element with class .list-box not found');
    }
});

onUnmounted(() => {
    const list = document.querySelector('.list-box');
    list.removeEventListener('scroll', handleScroll);
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
    /* scrollbar-width: none; */
    /* Firefox 兼容*/
    /* -ms-overflow-style: none; */
    /* IE 10+ 兼容*/
}

.list-box::-webkit-scrollbar {
    /* display: none; */
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