/**
 * DICOM -> 缩略图（dataURL）转换。
 *
 * 原实现有三个硬伤，导致缩略图大面积静默失败：
 *  1. 像素一律按 Uint16Array 读 —— 8 位 DICOM(SC/US/部分 X 光) 全是错值，
 *     有符号数据(PixelRepresentation=1，如 CT 的 HU) 被当成无符号，负数变正数。
 *  2. 用 dataSet.byteArray.buffer + dataOffset 构造 TypedArray，忽略了
 *     byteArray 自身的 byteOffset，切片场景下会抛 RangeError。
 *  3. 没有取模转换(MONOCHROME1)、没有 RescaleSlope/Intercept、没有窗宽窗位，
 *     图像对比度基本等于没有；也没有任何错误处理，reject 之后界面只剩空白。
 *
 * 这里按 DICOM 标准重写，并加了缓存，避免列表滚动时重复解码。
 */
import * as dicomParserModule from 'dicom-parser';

/**
 * dicom-parser 是 CommonJS 包。
 * Vite 构建时能拿到具名导出，但 Node 的 ESM 互操作只会把 CJS 导出挂在 default 上，
 * 这里做一次兜底，保证同一份代码在浏览器和 Node（测试/脚本）里都能跑。
 */
const dicomParser = dicomParserModule.parseDicom
    ? dicomParserModule
    : dicomParserModule.default;

/** url -> dataURL 缓存。用 Map 是因为它保持插入顺序，可以按插入顺序淘汰。 */
const cache = new Map();
const MAX_CACHE_SIZE = 400;

function rememberCache(key, value) {
    cache.set(key, value);
    if (cache.size > MAX_CACHE_SIZE) {
        // 淘汰最早写入的一条
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
    }
    return value;
}

export function clearDicomThumbnailCache() {
    cache.clear();
}

/** 读取数值型标签，缺失/非法时返回 fallback。 */
function readFloat(dataSet, tag, index, fallback) {
    const raw = dataSet.floatString(tag, index);
    return Number.isFinite(raw) ? raw : fallback;
}

/** 读取整型标签，缺失/非法时返回 fallback。 */
function readInt(dataSet, tag, fallback) {
    const raw = dataSet.uint16(tag);
    return Number.isFinite(raw) ? raw : fallback;
}

/**
 * 构造对齐的 TypedArray 视图。
 * buffer 里 dataOffset 可能是奇数（切出来的 ArrayBuffer），直接交给 16 位
 * TypedArray 会抛 RangeError；此时复制一份到对齐的 buffer 里。
 */
function toAlignedView(buffer, byteOffset, elementCount, TypedArray) {
    const byteLength = elementCount * TypedArray.BYTES_PER_ELEMENT;
    if (byteOffset % TypedArray.BYTES_PER_ELEMENT === 0) {
        return new TypedArray(buffer, byteOffset, elementCount);
    }
    const alignedBuffer = buffer.slice(byteOffset, byteOffset + byteLength);
    return new TypedArray(alignedBuffer, 0, elementCount);
}

/**
 * 解析 DICOM 数据集为 { rows, columns, rgba, invert }。
 * 抛出的 Error 带中文原因，调用方直接展示给用户。
 */
export function decodeDicomToRgba(arrayBuffer) {
    const byteArray = new Uint8Array(arrayBuffer);
    let dataSet;
    try {
        dataSet = dicomParser.parseDicom(byteArray);
    } catch (error) {
        // dicom-parser 有时抛的是没有 message 的对象，直接透传会让界面显示空白错误
        throw new Error(`DICOM 解析失败：${error?.message || error || '文件格式不正确'}`);
    }

    const rows = readInt(dataSet, 'x00280010', 0);
    const columns = readInt(dataSet, 'x00280011', 0);
    if (!rows || !columns) {
        throw new Error('缺少图像尺寸 (Rows/Columns)，可能不是图像 DICOM');
    }

    const pixelDataElement = dataSet.elements.x7fe00010;
    if (!pixelDataElement) {
        throw new Error('缺少像素数据 (7FE0,0010)');
    }
    if (pixelDataElement.encapsulatedPixelData) {
        throw new Error('不支持压缩传输语法 (JPEG/RLE) 的 DICOM');
    }

    const bitsAllocated = readInt(dataSet, 'x00280100', 16);
    const isSigned = readInt(dataSet, 'x00280103', 0) === 1;
    const samplesPerPixel = readInt(dataSet, 'x00280002', 1);
    const photometric = (dataSet.string('x00280004') || 'MONOCHROME2').trim().toUpperCase();
    const frames = Math.max(1, readInt(dataSet, 'x00280008', 1));

    const elementCount = rows * columns;
    const dataOffset = byteArray.byteOffset + pixelDataElement.dataOffset;

    let samples;
    if (bitsAllocated === 8) {
        samples = isSigned
            ? toAlignedView(arrayBuffer, dataOffset, elementCount * samplesPerPixel, Int8Array)
            : toAlignedView(arrayBuffer, dataOffset, elementCount * samplesPerPixel, Uint8Array);
    } else if (bitsAllocated === 16) {
        samples = isSigned
            ? toAlignedView(arrayBuffer, dataOffset, elementCount * samplesPerPixel, Int16Array)
            : toAlignedView(arrayBuffer, dataOffset, elementCount * samplesPerPixel, Uint16Array);
    } else {
        throw new Error(`不支持的位深 BitsAllocated=${bitsAllocated}`);
    }

    // 多帧文件只取第一帧做缩略图
    const frameSamples = samples.subarray(0, elementCount * samplesPerPixel);

    const isColor = samplesPerPixel === 3 && (photometric === 'RGB' || photometric === 'YBR_FULL');
    if (!isColor && photometric !== 'MONOCHROME1' && photometric !== 'MONOCHROME2') {
        throw new Error(`暂不支持 ${photometric} 彩色格式的缩略图`);
    }

    // Rescale：把存储值换算成 modality value（CT 通常是 HU）
    const slope = readFloat(dataSet, 'x00281053', 0, 1);
    const intercept = readFloat(dataSet, 'x00281052', 0, 0);

    // 窗宽窗位：优先用 DICOM 里自带的，没有就按实际值域兜底
    let center = readFloat(dataSet, 'x00281050', 0, NaN);
    let width = readFloat(dataSet, 'x00281051', 0, NaN);
    if (!(width > 1) || !Number.isFinite(center)) {
        let min = Infinity;
        let max = -Infinity;
        const limit = isColor ? frameSamples.length : elementCount;
        for (let i = 0; i < limit; i++) {
            const value = frameSamples[i] * slope + intercept;
            if (value < min) min = value;
            if (value > max) max = value;
        }
        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
            min = 0;
            max = 255;
        }
        const range = max - min;
        center = min + range / 2;
        width = range * 1.1; // 留 10% 余量，避免图像顶到纯白/纯黑
    }

    // MONOCHROME1：最小值代表白色，与 MONOCHROME2 相反
    const invert = !isColor && photometric === 'MONOCHROME1';

    const rgba = new Uint8ClampedArray(elementCount * 4);

    /*
     * 按 DICOM PS3.3 C.11.2.1.2 的 LINEAR VOI 变换：
     *   y = ((x - (c - 0.5)) / (w - 1) + 0.5) * (ymax - ymin) + ymin
     * 两个 0.5 都必须保留：
     *  - 减数是 (c - 0.5)，分母是 (w - 1)，这样窗宽刚好铺满值域时才恒等映射；
     *  - 末尾的 +0.5 是输出范围的半程，漏掉会让整幅图偏暗半个输出动态范围
     *    （例如 W256 L128 本应恒等映射，漏掉后 255 会变成 128）。
     */
    const effectiveWidth = width > 1 ? width - 1 : width;
    const lower = center - 0.5;

    for (let i = 0; i < elementCount; i++) {
        let gray;
        if (isColor) {
            const base = i * 3;
            gray = ((frameSamples[base] + frameSamples[base + 1] + frameSamples[base + 2]) / 3) * slope + intercept;
        } else {
            gray = frameSamples[i] * slope + intercept;
        }

        let value = effectiveWidth > 0
            ? ((gray - lower) / effectiveWidth + 0.5) * 255
            : gray;
        value = value < 0 ? 0 : value > 255 ? 255 : value;
        if (invert) value = 255 - value;

        const o = i * 4;
        rgba[o] = value;
        rgba[o + 1] = value;
        rgba[o + 2] = value;
        rgba[o + 3] = 255;
    }

    return { rows, columns, rgba, frames };
}

/**
 * 把 DICOM 文件地址转换成 PNG dataURL。
 * @param {string} url  DICOM 的 URL 或 blob: 地址
 * @returns {Promise<string>} dataURL
 */
export async function dicomToBase64(url) {
    if (cache.has(url)) {
        return cache.get(url);
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`读取文件失败 (HTTP ${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const { rows, columns, rgba } = decodeDicomToRgba(arrayBuffer);

    const canvas = document.createElement('canvas');
    canvas.width = columns;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('当前浏览器不支持 Canvas 2D');
    }
    ctx.putImageData(new ImageData(rgba, columns, rows), 0, 0);

    return rememberCache(url, canvas.toDataURL('image/png'));
}

export default dicomToBase64;