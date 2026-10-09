# dcm-viewer

基于 Vue3 + [Cornerstone3D](https://www.cornerstone3d.org/) 的 DICOM 医学影像查看器，支持多文件上传、多切片浏览、窗位窗宽调整、测量标注等常用阅片操作。

## 功能

**影像浏览**

- 多文件上传、拖拽文件到窗口直接载入
- 一键载入仓库自带的 212 张示例序列（`public/dcm/PATIENT_DICOM`）
- 多切片堆栈浏览：鼠标滚轮翻层、方向键翻层、底部切片条拖动
- 缩放（`Ctrl` + 滚轮，或工具栏缩放工具拖拽）、平移
- 旋转 90°、水平/垂直翻转、灰度反色
- 适应窗口重置（不裁切宽图）

**影像增强**

- 窗位窗宽调整（工具栏工具拖拽，或鼠标右键拖拽）
- CT 常用窗位窗宽预设：肺窗、纵隔窗、腹部窗、骨窗、脑窗
- 一键恢复影像自带的窗宽窗位
- 影像自带窗宽窗位无效时（真实数据里 `WindowWidth=0` 很常见）自动按像素值域重建

**测量标注**

- 长度测量、角度测量、矩形 ROI、椭圆 ROI、箭头标注、像素探针
- 一键清除全部标记

**其他**

- 视口内叠加患者信息、检查信息、方位标记（A/P/L/R）
- 实时显示切片序号、窗宽窗宽、缩放比例
- 缩略图列表懒加载并高亮当前切片，单张可删除

## 快捷键

| 按键 | 功能 |
| --- | --- |
| `↑` / `↓` | 上一层 / 下一层 |
| `Ctrl` + 滚轮 | 缩放 |
| 滚轮 | 翻层 |
| 鼠标右键拖拽 | 调整窗位窗宽 |
| 鼠标中键拖拽 | 平移 |
| `Z` `P` `W` `D` | 缩放 / 平移 / 窗位窗宽 / 探针 |
| `L` `A` `R` `O` `F` | 长度 / 角度 / 矩形 / 椭圆 / 箭头 |
| `,` `.` | 向左 / 向右旋转 |
| `H` `V` `I` | 水平翻转 / 垂直翻转 / 反色 |
| `+` `-` `0` | 放大 / 缩小 / 重置视口 |
| `Esc` | 取消工具选择 |
| `Delete` | 删除当前切片 |

## 环境

- Node.js 18+
- 依赖 Cornerstone3D `3.19.x`

## 安装依赖

```bash
npm install
```

## 运行项目

```bash
npm run dev
```

## 打包项目

```bash
npm run build
```

## 项目结构

```
src/
├── config/tools.js        工具注册表（工具类、工具栏项、快捷键、窗位预设）
├── store/index.js         Pinia：影像列表、当前切片、当前工具
├── utils/
│   ├── dicomToBase64.js   DICOM → 缩略图（支持 8/16 位、有符号、MONOCHROME1、Rescale、窗宽窗位）
│   └── toast.js           全局轻提示
├── components/
│   ├── Layout/Viewport    Cornerstone 渲染视口、工具组、切片栈
│   ├── ImgViewer          切片缩略图（懒加载）
│   ├── UpLoad             文件选择
│   └── SvgImg / Toast     基础 UI
└── views/Layout.vue       整体布局、工具栏、快捷键、文件管理
```

## 已知限制

- 仅支持未压缩传输语法的 DICOM；缩略图不支持压缩格式（JPEG / RLE）解析
- 目前只实现 STACK 视口，暂不支持多序列分组、Series 筛选、MPR / 3D
- 缩略图仅支持灰度（MONOCHROME1/2）与 RGB，暂不支持 YBR / 调色板彩色

## 项目截图

![dcm-viewer](https://raw.githubusercontent.com/moqi-y/dcm-viewer/refs/heads/master/public/project/Snipaste.png)
![dcm-viewer](https://raw.githubusercontent.com/moqi-y/dcm-viewer/refs/heads/master/public/project/Snipaste_2026.png)