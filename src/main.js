import { createApp } from 'vue';
import { IonicVue } from '@ionic/vue';
import App from './App.vue';
import router from './router';

/* Ionic 核心样式 */
import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/* 主题与全局设计系统 */
import './theme/variables.css';
import './theme/global.css';

const app = createApp(App)
	.use(IonicVue, {
		mode: 'md',
		animated: true,
		backButtonText: '',
	})
	.use(router);

router.isReady().then(() => {
	app.mount('#app');
});
