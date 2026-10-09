import { defineStore } from 'pinia';

/**
 * 影像列表与工具状态。
 *
 * 原来的写法 `defineStore('toolsStore', { currentTool: {...} })` 不是合法的
 * Pinia 语法——options store 的第二参数需要 state/getters/actions 三个字段，
 * 而且这个 store 建好之后从头到尾没有任何地方 import 过，属于死代码。
 *
 * 现在真正接上：文件列表、当前切片、当前工具统一由这里持有，
 * 删除切片时的索引修正这种容易出错的逻辑也收在 store 里。
 */
export const useViewerStore = defineStore('viewer', {
    state: () => ({
        /** blob URL 列表（由 Layout 负责 revokeObjectURL） */
        urls: [],
        /** 当前查看的切片下标，null 表示未选择 */
        currentIndex: null,
        /** 当前绑定鼠标左键的工具，null 表示未选择 */
        activeTool: null,
    }),

    getters: {
        total: (state) => state.urls.length,
        isEmpty: (state) => state.urls.length === 0,
        hasImages: (state) => state.urls.length > 0,
    },

    actions: {
        /** 载入一批文件：整体替换，调用方负责先释放旧 URL */
        setFiles(urls) {
            this.urls = urls;
            this.currentIndex = null;
            this.activeTool = null;
        },

        /** 追加单张 */
        addFile(url) {
            this.urls.push(url);
        },

        /**
         * 删除第 index 张。
         * 关键点是同步修正 currentIndex：
         *  - 删的在前面的，索引整体前移；
         *  - 删的就是当前这张，停在原位置，越界则回退到最后一张；
         *  - 列表删空则置空。
         * 不做这件事的话，删掉当前切片后视口会显示错位的那一张。
         */
        removeImage(index) {
            if (index < 0 || index >= this.urls.length) return null;

            const removed = this.urls[index];
            this.urls.splice(index, 1);

            if (!this.urls.length) {
                this.currentIndex = null;
            } else if (this.currentIndex !== null) {
                if (index < this.currentIndex) {
                    this.currentIndex -= 1;
                } else if (index === this.currentIndex) {
                    this.currentIndex = Math.min(this.currentIndex, this.urls.length - 1);
                }
            }
            return removed;
        },

        clear() {
            this.urls = [];
            this.currentIndex = null;
            this.activeTool = null;
        },

        select(index) {
            if (index < 0 || index >= this.urls.length) return;
            this.currentIndex = index;
        },

        /** 再点一次同一个工具等于取消选择 */
        toggleTool(toolName) {
            this.activeTool = this.activeTool === toolName ? null : toolName;
            return this.activeTool;
        },

        clearTool() {
            this.activeTool = null;
        },
    },
});