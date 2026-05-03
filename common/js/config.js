const PROD_API_BASE_URL = 'https://beichenhome.top:9081/app-api';

// #ifdef H5
// H5 本地调试直连后端，避免代理未生效时请求落到 localhost 导致 404
const API_BASE_URL = PROD_API_BASE_URL;
// #endif
// #ifndef H5
const API_BASE_URL = PROD_API_BASE_URL;
// #endif
const WEB_BASE_URL = 'https://beichenhome.top:9081';

export default {
	API_BASE_URL,
	WEB_BASE_URL,
};
