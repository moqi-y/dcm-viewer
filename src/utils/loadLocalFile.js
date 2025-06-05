function loadLocalFile(event) {
  return new Promise((resolve, reject) => {
    const file = event.target.files[0];
    if (!file) {
      reject(new Error('No file selected'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // 生成 Base64 URL 或 Blob URL
      const url = URL.createObjectURL(file);
      resolve(url);
    };
    reader.onerror = (error) => {
      reject(error);
    };

    // 使用 FileReader 读取文件内容
    reader.readAsDataURL(file);
  });
}

export default loadLocalFile;