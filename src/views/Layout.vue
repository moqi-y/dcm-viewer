<template>
    <div
        id="layout"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
    >
        <!-- 工具栏 -->
        <div class="header">
            <div class="logo">
                <div class="title">DCMVIEWER</div>
            </div>

            <div class="toolbar">
                <!-- 左键工具 -->
                <div class="toolbar-group">
                    <SvgImg
                        v-for="tool in toolList"
                        :key="tool.id"
                        :imgSrc="tool.icon"
                        :imgTitle="`${tool.name} (${tool.shortcut})`"
                        :isActive="currentTool === tool.toolName"
                        @onClick="onSelectTool(tool.toolName)"
                    />
                </div>

                <div class="toolbar-divider"></div>

                <!-- 视口操作 -->
                <div class="toolbar-group">
                    <SvgImg imgSrc="/icon/格式_format.svg" imgTitle="取消工具选择 (Esc)" @onClick="clearTool" />
                    <SvgImg imgSrc="/icon/擦除_erase.svg" imgTitle="清除所有标记" @onClick="clearMarks" />
                    <SvgImg imgSrc="/icon/重置_reset.svg" imgTitle="重置视口 (0)" @onClick="resetViewport" />
                    <SvgImg imgSrc="/icon/逆时针_rotate-left.svg" imgTitle="向左旋转 90° (,)" @onClick="rotate('left')" />
                    <SvgImg imgSrc="/icon/顺时针_rotate-right.svg" imgTitle="向右旋转 90° (.)" @onClick="rotate('right')" />
                    <SvgImg imgSrc="/icon/水平翻转_flip-horizontal.svg" imgTitle="水平翻转 (H)" @onClick="flip('horizontal')" />
                    <SvgImg imgSrc="/icon/垂直翻转_flip-vertical.svg" imgTitle="垂直翻转 (V)" @onClick="flip('vertical')" />
                    <SvgImg imgSrc="/icon/反色_invert.svg" imgTitle="反色 (I)" @onClick="toggleInvert" />
                </div>

                <div class="toolbar-divider"></div>

                <!-- 窗位窗宽预设 -->
                <select class="preset-select" :value="presetKey" @change="onPresetChange">
                    <option value="">窗位窗宽预设</option>
                    <option v-for="preset in windowPresets" :key="preset.key" :value="preset.key">
                        {{ preset.label }}
                    </option>
                    <option value="__reset">恢复原始窗宽窗位</option>
                </select>
            </div>
        </div>

        <!-- 主区域 -->
        <div class="main">
            <!-- 左侧切片列表 -->
            <div class="left">
                <UpLoad @change="onUpLoad" />

                <div class="left-actions">
                    <button class="sample-btn" :disabled="isLoadingSample" @click="loadSampleSeries">
                        {{ isLoadingSample ? '载入中…' : '载入示例序列' }}
                    </button>
                    <a class="sample-link" href="/dcm/PATIENT_DICOM/image_100" download="DICOM示例.dcm">
                        下载单张
                    </a>
                    <button v-if="totalUrls.length" class="clear-all" @click="clearAll">清空</button>
                </div>

                <div class="list-box">
                    <div v-if="!totalUrls.length" class="list-empty">暂无切片</div>
                    <ImgViewer
                        v-for="(item, index) in totalUrls"
                        :key="item"
                        :indexNumber="index"
                        :imageUrl="item"
                        :isActive="index === currentImgIndex"
                        @onClick="onClickImg(index)"
                        @deleteImage="deleteImage(index)"
                    />
                </div>
            </div>

            <!-- 影像视口 -->
            <div class="right">
                <Viewport
                    ref="viewportRef"
                    :currentImgIndex="currentImgIndex"
                    :totalUrls="totalUrls"
                    @update:currentImgIndex="onIndexChange"
                    @error="onViewportError"
                />
            </div>
        </div>

        <div class="footer">
            <span>{{ statusText }}</span>
        </div>

        <!-- 拖拽上传遮罩 -->
        <div v-if="isDragging" class="drop-mask">松开鼠标即可载入 DICOM 文件</div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import Viewport from '@/components/Viewport.vue';
import UpLoad from '@/components/UpLoad.vue';
import ImgViewer from '@/components/ImgViewer.vue';
import SvgImg from '@/components/SvgImg.vue';
import toast from '@/utils/toast';
import { clearDicomThumbnailCache } from '@/utils/dicomToBase64';
import { useViewerStore } from '@/store';
import { SELECTABLE_TOOLS, TOOL_SHORTCUTS, CT_WINDOW_PRESETS } from '@/config/tools';

const viewportRef = ref(null);
const presetKey = ref('');
const isDragging = ref(false);

const store = useViewerStore();
// storeToRefs 保持响应式，属性名按模板里用的别名映射
const {
    urls: totalUrls,
    currentIndex: currentImgIndex,
    activeTool: currentTool,
} = storeToRefs(store);

const toolList = computed(() => SELECTABLE_TOOLS);
const windowPresets = computed(() => CT_WINDOW_PRESETS);

const statusText = computed(() => {
    if (!totalUrls.value.length) return '准备就绪 · 支持拖拽文件到窗口载入';
    return `共 ${totalUrls.value.length} 张切片` +
        (currentImgIndex.value === null ? '' : ` · 当前第 ${currentImgIndex.value + 1} 张`);
});

/** 调用视口实例方法，视口还没挂载时安全跳过 */
const callViewport = (method, ...args) => {
    const instance = viewportRef.value;
    if (!instance || typeof instance[method] !== 'function') return;
    return instance[method](...args);
};

/* ------------------------------------------------------------------ *
 * 文件载入
 * ------------------------------------------------------------------ */

/**
 * 原实现直接 `totalUrls.value = fileArray.map(...)`，有两个问题：
 *  1. 旧的 blob URL 从来没有 revoke 过，重复载入几次就把内存撑爆。
 *  2. 载入后 currentImgIndex 不会重置，停留在 null，视口拿
 *     totalUrls[null] 当 imageId 去渲染，结果是黑屏。
 */
const loadFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file && file.size > 0);
    if (!files.length) {
        toast().showWarning('没有读取到有效文件');
        return;
    }

    releaseAllUrls();

    // setFiles 会把 currentIndex 和 activeTool 一起重置，
    // 视口随后收到空列表 + 新列表，重新建栈并停在第 0 张。
    store.setFiles(files.map((file) => URL.createObjectURL(file)));
    callViewport('clearActiveTool');
    clearDicomThumbnailCache();

    toast().showSuccess(`已载入 ${files.length} 个文件：${truncate(files[0].name)}`);
};

const onUpLoad = (files) => {
    loadFiles(files);
};

/** 拖拽上传 */
let dragDepth = 0;

/**
 * 一键载入仓库自带的示例序列。
 * 仓库里放了 public/dcm/PATIENT_DICOM/image_0 ~ image_211 共 212 张，
 * 之前只能在页面里下载其中一张，想看整套序列得自己去磁盘上选文件。
 * 这些是随代码一起提交的固定资源，所以切片数量直接写在这里；
 * 如果以后换了示例数据，改这一个常量即可。
 */
const SAMPLE_SLICE_COUNT = 212;
const SAMPLE_START_INDEX = 100;
const isLoadingSample = ref(false);

const loadSampleSeries = async () => {
    if (isLoadingSample.value) return;
    isLoadingSample.value = true;

    try {
        const base = '/dcm/PATIENT_DICOM/image_';
        // 先确认资源确实在，避免示例数据被删后还傻傻地载入 212 张空影像
        const probe = await fetch(`${base}0`, { method: 'HEAD' });
        if (!probe.ok) {
            throw new Error('示例数据不存在');
        }

        releaseAllUrls();
        clearDicomThumbnailCache();

        // 示例数据是同源 HTTP 地址，可以直接当 imageId 用，不需要转成 blob
        store.setFiles(Array.from({ length: SAMPLE_SLICE_COUNT }, (_, i) => `${base}${i}`));
        // 从中间开始比较符合阅片习惯
        store.select(SAMPLE_START_INDEX);
        callViewport('clearActiveTool');
        toast().showSuccess(`已载入示例序列（${SAMPLE_SLICE_COUNT} 张）`);
    } catch (error) {
        console.error('[Layout] 载入示例序列失败', error);
        toast().showError('示例数据载入失败');
    } finally {
        isLoadingSample.value = false;
    }
};

const onDragOver = () => {
    dragDepth += 1;
    isDragging.value = true;
};

const onDragLeave = () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) isDragging.value = false;
};

const onDrop = (event) => {
    dragDepth = 0;
    isDragging.value = false;
    const files = event.dataTransfer?.files;
    if (files && files.length) {
        loadFiles(files);
    }
};

/* ------------------------------------------------------------------ *
 * 切片选择 / 删除
 * ------------------------------------------------------------------ */

const onClickImg = (index) => {
    store.select(index);
};

/** 视口内滚轮翻页时回传同步 */
const onIndexChange = (index) => {
    store.select(index);
};

const onViewportError = (message) => {
    console.error('[Layout] 视口异常', message);
    toast().showError(message || '影像渲染异常');
};

/**
 * 删除切片。索引修正逻辑放在 store.removeImage 里，
 * 原实现只 splice 不动 currentImgIndex，删掉当前那张之后视口就错位了。
 */
const deleteImage = (index) => {
    const removed = store.removeImage(index);
    if (!removed) return;

    URL.revokeObjectURL(removed);
    clearDicomThumbnailCache();
    toast().showSuccess('删除成功');
};

const clearAll = () => {
    releaseAllUrls();
    store.clear();
    callViewport('clearActiveTool');
    clearDicomThumbnailCache();
    toast().showSuccess('已清空');
};

/** 释放所有 blob URL，避免内存泄漏 */
const releaseAllUrls = () => {
    totalUrls.value.forEach((url) => URL.revokeObjectURL(url));
};

/* ------------------------------------------------------------------ *
 * 工具栏
 * ------------------------------------------------------------------ */

const onSelectTool = (toolName) => {
    const next = store.toggleTool(toolName);
    callViewport('setActiveTool', next);
};

const clearTool = () => {
    store.clearTool();
    callViewport('clearActiveTool');
};

const clearMarks = () => callViewport('clearAnnotations');
const resetViewport = () => callViewport('resetViewport');
const rotate = (direction) => callViewport('rotate', direction);
const flip = (axis) => callViewport('flip', axis);
const toggleInvert = () => callViewport('toggleInvert');

const onPresetChange = (event) => {
    const value = event.target.value;
    presetKey.value = value;
    if (!value) return;
    if (value === '__reset') {
        callViewport('resetWindowLevel');
    } else {
        callViewport('applyWindowPreset', value);
    }
    // 让用户重新选一次，不保留高亮
    event.target.value = '';
    presetKey.value = '';
};

/* ------------------------------------------------------------------ *
 * 快捷键
 * ------------------------------------------------------------------ */

const onKeyDown = (event) => {
    // 输入框里打字时不劫持按键
    const tag = event.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (event.key !== 'Escape') return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key.toLowerCase();

    // 工具快捷键
    if (TOOL_SHORTCUTS[key]) {
        onSelectTool(TOOL_SHORTCUTS[key]);
        return;
    }

    switch (key) {
        case 'escape':
            clearTool();
            break;
        case 'arrowup':
            event.preventDefault();
            callViewport('stepSlice', -1);
            break;
        case 'arrowdown':
            event.preventDefault();
            callViewport('stepSlice', 1);
            break;
        case ',':
            rotate('left');
            break;
        case '.':
            rotate('right');
            break;
        case 'h':
            flip('horizontal');
            break;
        case 'v':
            flip('vertical');
            break;
        case 'i':
            toggleInvert();
            break;
        case '0':
            resetViewport();
            break;
        case '+':
        case '=':
            callViewport('zoomIn');
            break;
        case '-':
            callViewport('zoomOut');
            break;
        case 'delete':
        case 'backspace':
            if (currentImgIndex.value !== null) {
                event.preventDefault();
                deleteImage(currentImgIndex.value);
            }
            break;
        default:
            break;
    }
};

function truncate(text, max = 24) {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown);
    releaseAllUrls();
    clearDicomThumbnailCache();
});
</script>

<style scoped>
#layout {
    position: relative;
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #090c2a;
}

/* 顶部工具栏 */
.header {
    flex: none;
    height: 56px;
    background-color: #041c4a;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-right: 16px;
    color: aliceblue;
    z-index: 10;
}

.logo .title {
    color: #fff;
    font-size: 18px;
    font-weight: bold;
    line-height: 56px;
    margin-left: 20px;
    white-space: nowrap;
}

.toolbar {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
}

.toolbar::-webkit-scrollbar {
    display: none;
}

.toolbar-group {
    display: flex;
    align-items: center;
    gap: 4px;
}

.toolbar-divider {
    width: 1px;
    height: 22px;
    margin: 0 8px;
    background: rgba(255, 255, 255, 0.15);
    flex: none;
}

.preset-select {
    height: 28px;
    padding: 0 8px;
    background: #0d2a63;
    color: aliceblue;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    outline: none;
}

.preset-select option {
    background: #041c4a;
    color: aliceblue;
}

/* 主区域 */
.main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: row;
}

.main .left {
    flex: none;
    width: 220px;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #090c2a;
    color: #fff;
    padding-top: 10px;
}

.left-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 8px 0 4px;
    font-size: 12px;
}

.sample-link {
    color: aliceblue;
    text-decoration: none;
}

.sample-link:hover {
    text-decoration: underline;
}

.sample-btn {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: aliceblue;
    font-size: 12px;
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
}

.sample-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
}

.sample-btn:disabled {
    opacity: 0.5;
    cursor: progress;
}

.clear-all {
    background: none;
    border: none;
    color: #ef6a6a;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
}

.clear-all:hover {
    text-decoration: underline;
}

.list-box {
    width: 100%;
    flex: 1;
    min-height: 0;
    padding: 4px 8px 16px;
    overflow-y: auto;
    overflow-x: hidden;
    text-align: center;
    scrollbar-width: thin;
}

.list-box::-webkit-scrollbar {
    width: 6px;
}

.list-box::-webkit-scrollbar-thumb {
    background: #2b3b57;
    border-radius: 3px;
}

.list-empty {
    margin-top: 30px;
    font-size: 12px;
    color: #56617a;
}

.main .right {
    flex: 1;
    min-width: 0;
    min-height: 0;
}

/* 底部状态栏 */
.footer {
    flex: none;
    height: 28px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #041c4a;
    color: #6c757d;
    font-size: 12px;
    z-index: 10;
}

/* 拖拽遮罩 */
.drop-mask {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(4, 28, 74, 0.75);
    border: 2px dashed #50a5f5;
    color: #fff;
    font-size: 16px;
    pointer-events: none;
    z-index: 100;
}
</style>