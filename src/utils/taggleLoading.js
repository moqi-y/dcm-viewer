import LoadIcon from "@/components/LoadIcon.vue";
import { createApp } from "vue";

/**
 * @description: 加载动画
 * @return {Object} show() 显示 loading hide() 隐藏 loading
 * @demo
 * taggleLoading().show()
 * taggleLoading().hide()
 */

const div = document.createElement("div");
const app = createApp(LoadIcon);

export default function taggleLoading() {
    app.mount(div);
    document.body.appendChild(div);
    div.style.display = "none";
    return {
        show() {
            div.style.display = "block";
        },
        hide() {
            div.style.display = "none";
        }
    }
}
