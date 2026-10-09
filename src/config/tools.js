/**
 * 工具注册表 —— Viewport 与 Layout 的唯一事实来源。
 *
 * 之前工具名散落在 Layout 的 toolList 和 Viewport 的 toolMapping 两处，
 * 改名或增删工具必须同步改两个数组，容易漏。这里集中定义一次。
 */
import {
    ZoomTool,
    PanTool,
    WindowLevelTool,
    DragProbeTool,
    LengthTool,
    AngleTool,
    RectangleROITool,
    EllipticalROITool,
    ArrowAnnotateTool,
    StackScrollTool,
} from '@cornerstonejs/tools';

/**
 * 工具类映射：toolName -> 工具类，Viewport 注册时用。
 */
export const TOOL_CLASSES = {
    [ZoomTool.toolName]: ZoomTool,
    [PanTool.toolName]: PanTool,
    [WindowLevelTool.toolName]: WindowLevelTool,
    [DragProbeTool.toolName]: DragProbeTool,
    [LengthTool.toolName]: LengthTool,
    [AngleTool.toolName]: AngleTool,
    [RectangleROITool.toolName]: RectangleROITool,
    [EllipticalROITool.toolName]: EllipticalROITool,
    [ArrowAnnotateTool.toolName]: ArrowAnnotateTool,
    [StackScrollTool.toolName]: StackScrollTool,
};

/**
 * 需要注册到 toolGroup 的工具。
 * note: WindowLevelTool / ZoomTool / PanTool / StackScrollTool 会常驻激活
 * (见 Viewport 的 ALWAYS_ACTIVE)，这里的 selectable 决定是否出现在工具栏。
 */
export const SELECTABLE_TOOLS = [
    {
        id: 'zoom',
        name: '缩放工具',
        toolName: ZoomTool.toolName,
        icon: '/icon/放大_zoom.svg',
        shortcut: 'Z',
    },
    {
        id: 'pan',
        name: '平移工具',
        toolName: PanTool.toolName,
        icon: '/icon/拖拽_drag.svg',
        shortcut: 'P',
    },
    {
        id: 'windowLevel',
        name: '窗位窗宽',
        toolName: WindowLevelTool.toolName,
        icon: '/icon/对比_contrast-view.svg',
        shortcut: 'W',
    },
    {
        id: 'probe',
        name: '探针工具',
        toolName: DragProbeTool.toolName,
        icon: '/icon/瞄准_aiming.svg',
        shortcut: 'D',
    },
    {
        id: 'length',
        name: '长度测量',
        toolName: LengthTool.toolName,
        icon: '/icon/尺子_ruler.svg',
        shortcut: 'L',
    },
    {
        id: 'angle',
        name: '角度测量',
        toolName: AngleTool.toolName,
        icon: '/icon/角度_rotation-one.svg',
        shortcut: 'A',
    },
    {
        id: 'rectangle',
        name: '矩形 ROI',
        toolName: RectangleROITool.toolName,
        icon: '/icon/矩形_rectangle-one.svg',
        shortcut: 'R',
    },
    {
        id: 'ellipse',
        name: '椭圆 ROI',
        toolName: EllipticalROITool.toolName,
        icon: '/icon/椭圆_ellipse.svg',
        shortcut: 'O',
    },
    {
        id: 'arrow',
        name: '箭头标注',
        toolName: ArrowAnnotateTool.toolName,
        icon: '/icon/箭头_arrow.svg',
        shortcut: 'F',
    },
];

/**
 * 常驻激活的工具绑定 —— 不需要在工具栏里手动选，随时可用。
 * 这符合 PACS 习惯：右键拖 = 窗宽窗位，中键拖 = 平移，滚轮 = 翻层，Ctrl+滚轮 = 缩放。
 */
export const ALWAYS_ACTIVE = [
    {
        toolName: WindowLevelTool.toolName,
        bindings: [{ mouseButton: 2 /* Secondary */ }],
    },
    {
        toolName: PanTool.toolName,
        bindings: [{ mouseButton: 4 /* Auxiliary */ }],
    },
    {
        toolName: StackScrollTool.toolName,
        bindings: [{ mouseButton: 524288 /* Wheel */ }],
    },
];

/**
 * 会在视口上留下数据的工具：清除标注时按这张表逐个清。
 * 注意探针工具也要清，它的读数同样挂在 annotation 状态里。
 */
export const ANNOTATION_TOOLS = [
    LengthTool.toolName,
    AngleTool.toolName,
    RectangleROITool.toolName,
    EllipticalROITool.toolName,
    ArrowAnnotateTool.toolName,
    DragProbeTool.toolName,
];

/**
 * 常用 CT 窗宽窗位预设，单位为 Hounsfield（窗位为中心，窗宽为范围）。
 */
export const CT_WINDOW_PRESETS = [
    { key: 'lung', label: '肺窗', center: -600, width: 1500 },
    { key: 'mediastinum', label: '纵隔窗', center: 50, width: 350 },
    { key: 'abdomen', label: '腹部窗', center: 50, width: 400 },
    { key: 'bone', label: '骨窗', center: 400, width: 2000 },
    { key: 'brain', label: '脑窗', center: 40, width: 80 },
];

/**
 * 快捷键 -> toolName，供 Layout 绑定键盘事件。
 */
export const TOOL_SHORTCUTS = SELECTABLE_TOOLS.reduce((map, tool) => {
    map[tool.shortcut.toLowerCase()] = tool.toolName;
    return map;
}, {});