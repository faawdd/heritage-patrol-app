import { getPageTitle, t as translate } from './i18n.js';

export default function createPageI18n(pageKey) {
	return {
		created() {
			this.$nextTick(() => {
				this.updateNavigationTitle();
			});
		},
		onShow() {
			this.updateNavigationTitle();
		},
		methods: {
			t(key, params) {
				return translate(key, params);
			},
			updateNavigationTitle() {
				uni.setNavigationBarTitle({
					title: getPageTitle(pageKey),
				});
			},
		},
	};
}