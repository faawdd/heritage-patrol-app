import { Capacitor } from '@capacitor/core';

const PROD_API_BASE_URL = 'https://beichenhome.top:9081/app-api';
const WEB_BASE_URL = 'https://beichenhome.top:9081';

// 浏览器开发模式走 Vite 代理（/app-api），原生 App 直连生产接口（CapacitorHttp 无跨域限制）。
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
	|| (import.meta.env.DEV && !Capacitor.isNativePlatform() ? '/app-api' : PROD_API_BASE_URL);

export default {
	API_BASE_URL,
	WEB_BASE_URL,
};
