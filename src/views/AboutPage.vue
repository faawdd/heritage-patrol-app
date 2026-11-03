<template>
	<div class="app-page">
		<div class="app-content">
			<div class="u-page">
				<AppHeader title="关于软件" back />
				<div class="u-body body">
					<div class="u-card brand">
						<div class="logo">
							<AppIcon name="landmark" :size="88" color="var(--c-on-primary)" :stroke="1.8" />
						</div>
						<span class="app-name">鄯善文保巡查</span>
						<span class="app-ver">版本 {{ version }}</span>
					</div>

					<div class="u-card list">
						<div v-if="updateSupported" class="row" @click="checkUpdate">
							<span class="row-label">检查更新</span>
							<span class="row-value" :class="{ link: !checking }">{{ checking ? '正在检查…' : updateHint }}</span>
						</div>
						<div class="row">
							<span class="row-label">作者</span>
							<span class="row-value">北辰</span>
						</div>
						<div class="row" @click="call">
							<span class="row-label">手机</span>
							<span class="row-value link">13899665458</span>
						</div>
						<div class="row">
							<span class="row-label">邮箱</span>
							<span class="row-value">w1443469207@163.com</span>
						</div>
						<div class="row">
							<span class="row-label">说明</span>
							<span class="row-value">本软件仅供内部使用</span>
						</div>
					</div>
					<span class="tip">如有建议或发现问题，欢迎联系反馈</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import { getAppVersion, makePhoneCall } from '@/lib/native.js';
	import { checkForUpdate, isUpdateSupported } from '@/lib/updater.js';
	import { toast } from '@/lib/ui.js';

	export default {
		components: { AppHeader, AppIcon },
		data() {
			return {
				version: '1.0.0',
				updateSupported: isUpdateSupported(),
				checking: false,
				updateHint: '点击检查',
			};
		},
		async mounted() {
			try {
				this.version = (await getAppVersion()) || this.version;
			} catch (e) {
				// keep default
			}
		},
		methods: {
			call() {
				makePhoneCall('13899665458');
			},
			async checkUpdate() {
				if (this.checking) {
					return;
				}
				this.checking = true;
				const result = await checkForUpdate({ manual: true });
				this.checking = false;
				if (result.status === 'update') {
					this.updateHint = `发现新版本 v${result.info.version}`;
				} else if (result.status === 'latest') {
					this.updateHint = '已是最新版本';
					toast('当前已是最新版本', { icon: 'none' });
				} else if (result.status === 'error') {
					this.updateHint = '点击重试';
					toast('检查更新失败，请检查网络后重试', { icon: 'none' });
				}
			},
		},
	};
</script>

<style scoped>
	.body {
		padding-top: 14px;
	}

	.brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24px 16px;
	}

	.logo {
		width: 80px;
		height: 80px;
		border-radius: 22px;
		background: var(--g-primary);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.app-name {
		margin-top: 12px;
		font-size: 1.375rem;
		font-weight: 800;
		color: var(--c-text);
	}

	.app-ver {
		margin-top: 3px;
		font-size: 0.9375rem;
		color: var(--c-text-3);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 52px;
		border-bottom: 1px solid var(--c-fill);
	}

	.row:last-child {
		border-bottom: none;
	}

	.row-label {
		font-size: 1rem;
		color: var(--c-text-3);
		flex-shrink: 0;
	}

	.row-value {
		font-size: 1rem;
		color: var(--c-text);
		text-align: right;
		word-break: break-all;
	}

	.row-value.link {
		color: var(--c-primary);
		font-weight: 700;
	}

	.tip {
		display: block;
		text-align: center;
		font-size: 0.875rem;
		color: var(--c-text-4);
	}
</style>
