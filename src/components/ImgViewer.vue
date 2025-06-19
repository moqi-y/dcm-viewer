<template>
    <div class="img-container">
        <img v-if="imgData" :src="imgData" :alt="`dicom image ${indexNumber}`"  @click="$emit('onClick', indexNumber)"/>
        <SvgImg class="delete-icon" imgSrc="/icon/删除_delete-one-red.svg" imgTitle="删除" @click="$emit('deleteImage', indexNumber)" />
    </div>

</template>

<script setup>
import dicomToBase64 from '@/utils/dicomToBase64.js';
import { ref, watch,onMounted } from 'vue';
import SvgImg from '@/components/SvgImg.vue';
import taggleLoading from '@/utils/taggleLoading';

const loading = taggleLoading()
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
    loading.show();
    imgData.value = await getBase64(url);
    loading.hide();
}

watch(() => props.imageUrl, async (newVal) => {
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

.img-container{
    position: relative;
}

.delete-icon{
    width: 20px;
    height: 20px;
    position: absolute;
    top: 0;
    right: 5px;
    color: red;
    z-index: 999;
}
</style>