<template>
        <img v-if="imgData" :src="imgData" :alt="`dicom image ${indexNumber}`"  @click="$emit('onClick', indexNumber)"/>
</template>

<script setup>
import dicomToBase64 from '@/utils/dicomToBase64.js';
import { ref, watch,onMounted } from 'vue';

const imgData = ref(null);
const props = defineProps({
    imageUrl: String,
    indexNumber: Number
})

const getBase64 = async (url) => {
    const base64 = await dicomToBase64(url);
    return base64;
}

const setImgData = async (url) => {
    imgData.value = await getBase64(url);
}

watch(() => props.imageUrl, async (newVal) => {
    // console.log("newVal====", newVal);
    setImgData(props.imageUrl);
})

onMounted(() => {
    setImgData(props.imageUrl);
})

</script>

<style scoped>
img {
    width: 200px;
    height: 200px;
    cursor: pointer;
}
</style>