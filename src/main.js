import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

/* Vant 样式 */
import 'vant/lib/index.css';

/* Vant 主题定制 */
import './theme/vant-theme.css';

/* 主题与全局设计系统 */
import './theme/variables.css';
import './theme/global.css';

const app = createApp(App).use(router);

router.isReady().then(() => {
	app.mount('#app');
});
