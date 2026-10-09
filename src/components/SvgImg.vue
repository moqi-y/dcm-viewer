<template>
    <div :class="`box ${isActive?'active' : ''}`" @click="$emit('onClick')">
        <img :src="imgSrc" alt="" :title="imgTitle">
    </div>
</template>

<script setup>
const props = defineProps({
    imgSrc: {
        type: String,
        default: ''
    },
    imgTitle: {
        type: String,
        default: '工具'
    },
    isActive: {
        type: Boolean,
        default: false
    }
})

</script>

<style scoped>
/*
 * 全局已开启 border-box，这里的宽高包含 padding。
 * 35px = 25px 图标 + 左右各 5px padding，保持改动前的视觉尺寸不变。
 */
.box {
    width: 35px;
    height: 35px;
    padding: 5px;
    border-radius: 50%;
    cursor: pointer;
}

.box:hover {
    background: #e9e7e768;
}

.active {
    background: #e9e7e768;
}

img {
    width: 100%;
    height: 100%;
    object-fit: contain
}
</style>