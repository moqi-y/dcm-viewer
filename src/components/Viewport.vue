<template>
  <div ref="containerEl" class="viewport-container" @contextmenu.prevent>
    <!-- cornerstone 会接管这个元素并在其中创建 canvas -->
    <div ref="viewportEl" class="viewport-canvas"></div>

    <!-- 空状态 -->
    <div v-if="isEmpty" class="viewport-empty">
      <div class="viewport-empty__title">未加载影像</div>
      <div class="viewport-empty__hint">从左侧上传 DICOM 文件，或拖拽文件到窗口任意位置</div>
    </div>

    <!-- 加载中 -->
    <div v-else-if="isLoading" class="viewport-loading">
      <img src="/icon/loading-200px-200px.svg" alt="loading" />
      <div>正在渲染…</div>
    </div>

    <!-- 左上角：患者 / 检查信息 -->
    <div v-if="!isEmpty && imageInfo" class="overlay overlay--top-left">
      <div class="overlay__title">{{ imageInfo.patientName || '匿名患者' }}</div>
      <div>{{ imageInfo.patientId }}</div>
      <div>{{ imageInfo.studyDate }} · {{ imageInfo.modality }}</div>
      <div>{{ imageInfo.seriesDescription || imageInfo.studyDescription }}</div>
    </div>

    <!-- 右下角：切片 / 窗位窗宽 / 缩放 -->
    <div v-if="!isEmpty" class="overlay overlay--bottom-right">
      <div>图像 {{ currentIndex + 1 }} / {{ total }}</div>
      <div>W {{ displayWidth }} L {{ displayCenter }}</div>
      <div>缩放 {{ zoomPercent }}%</div>
    </div>

    <!-- 右上角：方位标记 -->
    <div v-if="!isEmpty" class="overlay overlay--top-right orientation-marker">
      <span>{{ orientationLabel.top }}</span>
      <span class="orientation-marker__center">{{ orientationLabel.center }}</span>
      <span>{{ orientationLabel.bottom }}</span>
    </div>

    <!-- 底部切片导航 -->
    <div v-if="!isEmpty && total > 1" class="slice-nav">
      <button class="slice-nav__btn" :disabled="currentIndex <= 0" @click="step(-1)" title="上一层 (↑)">‹</button>
      <input
        class="slice-nav__range"
        type="range"
        min="0"
        :max="total - 1"
        :value="Math.max(currentIndex, 0)"
        @input="onSliderInput"
      />
      <button class="slice-nav__btn" :disabled="currentIndex >= total - 1" @click="step(1)" title="下一层 (↓)">›</button>
    </div>
  </div>
</template>

<script setup>
/**
 * 影像视口。
 *
 * 原实现的几个问题（都已修复）：
 *  - createToolGroup 写在 setup 顶层，组件每次 setup 都会执行；重新挂载时
 *    ToolGroupManager 会因 id 重复直接抛错，而且完全没有 destroy，WebGL 上下文泄漏。
 *  - setStack([imageId], 0) 每次只放一张图，所谓「切片显示」并不存在，切片也没有连续编号。
 *  - activeTool 只调 setToolActive，不把上一个工具置 passive；而 Cornerstone 的
 *    setToolActive 是「合并」绑定而不是替换，点两个工具后两个都会响应左键。
 *  - clearAllMark 实际调的是 setToolDisabled —— 把工具禁用了，标注一个都没清掉。
 *  - 没有 resize 监听，窗口变化后画布不跟随。
 */
import {
    ref,
    computed,
    onMounted,
    onBeforeUnmount,
    watch,
    nextTick,
} from 'vue';
import { RenderingEngine, Enums, EVENTS, metaData, imageLoader } from '@cornerstonejs/core';
import { ToolGroupManager, addTool, annotation, ArrowAnnotateTool, Enums as csEnums } from '@cornerstonejs/tools';
import {
    TOOL_CLASSES,
    ALWAYS_ACTIVE,
    ANNOTATION_TOOLS,
    CT_WINDOW_PRESETS,
} from '@/config/tools';
import toast from '@/utils/toast';

const props = defineProps({
    currentImgIndex: { type: Number, default: null },
    totalUrls: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:currentImgIndex', 'error']);

const RENDERING_ENGINE_ID = 'dcmViewerRenderingEngine';
const VIEWPORT_ID = 'dcmViewerViewport';
const TOOL_GROUP_ID = 'dcmViewerToolGroup';

const MouseBindings = csEnums.MouseBindings;

const containerEl = ref(null);
const viewportEl = ref(null);

let renderingEngine = null;
let stackViewport = null;
let toolGroup = null;
let resizeObserver = null;

/** 当前实际显示的切片下标（以 stack 为准，可能与 props 不同步的那一瞬间） */
const currentIndex = ref(-1);
const isLoading = ref(false);
/** setStack 是否已经完成。未完成时不能调用 setImageIdIndex */
const stackReady = ref(false);
/** setStack 期间请求的切片，建栈完成后补上 */
const pendingIndex = ref(null);
/** 已经修复过窗宽窗位的 imageId，保证同一张只修一次 */
let repairedImageId = null;
const imageInfo = ref(null);
const voiRange = ref({ lower: 0, upper: 255 });
const zoomRatio = ref(1);

/** 视口朝向：旋转步数(0-3) + 翻转标记 */
const rotationSteps = ref(0);
const flipH = ref(false);
const flipV = ref(false);

const total = computed(() => props.totalUrls.length);
const isEmpty = computed(() => total.value === 0);
const displayWidth = computed(() => Math.round(voiRange.value.upper - voiRange.value.lower));
const displayCenter = computed(() => Math.round((voiRange.value.upper + voiRange.value.lower) / 2));
const zoomPercent = computed(() => `${Math.round(zoomRatio.value * 100)}`);

/**
 * 方位标记：告诉用户屏幕四边各自对应哪个解剖方向，
 * 旋转/翻转之后依然不会认错左右。
 */
const orientationLabel = computed(() => {
    const odd = rotationSteps.value % 2 === 1;
    // odd 时屏幕上下对应患者左右；0/2 时对应前后
    let top = odd ? 'R' : 'A';
    let bottom = odd ? 'L' : 'P';
    let left = flipV.value ? 'P' : 'L';
    let right = flipV.value ? 'A' : 'R';
    if (flipH.value) {
        [left, right] = [right, left];
    }
    if (rotationSteps.value === 2) {
        [top, bottom] = [bottom, top];
    }
    return { top, bottom, center: '◉', left, right };
});

/* ------------------------------------------------------------------ *
 * 初始化
 * ------------------------------------------------------------------ */

const init = async () => {
    const element = viewportEl.value;
    if (!element) return;

    try {
        renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
        renderingEngine.enableElement({
            viewportId: VIEWPORT_ID,
            element,
            type: Enums.ViewportType.STACK,
            defaultOptions: { background: [0, 0, 0] },
        });
        stackViewport = renderingEngine.getViewport(VIEWPORT_ID);

        setupTools();
        setupResizeObserver(element);
        bindViewportEvents(element);

        await loadStack(props.totalUrls, props.currentImgIndex);
    } catch (error) {
        console.error('[Viewport] 初始化失败', error);
        emit('error', error?.message || '视口初始化失败');
    }
};

const setupTools = () => {
    // 防御：热更新/多次挂载时先清掉可能残留的同名工具组
    const existing = ToolGroupManager.getToolGroup(TOOL_GROUP_ID);
    if (existing) {
        ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
    }
    toolGroup = ToolGroupManager.createToolGroup(TOOL_GROUP_ID);

    Object.values(TOOL_CLASSES).forEach((ToolClass) => addTool(ToolClass));
    Object.values(TOOL_CLASSES).forEach((ToolClass) => toolGroup.addTool(ToolClass.toolName));

    /*
     * 箭头标注工具默认用英文 prompt('Enter your annotation:') 取文字，
     * 和界面上其余中文不一致。这两个回调本身是工具 configuration 的一部分，
     * 可以直接覆盖，不用去改 node_modules。
     * 注意必须放在 toolGroup.addTool 之后：setToolConfiguration 是按名字
     * 去工具组里查实例的，顺序反了只会打一条 warn 然后静默不生效。
     */
    toolGroup.setToolConfiguration(ArrowAnnotateTool.toolName, {
        getTextCallback: (doneChangingTextCallback) => {
            doneChangingTextCallback(window.prompt('请输入标注内容：'));
        },
        changeTextCallback: (data, eventData, doneChangingTextCallback) => {
            doneChangingTextCallback(window.prompt('修改标注内容：', data?.text ?? ''));
        },
    });

    toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);

    applyAlwaysActive();
};

/** 恢复「无需选择、始终可用」的工具绑定 */
const applyAlwaysActive = () => {
    if (!toolGroup) return;
    ALWAYS_ACTIVE.forEach(({ toolName, bindings }) => {
        toolGroup.setToolActive(toolName, { bindings });
    });
};

/**
 * 让容器尺寸变化时重算视口。
 * 原实现没有这一步，浏览器窗口一变大，画布就停留在旧尺寸。
 */
const setupResizeObserver = (element) => {
    if (typeof ResizeObserver === 'undefined') return;
    resizeObserver = new ResizeObserver(() => {
        if (!renderingEngine) return;
        renderingEngine.resize(true, false);
    });
    resizeObserver.observe(element);
};

/**
 * Ctrl + 滚轮 = 缩放。
 * Cornerstone 的绑定不支持修饰键，且 StackScrollTool 已经占用了 Wheel，
 * 所以这里在捕获阶段拦截 ctrl+滚轮，阻止翻层事件继续传播。
 */
const onCtrlWheel = (event) => {
    if (!event.ctrlKey || !stackViewport) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    zoomByStep(event.deltaY < 0 ? 1 : -1);
};

const bindViewportEvents = (element) => {
    element.addEventListener(EVENTS.STACK_NEW_IMAGE, onStackNewImage);
    element.addEventListener(EVENTS.IMAGE_RENDERED, onImageRendered);
    element.addEventListener('wheel', onCtrlWheel, { capture: true, passive: false });
};

const onStackNewImage = () => {
    if (!stackViewport) return;
    const index = stackViewport.getCurrentImageIdIndex();
    currentIndex.value = index;
    // 每一张新切片都要先确认窗宽窗位可用，再刷新叠加信息
    ensureValidWindow();
    refreshViewInfo();
    updateZoomRatio();
    // 用户滚轮翻页时把状态同步回父组件，保证工具栏高亮和切片条一致
    if (index !== props.currentImgIndex) {
        emit('update:currentImgIndex', index);
    }
};

/** IMAGE_RENDERED 由渲染管线触发，StackViewport 本身不发，这里只用来刷新数值显示 */
const onImageRendered = () => {
    refreshViewInfo();
};

/* ------------------------------------------------------------------ *
 * 影像加载
 * ------------------------------------------------------------------ */

const loadStack = async (urls, startIndex) => {
    if (!stackViewport || !urls || urls.length === 0) {
        currentIndex.value = -1;
        imageInfo.value = null;
        stackReady.value = false;
        return;
    }

    isLoading.value = true;
    stackReady.value = false;
    try {
        const imageIds = urls.map((url) => `wadouri:${url}`);
        const index = clampIndex(startIndex);
        await stackViewport.setStack(imageIds, index);
        stackReady.value = true;
        stackViewport.render();
        currentIndex.value = index;
        // 新序列重新计算方向，避免沿用上一份影像的旋转
        resetOrientation();
        ensureValidWindow();
        refreshViewInfo();

        /*
         * setStack 是异步的，这期间父组件可能已经切到了别的切片。
         * 把期间挂起的跳转补上，否则载入大序列时会停在第 0 张。
         */
        if (pendingIndex.value !== null) {
            const target = pendingIndex.value;
            pendingIndex.value = null;
            await scrollToIndex(target);
        }
    } catch (error) {
        console.error('[Viewport] 加载影像失败', error);
        emit('error', error?.message || '影像加载失败');
        toast().showError('影像加载失败');
    } finally {
        isLoading.value = false;
    }
};

const clampIndex = (index) => {
    const max = total.value - 1;
    if (!Number.isFinite(index) || index === null) return 0;
    return Math.min(Math.max(Math.trunc(index), 0), Math.max(max, 0));
};

/**
 * 跳到指定切片。
 * 堆栈还没建好时不能直接 setImageIdIndex —— 那样会抛
 * "the stack only has 0 elements"，并且留下一个坏掉的 VOI 状态。
 * 这种情况下先记下来，等 setStack 完成后再补。
 */
const scrollToIndex = async (index) => {
    if (!stackViewport || isEmpty.value) return;
    const next = clampIndex(index);

    if (!stackReady.value) {
        pendingIndex.value = next;
        return;
    }

    if (next === currentIndex.value) return;
    try {
        await stackViewport.setImageIdIndex(next);
        stackViewport.render();
        currentIndex.value = next;
        // 换片后 VOI 可能又回到影像自带的无效值
        ensureValidWindow();
        refreshViewInfo();
        updateZoomRatio();
    } catch (error) {
        console.error('[Viewport] 切换切片失败', error);
    }
};

/* ------------------------------------------------------------------ *
 * 视口几何：旋转 / 翻转 / 缩放 / 重置
 * ------------------------------------------------------------------ */

/**
 * 取当前影像在世界坐标下的宽高。
 * 同样不能用 viewport.getImageData()（GPU 模式下没有 rows/columns），
 * 改从 csImage 上取行列数与像素间距。
 * 取不到时返回 null —— 不能拿 1x1 兜底，否则适应窗口的比例会算成天文数字。
 */
const getImageWorldSize = () => {
    const image = getCurrentImage();
    if (!image || !image.rows || !image.columns) return null;

    const columnSpacing = image.columnPixelSpacing?.[0] || 1;
    const rowSpacing = image.rowPixelSpacing?.[0] || 1;
    return {
        width: image.columns * columnSpacing,
        height: image.rows * rowSpacing,
    };
};

/** 完整放入视口所需的 parallelScale（视口显示 2*parallelScale 世界单位高），取不到返回 null */
const computeFitParallelScale = () => {
    const element = viewportEl.value;
    if (!element || !element.clientHeight) return null;
    const size = getImageWorldSize();
    if (!size) return null;

    const aspect = element.clientWidth / Math.max(element.clientHeight, 1);
    const [w, h] = rotationSteps.value % 2 === 1
        ? [size.height, size.width]
        : [size.width, size.height];
    return Math.max(h, w / Math.max(aspect, 1e-6)) / 2;
};

const updateZoomRatio = () => {
    if (!stackViewport) return;
    const fit = computeFitParallelScale();
    const camera = stackViewport.getCamera();
    if (fit && fit > 0 && camera?.parallelScale) {
        zoomRatio.value = camera.parallelScale / fit;
    } else {
        zoomRatio.value = 1;
    }
};

/**
 * 旋转 90°。
 * 朝向本身交给 Cornerstone 的 setRotation —— 它内部同时修正了平移量，
 * 自己算 viewUp 的话平移会偏。手动部分只保留一件事：
 * 旋转后图像宽高互换，需要重新按「适应窗口」取景，
 * 同时用 zoomRatio 保住用户当前的缩放倍数。
 */
const rotate = (direction) => {
    if (!stackViewport) return;

    const beforeFit = computeFitParallelScale();
    const camera = stackViewport.getCamera();
    const ratio = beforeFit && camera?.parallelScale ? camera.parallelScale / beforeFit : null;

    stackViewport.setRotation(direction === 'left' ? -90 : 90);

    rotationSteps.value = (((rotationSteps.value + (direction === 'left' ? -1 : 1)) % 4) + 4) % 4;

    // 取不到取景比例时只旋转，不动 parallelScale，避免把画面缩到看不见
    const afterFit = ratio === null ? null : computeFitParallelScale();
    if (afterFit) {
        stackViewport.setCamera({
            ...stackViewport.getCamera(),
            parallelScale: afterFit * ratio,
        });
    }
    stackViewport.render();
    updateZoomRatio();
};

const flip = (axis) => {
    if (!stackViewport) return;
    const camera = stackViewport.getCamera();
    if (axis === 'horizontal') {
        flipH.value = !flipH.value;
        stackViewport.setCamera({ ...camera, flipHorizontal: flipH.value });
    } else {
        flipV.value = !flipV.value;
        stackViewport.setCamera({ ...camera, flipVertical: flipV.value });
    }
    stackViewport.render();
};

const toggleInvert = () => {
    if (!stackViewport) return;
    const properties = stackViewport.getProperties();
    stackViewport.setProperties({ invert: !properties.invert });
    stackViewport.render();
};

const zoomByStep = (step) => {
    if (!stackViewport) return;
    const camera = stackViewport.getCamera();
    if (!camera?.parallelScale) return;
    const factor = step > 0 ? 0.85 : 1 / 0.85;
    stackViewport.setCamera({ ...camera, parallelScale: camera.parallelScale * factor });
    stackViewport.render();
    updateZoomRatio();
};

const resetOrientation = () => {
    rotationSteps.value = 0;
    flipH.value = false;
    flipV.value = false;
    // 换了序列，之前修过的 imageId 不再适用
    repairedImageId = null;
};

/** 恢复到「适应窗口 + 原始方向 + 原始窗宽窗位」 */
const resetViewport = async () => {
    if (!stackViewport) return;

    resetOrientation();
    // resetCamera 会一并清掉旋转和 VOI，所以这里要等一帧，
    // 让 Cornerstone 先把相机算好，再按「适应窗口」重设取景。
    stackViewport.resetCamera();
    stackViewport.setCamera({
        ...stackViewport.getCamera(),
        flipHorizontal: false,
        flipVertical: false,
    });

    await nextTick();

    // StackViewport.resetCamera 默认按「铺满视口高度」取景，
    // 这里改成完整适应窗口，宽图不会被裁掉。取不到比例时保持默认取景。
    const fit = computeFitParallelScale();
    if (fit) {
        stackViewport.setCamera({
            ...stackViewport.getCamera(),
            parallelScale: fit,
        });
    }

    stackViewport.render();
    updateZoomRatio();
    refreshViewInfo();
};

/* ------------------------------------------------------------------ *
 * 窗宽窗位
 * ------------------------------------------------------------------ */

/** 常用 CT 预设从 @/config/tools 引入（CT_WINDOW_PRESETS） */

const applyWindowLevel = (lower, upper) => {
    if (!stackViewport || !Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower) {
        return false;
    }
    stackViewport.setProperties({ voiRange: { lower, upper } });
    stackViewport.render();
    return true;
};

/**
 * 取当前切片的 csImage 对象（dicom-image-loader 产出的那个）。
 *
 * 注意不能用 viewport.getImageData()：GPU 渲染模式下它返回的是 VTK 风格对象，
 * 只有 dimensions/spacing/scalarData，里面没有 rows、windowCenter、
 * minPixelValue、getPixelData 这些字段。CPU 模式返回的又是另一种结构。
 * 这里统一走 imageLoader，拿到的一定是带完整字段的 csImage。
 */
const getCurrentImage = () => {
    if (!stackViewport) return null;
    try {
        const imageId = stackViewport.getCurrentImageId?.();
        if (!imageId) return null;
        return imageLoader.loadAndCacheImage(imageId);
    } catch (error) {
        console.warn('[Viewport] 获取当前影像失败', error);
        return null;
    }
};

/**
 * 读当前切片的像素数组。
 *
 * GPU 模式下 dicom-image-loader 会把 CPU 端的像素数组释放掉，
 * image.getPixelData() 拿不到东西，必须走 viewport.getImageData().scalarData
 * （由 voxelManager 从纹理读回）。CPU 模式下则走 imageData.getScalarData()。
 */
const getPixelScalarData = () => {
    if (!stackViewport) return null;

    try {
        const data = stackViewport.getImageData();
        // GPU 模式：{ dimensions, spacing, get scalarData() }
        if (data && typeof data === 'object') {
            const scalar = typeof data.scalarData === 'function'
                ? data.scalarData
                : data.scalarData;
            if (scalar && scalar.length) return scalar;
            // CPU 模式：{ imageData: { getScalarData() } }
            const nested = data.imageData?.getScalarData?.();
            if (nested && nested.length) return nested;
        }
    } catch (error) {
        console.warn('[Viewport] 读取像素数据失败', error);
    }

    // 最后的兜底：部分情况下 csImage 仍持有像素数组
    const image = getCurrentImage();
    if (image && typeof image.getPixelData === 'function') {
        const pixelData = image.getPixelData();
        if (pixelData && pixelData.length) return pixelData;
    }
    return null;
};

/**
 * 取影像的像素值域（含 rescale 换算）。
 *
 * 优先用 DICOM 里的 Smallest/LargestImagePixelValue，但这两个标签是可选的，
 * 缺失时 minPixelValue/maxPixelValue 就是 undefined（仓库自带的示例序列就没有）。
 * 这时回退到直接扫一遍像素数据，保证一定能拿到可用值域。
 */
const getPixelValueRange = (image) => {
    if (!image) return null;

    let min = image.minPixelValue;
    let max = image.maxPixelValue;

    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
        const pixelData = getPixelScalarData();
        if (!pixelData || !pixelData.length) return null;

        min = Infinity;
        max = -Infinity;
        for (let i = 0; i < pixelData.length; i++) {
            const value = pixelData[i];
            if (value < min) min = value;
            if (value > max) max = value;
        }
    }

    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;

    const slope = image.slope ?? image.rescaleSlope ?? 1;
    const intercept = image.intercept ?? image.rescaleIntercept ?? 0;
    return { lower: min * slope + intercept, upper: max * slope + intercept };
};

/**
 * 修复影像自带窗宽窗位无效的情况。
 *
 * 真实数据里很常见 WindowCenter=0 / WindowWidth=0（仓库自带的示例序列就是），
 * Cornerstone 会照单全收，把窗宽当成 0，渲染出来是纯黑白二值图。
 *
 * 判断依据取影像自己声明的 windowWidth，而不是 getProperties()：
 * 后者的时序不稳定（渲染前后读到的值不一样），而文件里的标签是确定值。
 * 每张影像只修一次，避免用户手动拖过窗宽窗位之后又被强行改回去。
 */
const ensureValidWindow = () => {
    const image = getCurrentImage();
    if (!image) return;

    const imageId = stackViewport?.getCurrentImageId?.();
    if (imageId && repairedImageId === imageId) return;

    const declaredWidth = image.windowWidth;
    const declaredCenter = image.windowCenter;
    // 影像自带了合法窗宽窗位就不用管
    if (Number.isFinite(declaredWidth) && declaredWidth > 1 && Number.isFinite(declaredCenter)) {
        return;
    }

    const pixelRange = getPixelValueRange(image);
    if (!pixelRange) return;

    if (applyWindowLevel(pixelRange.lower, pixelRange.upper)) {
        repairedImageId = imageId;
        console.info(
            `[Viewport] 影像自带窗宽窗位无效，已按像素值域重建：W ${Math.round(pixelRange.upper - pixelRange.lower)} L ${Math.round((pixelRange.upper + pixelRange.lower) / 2)}`
        );
    }
};

const applyWindowPreset = (presetKey) => {
    const preset = CT_WINDOW_PRESETS.find((item) => item.key === presetKey);
    if (!preset) return;
    applyWindowLevel(preset.center - preset.width / 2, preset.center + preset.width / 2);
    refreshViewInfo();
    toast().showSuccess(`已应用${preset.label}`);
};

/**
 * 回到影像自带的窗宽窗位；
 * 自带的无效（常见 W=0）时退回按像素值域计算，而不是退化成 0-255。
 */
const resetWindowLevel = () => {
    if (!stackViewport) return;
    const image = getCurrentImage();
    const center = image?.windowCenter;
    const width = image?.windowWidth;

    if (Number.isFinite(center) && Number.isFinite(width) && width > 1) {
        applyWindowLevel(center - width / 2, center + width / 2);
    } else {
        const pixelRange = getPixelValueRange(image);
        if (pixelRange) {
            applyWindowLevel(pixelRange.lower, pixelRange.upper);
        } else {
            applyWindowLevel(0, 255);
        }
    }
    refreshViewInfo();
};

/* ------------------------------------------------------------------ *
 * 标注
 * ------------------------------------------------------------------ */

/**
 * 真正清除标注。
 * 原实现调的是 setToolDisabled，只是把工具禁用，标注一直留在图上。
 */
const clearAnnotations = () => {
    if (!stackViewport) return;
    ANNOTATION_TOOLS.forEach((toolName) => {
        annotation.state.removeAnnotations(toolName, VIEWPORT_ID);
    });
    annotation.visibility.showAllAnnotations(VIEWPORT_ID);
    stackViewport.render();
    toast().showSuccess('已清除所有标记');
};

/* ------------------------------------------------------------------ *
 * 工具切换
 * ------------------------------------------------------------------ */

/**
 * 选中工具。
 * 关键点：先 setToolPassive({ removeAllBindings: true }) 清掉所有工具的绑定，
 * 再装上常驻绑定和当前工具。Cornerstone 的 setToolActive 会「合并」绑定，
 * 不清的话点过几个工具就有几个同时抢左键。
 */
const setActiveTool = (toolName) => {
    if (!toolGroup) return;

    Object.values(TOOL_CLASSES).forEach((ToolClass) => {
        toolGroup.setToolPassive(ToolClass.toolName, { removeAllBindings: true });
    });
    applyAlwaysActive();

    if (toolName && TOOL_CLASSES[toolName]) {
        toolGroup.setToolActive(toolName, {
            bindings: [{ mouseButton: MouseBindings.Primary }],
        });
    }
};

/** 取消工具选择，回到「只有常驻工具」的状态 */
const clearActiveTool = () => {
    setActiveTool(null);
};

/* ------------------------------------------------------------------ *
 * 交互
 * ------------------------------------------------------------------ */

const step = (delta) => {
    scrollToIndex(currentIndex.value + delta);
};

const onSliderInput = (event) => {
    scrollToIndex(Number(event.target.value));
};

/** 供父组件 / 快捷键调用 */
const stepSlice = step;
const zoomIn = () => zoomByStep(1);
const zoomOut = () => zoomByStep(-1);

/* ------------------------------------------------------------------ *
 * 信息面板
 * ------------------------------------------------------------------ */

const refreshViewInfo = () => {
    if (!stackViewport || isEmpty.value) {
        imageInfo.value = null;
        return;
    }

    try {
        const properties = stackViewport.getProperties();
        if (properties?.voiRange) {
            voiRange.value = properties.voiRange;
        }

        const index = stackViewport.getCurrentImageIdIndex();
        const imageId = props.totalUrls[index] ? `wadouri:${props.totalUrls[index]}` : null;
        imageInfo.value = imageId ? readImageInfo(imageId) : null;
    } catch (error) {
        console.warn('[Viewport] 读取影像信息失败', error);
    }
};

/** 元数据在图片加载完成前可能取不到，取不到就返回空对象而不是抛错 */
const readImageInfo = (imageId) => {
    const read = (key) => {
        try {
            return metaData.get(key, imageId);
        } catch {
            return undefined;
        }
    };
    return {
        patientName: read('patientName'),
        patientId: read('patientID'),
        studyDate: read('studyDate'),
        studyDescription: read('studyDescription'),
        seriesDescription: read('seriesDescription'),
        modality: read('modality'),
    };
};

/* ------------------------------------------------------------------ *
 * 响应式数据流
 * ------------------------------------------------------------------ */

watch(
    // 用对象而不是直接监听数组：splice 不会改变数组引用，
    // 直接 watch(() => props.totalUrls) 在删除文件时是收不到通知的。
    () => ({ length: props.totalUrls.length }),
    ({ length }) => {
        if (length === 0) {
            // setStack([]) 在 Cornerstone 里不是合法调用，这里只清本地状态，
            // 视口停留在最后一帧画面，由空状态遮罩盖住。
            currentIndex.value = -1;
            imageInfo.value = null;
            voiRange.value = { lower: 0, upper: 255 };
            zoomRatio.value = 1;
            resetOrientation();
            return;
        }
        loadStack(props.totalUrls, props.currentImgIndex);
    }
);

watch(
    () => props.currentImgIndex,
    (index) => {
        if (isEmpty.value) return;
        if (index === null || index === undefined) return;
        scrollToIndex(index);
    }
);

/* ------------------------------------------------------------------ *
 * 清理
 * ------------------------------------------------------------------ */

const destroy = () => {
    const element = viewportEl.value;
    if (element) {
        element.removeEventListener(EVENTS.STACK_NEW_IMAGE, onStackNewImage);
        element.removeEventListener(EVENTS.IMAGE_RENDERED, onImageRendered);
        element.removeEventListener('wheel', onCtrlWheel, { capture: true });
    }
    resizeObserver?.disconnect();
    resizeObserver = null;

    if (toolGroup) {
        toolGroup.removeViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);
        ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID);
        toolGroup = null;
    }

    if (renderingEngine) {
        // 必须 destroy，否则 WebGL 上下文和缓存会一直留着
        renderingEngine.destroy();
        renderingEngine = null;
    }
    stackViewport = null;
};

onMounted(() => {
    init();
});

onBeforeUnmount(() => {
    destroy();
});

defineExpose({
    setActiveTool,
    clearActiveTool,
    clearAnnotations,
    resetViewport,
    resetWindowLevel,
    applyWindowPreset,
    rotate,
    flip,
    toggleInvert,
    zoomIn,
    zoomOut,
    stepSlice,
    scrollToIndex,
    CT_WINDOW_PRESETS,
});
</script>

<style scoped>
.viewport-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: #000;
    overflow: hidden;
}

.viewport-canvas {
    width: 100%;
    height: 100%;
}

/* 空状态 / 加载态 */
.viewport-empty,
.viewport-loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #6c757d;
    pointer-events: none;
}

.viewport-empty__title {
    font-size: 16px;
    color: #9aa5b1;
}

.viewport-empty__hint {
    font-size: 12px;
}

.viewport-loading img {
    width: 60px;
    height: 60px;
}

/* 信息浮层 */
.overlay {
    position: absolute;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.6;
    color: aliceblue;
    background: rgba(4, 28, 74, 0.55);
    border-radius: 4px;
    pointer-events: none;
    max-width: 40%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.overlay--top-left {
    top: 10px;
    left: 10px;
}

.overlay--bottom-right {
    bottom: 46px;
    right: 10px;
    text-align: right;
}

.overlay__title {
    font-weight: bold;
    color: #fff;
}

.orientation-marker {
    top: 10px;
    right: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: transparent;
    padding: 0;
}

.orientation-marker__center {
    font-size: 10px;
    opacity: 0.7;
}

/* 切片导航 */
.slice-nav {
    position: absolute;
    left: 50%;
    bottom: 10px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    width: 70%;
    max-width: 520px;
    padding: 6px 12px;
    background: rgba(4, 28, 74, 0.75);
    border-radius: 20px;
}

.slice-nav__btn {
    width: 26px;
    height: 26px;
    flex: none;
    border: none;
    border-radius: 50%;
    background: #50a5f5;
    color: #fff;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
}

.slice-nav__btn:disabled {
    background: #3a4a63;
    cursor: not-allowed;
}

.slice-nav__range {
    flex: 1;
    height: 4px;
    appearance: none;
    background: #2b3b57;
    border-radius: 2px;
    cursor: pointer;
}

.slice-nav__range::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #50a5f5;
    cursor: pointer;
}

.slice-nav__range::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border: none;
    border-radius: 50%;
    background: #50a5f5;
    cursor: pointer;
}
</style>