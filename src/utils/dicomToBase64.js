import * as dicomParser from 'dicom-parser';

/**
 * 将 DICOM 文件转换为 Base64 图像数据
 * @param {string} url - DICOM 文件的 URL 或 Blob 地址
 * @returns {Promise<string>} - 返回 Base64 图像数据
 */
async function dicomToBase64(url) {
    return new Promise((resolve, reject) => {
        // 使用 Fetch API 获取 DICOM 文件的 ArrayBuffer
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => {
                // 解析 DICOM 文件
                const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));

                // 获取像素数据
                const pixelDataElement = dataSet.elements.x7fe00010; // Pixel Data 的 tag 是 (7FE0,0010)
                const pixelData = new Uint16Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length / 2);

                // 获取图像的行数和列数
                const rows = dataSet.uint16('x00280010'); // Rows
                const columns = dataSet.uint16('x00280011'); // Columns

                // 创建 Canvas 并绘制图像
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = columns;
                canvas.height = rows;

                // 将单通道灰度值转换为 RGBA 格式
                const rgbaData = new Uint8ClampedArray(columns * rows * 4);
                for (let i = 0; i < columns * rows; i++) {
                    const grayValue = pixelData[i];
                    rgbaData[i * 4] = grayValue; // Red
                    rgbaData[i * 4 + 1] = grayValue; // Green
                    rgbaData[i * 4 + 2] = grayValue; // Blue
                    rgbaData[i * 4 + 3] = 255; // Alpha (不透明)
                }

                // 创建 ImageData 对象
                const imageData = new ImageData(rgbaData, columns, rows);
                ctx.putImageData(imageData, 0, 0);

                // 将 Canvas 内容转换为 Base64 图像
                const base64Data = canvas.toDataURL('image/png');
                resolve(base64Data);
            })
            .catch(error => {
                reject(error);
            });
    });
}

export default dicomToBase64;


/**
 * 使用示例：
 * 
import dicomToBase64 from './path/to/dicomToBase64.js';

// 示例：使用网络地址
const dicomUrl = 'https://example.com/path/to/image.dcm';
dicomToBase64(dicomUrl)
    .then(base64Data => {
        console.log('Base64 图像数据:', base64Data);
        // 可以将 base64Data 设置到 img 的 src 属性中
    })
    .catch(error => {
        console.error('转换失败:', error);
    });

// 示例：使用 Blob 地址
const blobUrl = URL.createObjectURL(blob);
dicomToBase64(blobUrl)
    .then(base64Data => {
        console.log('Base64 图像数据:', base64Data);
        // 可以将 base64Data 设置到 img 的 src 属性中
    })
    .catch(error => {
        console.error('转换失败:', error);
    });


 */