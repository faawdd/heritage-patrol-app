import { createRouter, createWebHistory } from '@ionic/vue-router';
import TabsPage from '@/views/TabsPage.vue';
import { getUser, isAdminUser, isLoggedIn } from '@/lib/auth.js';
import { installNav } from '@/lib/nav.js';

const routes = [
	{ path: '/', redirect: '/login' },
	{ path: '/login', component: () => import('@/views/LoginPage.vue'), meta: { public: true } },
	{
		path: '/tabs/',
		component: TabsPage,
		children: [
			{ path: '', redirect: '/tabs/home' },
			{ path: 'home', component: () => import('@/views/HomePage.vue') },
			{ path: 'records', component: () => import('@/views/RecordsPage.vue') },
			{ path: 'patrol', component: () => import('@/views/PatrolPage.vue') },
			{ path: 'admin', component: () => import('@/views/AdminPage.vue'), meta: { admin: true } },
			{ path: 'my', component: () => import('@/views/MyPage.vue') },
		],
	},
	{ path: '/security', component: () => import('@/views/SecurityPage.vue') },
	{ path: '/about', component: () => import('@/views/AboutPage.vue'), meta: { public: true } },
	{ path: '/kml', component: () => import('@/views/KmlPage.vue') },
	{ path: '/heritage/detail', component: () => import('@/views/HeritageDetailPage.vue') },
	{ path: '/collect', component: () => import('@/views/CollectPage.vue') },
	{ path: '/collect/records', component: () => import('@/views/CollectRecordsPage.vue') },
	{ path: '/:pathMatch(.*)*', redirect: '/login' },
];

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

router.beforeEach((to) => {
	if (to.meta.public) {
		return true;
	}
	if (!isLoggedIn()) {
		return { path: '/login', replace: true };
	}
	if (to.meta.admin && !isAdminUser(getUser())) {
		return { path: '/tabs/home', replace: true };
	}
	return true;
});

installNav(router);

export default router;
