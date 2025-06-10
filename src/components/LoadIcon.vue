<template>
    <div class="mask">
        <img src="/icon/loading-200px-200px.svg" alt="loading">
    </div>
</template>

<script setup>

</script>

<style scoped>
.mask {
    width: 100%;
    height: 100%;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(255, 255, 255, 0.3);
    z-index: 999;
}
img {
    width: 100px;
    height: 100px;
    margin: 0 auto;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 9999;
}
</style>