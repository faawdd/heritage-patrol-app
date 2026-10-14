// 路由辅助（替代 uni.navigateTo / reLaunch / navigateBack）。
let router = null;
let rootPosition = 0;

export function installNav(instance) {
	router = instance;
	rootPosition = window.history.state?.position ?? 0;
}

export function navigateTo(url) {
	return router.push(url);
}

// 清空页面栈并跳转（相当于 uni.reLaunch）
export function reLaunch(url) {
	rootPosition = window.history.state?.position ?? 0;
	return router.replace(url);
}

// 在底部标签页之间切换（无转场动画）
export function switchTab(url) {
	return router.replace(url);
}

export function canGoBack() {
	return !!window.history.state?.back && (window.history.state?.position ?? 0) > rootPosition;
}

export function navigateBack(fallback = '/tabs/home') {
	if (canGoBack()) {
		router.back();
		return;
	}
	return reLaunch(fallback);
}

export function currentPath() {
	return router ? router.currentRoute.value.path : '';
}
