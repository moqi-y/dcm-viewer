<template>
    <label class="custom-upload-button">
      <img style="width: 20px;height: 18px;margin:0 2px 2px 0;" src="/icon/上传_upload.svg" alt="Upload" class="upload-icon" />
        <input type="file" multiple ref="inputRef" @change="handleChange" class="hidden-input" />
        上传文件
    </label>
</template>

<script setup>
import { ref } from 'vue';

const emits = defineEmits(['change']);
// 获取文件输入元素
const inputRef = ref(null);

const handleChange = (event) => {
  
    const files = event.target.files;
    emits('change', files);
}

</script>

<style scoped>
.custom-upload-button {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100px;
  height: 40px;
  background: rgb(80, 165, 245);
  color: white;
  font-size: 14px;
  cursor: pointer;
  border-radius: 5px;
  transition: background 0.3s ease;
}

.custom-upload-button:hover {
  background: rgb(80, 165, 245,0.8);
}

.hidden-input {
  display: none; /* 隐藏原生的input元素 */
}
</style>