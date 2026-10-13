// 路由辅助（替代 uni.navigateTo / reLaunch / navigateBack）。
let router = null;
let ionRouter = null;

export function installNav(instance) {
	router = instance;
}

export function setIonRouter(instance) {
	ionRouter = instance;
}

export function navigateTo(url) {
	if (ionRouter) {
		ionRouter.push(url);
	} else if (router) {
		router.push(url);
	}
}

// 清空页面栈并跳转（相当于 uni.reLaunch）
export function reLaunch(url) {
	if (ionRouter) {
		ionRouter.navigate(url, 'root', 'replace');
	} else if (router) {
		router.replace(url);
	}
}

// 在底部标签页之间切换（无转场动画）
export function switchTab(url) {
	if (ionRouter) {
		ionRouter.navigate(url, 'none', 'replace');
	} else if (router) {
		router.replace(url);
	}
}

export function navigateBack(fallback = '/tabs/home') {
	if (ionRouter && ionRouter.canGoBack()) {
		ionRouter.back();
		return;
	}
	reLaunch(fallback);
}

export function currentPath() {
	return router ? router.currentRoute.value.path : '';
}
