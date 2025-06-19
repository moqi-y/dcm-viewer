<template>
    <div class="box">
        <img :src="srcImg" alt="icon">
        <div class="toast-msg" style="margin-left: 5px;">{{msg}}</div>
    </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
    msg: {
        type:String,
        default: '提示信息'
    },
    type: {
        type:String,
        default: 'success'
    }
})

const icons = {
    success: '/icon/success-icon.svg',
    error: '/icon/error-icon.svg',
    warning: '/icon/warning-icon.svg'
}

const srcImg = ref(icons[props.type])

</script>

<style scoped>
.box{
    width: fit-content;
    height: fit-content;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #e1e0e0;
    font-size: 14px;
    padding: 10px 20px;
    border-radius: 8px;
    margin: 0 auto;
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translate(-20%, -50%);
    z-index: 9999;
}
</style>