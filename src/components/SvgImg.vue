<template>
    <div class="box" @click="$emit('onClick')">
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
    }
})

</script>

<style scoped>
.box {
    width: 25px;
    height: 25px;
    padding: 5px;
    border-radius: 50%;
    cursor: pointer;
}

.box:hover {
    background: #e9e7e768;
}

img {
    width: 100%;
    height: 100%;
    object-fit: contain
}
</style>