<template>
    <div
        ref="containerRef"
        class="img-container"
        :class="{ 'img-container--active': isActive }"
        :title="`第 ${indexNumber + 1} 张`"
    >
        <!-- 未滚动到可视区域时先不渲染，等 IntersectionObserver 触发再解码 -->
        <div v-if="!shouldLoad" class="img-placeholder"></div>

        <template v-else>
            <img
                v-if="imgData"
                :src="imgData"
                :alt="`dicom image ${indexNumber + 1}`"
                @click="$emit('onClick', indexNumber)"
                @load="isDecoding = false"
            />
            <div v-else-if="isDecoding" class="img-status">
                <span class="img-spinner"></span>
            </div>
            <div v-else class="img-status img-status--error" :title="errorMessage">
                <img class="img-error-icon" src="/icon/error-icon.svg" alt="error" />
                <span class="img-error-text">{{ errorMessage || '无法解析' }}</span>
            </div>
        </template>

        <div class="img-index">{{ indexNumber + 1 }}</div>

        <div class="delete-wrap" @click.stop="$emit('deleteImage', indexNumber)">
            <SvgImg imgSrc="/icon/删除_delete-one-red.svg" imgTitle="删除" />
        </div>
    </div>
</template>

<script setup>
/**
 * 切片缩略图。
 *
 * 原实现有三个问题：
 *  1. 每个组件 onMounted 就立刻把 DICOM 解成 base64，200 张切片会一次性
 *     在主线程上跑 200 次解析+编码，界面直接卡住。改成滚动到可视区域再解码。
 *  2. 没有错误状态，解析失败就是一片空白，用户不知道是文件坏了还是程序坏了。
 *  3. taggleLoading() 操作的是全局同一个 div，几十个缩略图并发解码时
 *     互相把对方的 loading 关掉，闪烁。
 */
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import dicomToBase64 from '@/utils/dicomToBase64.js';
import SvgImg from '@/components/SvgImg.vue';

const props = defineProps({
    imageUrl: { type: String, required: true },
    indexNumber: { type: Number, required: true },
    isActive: { type: Boolean, default: false },
});

defineEmits(['onClick', 'deleteImage']);

const containerRef = ref(null);
const shouldLoad = ref(false);
const imgData = ref(null);
const isDecoding = ref(false);
const errorMessage = ref('');

let observer = null;
/** 每次 imageUrl 变化自增，用来丢弃上一次解码的过期结果 */
let requestToken = 0;

const setImgData = async (url) => {
    if (!url) return;

    const token = ++requestToken;
    isDecoding.value = true;
    errorMessage.value = '';
    imgData.value = null;

    try {
        const base64 = await dicomToBase64(url);
        // url 可能在解码过程中被换掉，丢弃过期结果
        if (token !== requestToken) return;
        imgData.value = base64;
    } catch (error) {
        if (token !== requestToken) return;
        console.error(`[ImgViewer] 第 ${props.indexNumber + 1} 张解析失败`, error);
        errorMessage.value = error?.message || '解析失败';
    } finally {
        if (token === requestToken) {
            isDecoding.value = false;
        }
    }
};

const startLoad = () => {
    shouldLoad.value = true;
    setImgData(props.imageUrl);
};

onMounted(async () => {
    // 元素还没布局时 IntersectionObserver 拿不到正确的可视状态，等一拍
    await nextTick();
    if (typeof IntersectionObserver === 'undefined') {
        startLoad();
        return;
    }
    observer = new IntersectionObserver(
        (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                observer?.disconnect();
                observer = null;
                startLoad();
            }
        },
        { rootMargin: '200px' }
    );
    if (containerRef.value) {
        observer.observe(containerRef.value);
    }
});

onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    // 让在途的解码结果作废
    requestToken += 1;
});

// 列表项被复用（比如删除后重新排序）时同步换图
watch(
    () => props.imageUrl,
    (url) => {
        if (shouldLoad.value) {
            setImgData(url);
        }
    }
);
</script>

<style scoped>
.img-container {
    position: relative;
    width: 100%;
    margin: 0 0 8px;
    border: 2px solid transparent;
    border-radius: 6px;
    overflow: hidden;
    background: #000;
    transition: border-color 0.15s ease;
}

.img-container--active {
    border-color: #50a5f5;
}

/* 未加载时先占位，避免列表高度乱跳 */
.img-placeholder {
    width: 100%;
    aspect-ratio: 1 / 1;
    background: #12172a;
}

img {
    display: block;
    width: 100%;
    aspect-ratio: 1 / 1;
    object-fit: contain;
    cursor: pointer;
}

.img-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 100%;
    aspect-ratio: 1 / 1;
    font-size: 11px;
    color: #56617a;
    padding: 6px;
    text-align: center;
}

.img-error-icon {
    width: 20px;
    height: 20px;
    aspect-ratio: auto;
    cursor: default;
}

.img-error-text {
    /* 错误原因可能很长，截断显示，完整内容在 title 里 */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-all;
    color: #ef6a6a;
}

.img-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.15);
    border-top-color: #50a5f5;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.img-index {
    position: absolute;
    left: 4px;
    bottom: 4px;
    padding: 0 5px;
    font-size: 11px;
    line-height: 16px;
    color: #fff;
    background: rgba(0, 0, 0, 0.55);
    border-radius: 3px;
    pointer-events: none;
}

/* 外层只负责定位和背景，点击委托给它，避免和 SvgImg 自身的样式打架 */
.delete-wrap {
    position: absolute;
    top: 2px;
    right: 2px;
    padding: 2px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.4);
    z-index: 2;
    cursor: pointer;
}

.delete-wrap:hover {
    background: rgba(0, 0, 0, 0.65);
}

.delete-wrap :deep(.box) {
    width: 16px;
    height: 16px;
    padding: 0;
}
</style>