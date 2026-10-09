<template>
    <label class="custom-upload-button">
        <img class="upload-icon" src="/icon/上传_upload.svg" alt="" />
        <span>上传文件</span>
        <input
            ref="inputRef"
            class="visually-hidden-input"
            type="file"
            multiple
            accept=".dcm,application/dicom"
            @change="handleChange"
        />
    </label>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['change']);

const inputRef = ref(null);

const handleChange = (event) => {
    const files = event.target.files;
    if (files && files.length) {
        emit('change', files);
    }
    // 重置 value，否则连续选择同一个文件不会再触发 change
    if (inputRef.value) {
        inputRef.value.value = '';
    }
};
</script>

<style scoped>
.custom-upload-button {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    width: 110px;
    height: 40px;
    background: rgb(80, 165, 245);
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    border-radius: 5px;
    transition: background 0.3s ease;
    overflow: hidden;
}

.custom-upload-button:hover {
    background: rgba(80, 165, 245, 0.8);
}

.upload-icon {
    width: 20px;
    height: 18px;
}

/*
 * 不能用 display:none —— 那样 input 不可聚焦，键盘用户没法操作。
 * 这里让透明的 input 铺满整个按钮：既保留焦点和点击能力，
 * 又不影响视觉效果。
 */
.visually-hidden-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
}
</style>