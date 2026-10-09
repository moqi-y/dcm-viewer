<template>
    <div v-if="visible" class="toast" :class="`toast--${type}`" role="status">
        <img class="toast__icon" :src="iconSrc" alt="" />
        <span class="toast__msg">{{ message }}</span>
    </div>
</template>

<script setup>
/**
 * 轻提示。改成受控组件：父组件持有 visible/message/type，
 * 由 toast.js 统一驱动。原来是直接 innerText 改 DOM，
 * 图标永远停在 success，位置也被 transform 推出了屏幕。
 */
import { ref, computed } from 'vue';

const props = defineProps({
    visible: { type: Boolean, default: false },
    message: { type: String, default: '' },
    type: { type: String, default: 'success' },
});

const ICONS = {
    success: '/icon/success-icon.svg',
    error: '/icon/error-icon.svg',
    warning: '/icon/warning-icon.svg',
};

const iconSrc = computed(() => ICONS[props.type] || ICONS.success);
</script>

<style scoped>
.toast {
    position: fixed;
    top: 32px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 80vw;
    padding: 10px 18px;
    font-size: 14px;
    color: #fff;
    background: rgba(9, 12, 42, 0.92);
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    z-index: 9999;
    pointer-events: none;
}

.toast__icon {
    width: 16px;
    height: 16px;
    flex: none;
}

.toast__msg {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* 顶部色条区分提示类型 */
.toast--success {
    border-top: 2px solid #35c46a;
}

.toast--error {
    border-top: 2px solid #ef6a6a;
}

.toast--warning {
    border-top: 2px solid #e8b53a;
}
</style>