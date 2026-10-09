import { reactive } from 'vue';
import Toast from '@/components/Toast.vue';
import { createApp } from 'vue';

/**
 * 全局 toast 控制器。
 *
 * 用 Vue 的响应式状态驱动 Toast 组件，而不是直接改 DOM innerText：
 *  - 原实现三个方法完全一样，图标永远是 success 的；
 *  - transform: translate(-20%, -50%) 让提示框整体偏出屏幕；
 *  - 每次调用都新建一个 setTimeout，连续点两下就会出现
 *    “先隐藏又显示” 的闪烁（旧的定时器把新的提示关掉了）。
 */

const state = reactive({
    visible: false,
    message: '',
    type: 'success',
});

const DURATION = 2000;
let timer = null;

const hide = () => {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
    state.visible = false;
};

const show = (message, type = 'success', duration = DURATION) => {
    // 先清掉上一次未结束的定时器，避免旧定时器提前关闭新提示
    if (timer) clearTimeout(timer);

    state.message = message;
    state.type = type;
    state.visible = true;

    timer = setTimeout(() => {
        timer = null;
        state.visible = false;
    }, duration);
};

const div = document.createElement('div');
div.style.position = 'relative';
// Toast 用的是 fixed 定位，这里把容器自身的尺寸影响去掉
div.style.all = 'initial';

const app = createApp(Toast, state);
app.mount(div);
document.body.appendChild(div);

export default function toast() {
    return {
        showSuccess: (message) => show(message, 'success'),
        showError: (message) => show(message, 'error'),
        showWarning: (message) => show(message, 'warning'),
        hide,
    };
}