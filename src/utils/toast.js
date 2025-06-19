import Toast from "@/components/Toast.vue";
import { createApp } from "vue";

const toastDiv = document.createElement("div");
const toastApp = createApp(Toast, {
    msg: "操作成功"
});
toastApp.mount(toastDiv);
document.body.appendChild(toastDiv);
toastDiv.style.display = "none";

export default function toast() {
    return {
        showSuccess(msg) {
            toastDiv.style.display = "block";
            setMsg(msg);
            setTimeout(() => {
                toastDiv.style.display = "none";
            },1500)
        },
        showError(msg) {
            toastDiv.style.display = "block";
            setMsg(msg);
            setTimeout(() => {
                toastDiv.style.display = "none";
            },1500)
        },
        showWarning(msg) {
            toastDiv.style.display = "block";
            setMsg(msg);
            setTimeout(() => {
                toastDiv.style.display = "none";
            },1500)
        }
    }
}

function setMsg(msg="操作成功") {
    //    获取toastDiv下的toast-msg元素
    const toastMsg = toastDiv.querySelector(".toast-msg");
    toastMsg.innerText = msg;
}