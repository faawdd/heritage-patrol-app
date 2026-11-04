<template>
	<div class="app-page">
		<div class="app-content">
			<div class="u-page">
				<AppHeader title="关于软件" back />
				<div class="u-body pt-3.5">
					<div class="u-card flex flex-col items-center px-4 py-6">
						<div class="flex h-20 w-20 items-center justify-center bg-gradient-primary">
							<AppIcon name="landmark" :size="88" color="var(--c-on-primary)" :stroke="1.8" />
						</div>
						<span class="mt-3 text-[1.375rem] font-extrabold text-ink">鄯善文保巡查</span>
						<span class="mt-1 text-[0.9375rem] text-ink-3">版本 {{ version }}</span>
					</div>

					<div class="u-card">
						<div v-if="updateSupported" class="flex min-h-[3.25rem] items-center justify-between gap-3 border-b border-fill last:border-0" @click="checkUpdate">
							<span class="shrink-0 text-base text-ink-3">检查更新</span>
							<span class="break-all text-right text-base text-ink" :class="!checking ? 'font-bold text-primary' : ''">{{ checking ? '正在检查…' : updateHint }}</span>
						</div>
						<div class="flex min-h-[3.25rem] items-center justify-between gap-3 border-b border-fill last:border-0">
							<span class="shrink-0 text-base text-ink-3">作者</span>
							<span class="break-all text-right text-base text-ink">北辰</span>
						</div>
						<div class="flex min-h-[3.25rem] items-center justify-between gap-3 border-b border-fill last:border-0" @click="call">
							<span class="shrink-0 text-base text-ink-3">手机</span>
							<span class="break-all text-right text-base font-bold text-primary">13899665458</span>
						</div>
						<div class="flex min-h-[3.25rem] items-center justify-between gap-3 border-b border-fill last:border-0">
							<span class="shrink-0 text-base text-ink-3">邮箱</span>
							<span class="break-all text-right text-base text-ink">w1443469207@163.com</span>
						</div>
						<div class="flex min-h-[3.25rem] items-center justify-between gap-3 border-b border-fill last:border-0">
							<span class="shrink-0 text-base text-ink-3">说明</span>
							<span class="break-all text-right text-base text-ink">本软件仅供内部使用</span>
						</div>
					</div>
					<span class="block text-center text-sm text-ink-4">如有建议或发现问题，欢迎联系反馈</span>
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


