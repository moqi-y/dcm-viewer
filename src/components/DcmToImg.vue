<template>
    <div>
        <input type="file" @change="handleFileUpload" />
        <canvas ref="canvas" style="display: none;"></canvas>
        <img :src="imageSrc" alt="Converted Image" />
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as dicomParser from 'dicom-parser';

const canvas = ref(null);
const imageSrc = ref(null);

const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        convertDicomToImage(arrayBuffer);
    };
    reader.readAsArrayBuffer(file);
};

const convertDicomToImage = (arrayBuffer) => {
    // 解析 DICOM 文件
    const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));

    // 获取像素数据
    const pixelDataElement = dataSet.elements.x7fe00010; // Pixel Data 的 tag 是 (7FE0,0010)
    const pixelData = new Uint16Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length / 2);

    // 获取图像的行数和列数
    const rows = dataSet.uint16('x00280010'); // Rows
    const columns = dataSet.uint16('x00280011'); // Columns

    // 创建 Canvas 并绘制图像
    const ctx = canvas.value.getContext('2d');
    const imageData = createImageDataFromPixelData(pixelData, columns, rows);
    ctx.putImageData(imageData, 0, 0);

    // 将 Canvas 内容转换为 Base64 图像
    imageSrc.value = canvas.value.toDataURL('image/png'); // 或者 'image/jpeg'
};

const createImageDataFromPixelData = (pixelData, width, height) => {
    const rgbaData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
        // 将单通道灰度值转换为 RGBA 格式
        const grayValue = pixelData[i];
        rgbaData[i * 4] = grayValue; // Red
        rgbaData[i * 4 + 1] = grayValue; // Green
        rgbaData[i * 4 + 2] = grayValue; // Blue
        rgbaData[i * 4 + 3] = 255; // Alpha (不透明)
    }
    return new ImageData(rgbaData, width, height);
};

onMounted(() => {
    // 设置 Canvas 的大小
    canvas.value.width = 512; // 假设图像大小为 512x512
    canvas.value.height = 512;
});
</script>