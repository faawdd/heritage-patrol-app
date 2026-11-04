<template>
	<div class="app-page">
		<div class="app-content">
			<div class="u-page">
				<AppHeader title="我的" tall />

				<div class="u-body overlap">
					<div class="u-card flex items-center gap-3.5">
						<div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-[1.375rem] font-semibold text-on-primary">{{ avatarText }}</div>
						<div class="flex min-w-0 flex-1 flex-col items-start">
							<span class="text-xl font-semibold text-ink">{{ user.full_name || user.username || '-' }}</span>
							<span class="my-0.5 mb-1.5 text-sm text-ink-3">账号：{{ user.username || '-' }}</span>
							<span class="u-badge info text-[0.8125rem]">{{ roleText }}</span>
						</div>
						<van-button native-type="button" class="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-danger bg-danger-bg px-3 text-xs font-semibold text-danger" @click="logout">
							<AppIcon name="logout" :size="40" color="var(--c-danger)" />
							<span>退出登录</span>
						</van-button>
					</div>

					<div class="u-card menu">
						<div class="flex min-h-16 items-center gap-3 border-b border-line last:border-0 active:opacity-70" @click="goSecurity">
							<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.625rem] bg-success-bg">
								<AppIcon name="shield" :size="52" color="var(--c-success)" />
							</div>
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="text-base font-semibold text-ink">快捷登录</span>
								<span class="mt-0.5 text-[0.8125rem] text-ink-3">{{ quickText }}</span>
							</div>
							<AppIcon name="chevron-right" :size="44" color="var(--c-text-4)" />
						</div>

						<div class="flex min-h-16 items-center gap-3 border-b border-line last:border-0 active:opacity-70" @click="pwdOpen = !pwdOpen">
							<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.625rem] bg-primary-light">
								<AppIcon name="key" :size="52" color="var(--c-primary)" />
							</div>
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="text-base font-semibold text-ink">修改密码</span>
								<span class="mt-0.5 text-[0.8125rem] text-ink-3">定期修改密码更安全</span>
							</div>
							<AppIcon :name="pwdOpen ? 'chevron-down' : 'chevron-right'" :size="44" color="var(--c-text-4)" />
						</div>

						<div v-if="pwdOpen" class="pwd u-fade-in flex flex-col gap-2.5 border-b border-line px-0 pt-1 pb-3.5">
							<van-field v-model="pwd.current" class="u-input" type="password" placeholder="当前密码" :border="false" />
							<van-field v-model="pwd.next" class="u-input" type="password" placeholder="新密码（至少 6 位）" :border="false" />
							<van-field v-model="pwd.confirm" class="u-input" type="password" placeholder="再输一次新密码" :border="false" />
							<van-button native-type="button" class="u-btn primary block" :disabled="saving" @click="changePassword">{{ saving ? '正在保存…' : '保存新密码' }}</van-button>
						</div>

						<div class="flex min-h-16 items-center gap-3 border-b border-line last:border-0 active:opacity-70" @click="callAdmin">
							<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.625rem] bg-warning-bg">
								<AppIcon name="phone" :size="52" color="var(--c-warning)" />
							</div>
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="text-base font-semibold text-ink">联系管理员</span>
								<span class="mt-0.5 text-[0.8125rem] text-ink-3">13899665458</span>
							</div>
							<AppIcon name="chevron-right" :size="44" color="var(--c-text-4)" />
						</div>

						<div class="flex min-h-16 items-center gap-3 border-b border-line last:border-0 active:opacity-70" @click="goAbout">
							<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.625rem] bg-fill">
								<AppIcon name="info" :size="52" color="var(--c-text-2)" />
							</div>
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="text-base font-semibold text-ink">关于软件</span>
								<span class="mt-0.5 text-[0.8125rem] text-ink-3">版本信息与反馈方式</span>
							</div>
							<AppIcon name="chevron-right" :size="44" color="var(--c-text-4)" />
						</div>
					</div>

					<div class="u-card flex flex-col gap-3.5">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.625rem] bg-primary-light">
								<AppIcon name="edit" :size="52" color="var(--c-primary)" />
							</div>
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="text-base font-semibold text-ink">外观设置</span>
								<span class="mt-0.5 text-[0.8125rem] text-ink-3">主题、颜色与字体大小</span>
							</div>
						</div>

						<div class="flex flex-col gap-2">
							<span class="text-sm font-semibold text-ink">深色模式</span>
							<div class="flex overflow-hidden rounded-[var(--r-input)] border border-line bg-fill">
								<van-button
									v-for="(mode, index) in themeModes"
									:key="mode.key"
									native-type="button"
									plain
									class="min-h-11 min-w-0 flex-1 !border-0 !border-r !border-line px-1 text-[0.8125rem] font-medium text-ink-2 transition last:!border-r-0"
									:class="[index === themeModes.length - 1 ? '!border-r-0' : '', prefs.theme === mode.key ? '!bg-primary !font-semibold !text-on-primary' : '!bg-transparent']"
									:aria-pressed="prefs.theme === mode.key"
									@click="setPref('theme', mode.key)"
								>{{ mode.name }}</van-button>
							</div>
							<span class="text-xs text-ink-3">「跟随系统」会随手机深色模式自动切换</span>
						</div>

						<div class="flex flex-col gap-2">
							<span class="text-sm font-semibold text-ink">主题色</span>
							<div class="flex gap-3.5">
								<van-button
									v-for="color in themeColors"
									:key="color.key"
									native-type="button"
									plain
									class="h-11 w-11 !min-w-11 !border-0 !p-0 transition active:scale-95"
									:class="prefs.color === color.key ? 'rounded-full ring-2 ring-primary ring-offset-2 ring-offset-surface' : 'rounded-full'"
									:style="{ background: color.hex }"
									:aria-label="color.name"
									:aria-pressed="prefs.color === color.key"
									@click="setPref('color', color.key)"
								>
									<AppIcon v-if="prefs.color === color.key" name="check" :size="32" color="var(--c-on-primary)" :stroke="3" />
								</van-button>
							</div>
						</div>

						<div class="flex flex-col gap-2">
							<span class="text-sm font-semibold text-ink">字体大小</span>
							<div class="flex overflow-hidden rounded-[var(--r-input)] border border-line bg-fill">
								<van-button
									v-for="(font, index) in fontSizes"
									:key="font.key"
									native-type="button"
									plain
									class="min-h-11 min-w-0 flex-1 !border-0 !border-r !border-line px-1 text-[0.8125rem] font-medium text-ink-2 transition last:!border-r-0"
									:class="[index === fontSizes.length - 1 ? '!border-r-0' : '', prefs.fontSize === font.key ? '!bg-primary !font-semibold !text-on-primary' : '!bg-transparent']"
									:aria-pressed="prefs.fontSize === font.key"
									@click="setPref('fontSize', font.key)"
								>{{ font.name }}</van-button>
							</div>
							<span class="rounded-[var(--r-input)] border border-dashed border-[var(--c-line-strong)] bg-fill px-3 py-2 text-base text-ink-2">巡查上报，记录文物点情况</span>
						</div>
					</div>

				</div>

			</div>
		</div>
	</div>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
		import { navigateTo, reLaunch } from '@/lib/nav.js';
	import { makePhoneCall } from '@/lib/native.js';
	import { showModal, toast } from '@/lib/ui.js';
	import { clearSession, getToken, getUser, isAdminUser, setUser } from '@/lib/auth.js';
	import { getRoleLabel } from '@/lib/i18n.js';
	import { apiRequest, extractError, issueDeviceToken } from '@/lib/request.js';
	import { biometricLabel, clearQuickLogin, getQuickLogin, hasQuickLogin } from '@/lib/quickLogin.js';
	import { FONT_SIZES, THEME_COLORS, THEME_MODES, settings, updateSettings } from '@/lib/settings.js';

	export default {
		components: { AppHeader, AppIcon },
		data() {
			return {
				user: {},
				quick: null,
				pwdOpen: false,
				saving: false,
				pwd: { current: '', next: '', confirm: '' },
				themeModes: THEME_MODES,
				themeColors: THEME_COLORS,
				fontSizes: FONT_SIZES,
			};
		},
		computed: {
			prefs() {
				return settings;
			},
			avatarText() {
				const name = this.user.full_name || this.user.username || '我';
				return name.slice(-2);
			},
			roleText() {
				return getRoleLabel(this.user.role || (isAdminUser(this.user) ? '管理员' : '文物看护员'));
			},
			quickText() {
				const q = this.quick;
				if (!hasQuickLogin(q)) {
					return '未开启，开启后不用每次输密码';
				}
				const parts = [];
				if (q.gestureHash) parts.push('手势');
				if (q.biometric) parts.push(biometricLabel(q.biometric));
				return `已开启：${parts.join(' + ')}`;
			},
		},
		activated() {
			if (!getToken()) {
				reLaunch('/login');
				return;
			}
			this.user = getUser() || {};
			this.quick = getQuickLogin();
			this.loadMe();
		},
		methods: {
			setPref(key, value) {
				updateSettings({ [key]: value });
			},
			loadMe() {
				apiRequest({ url: '/api/auth/me' })
					.then((res) => {
						if (res.statusCode === 200 && res.data && res.data.user) {
							this.user = res.data.user;
							setUser(res.data.user);
						}
					})
					.catch(() => null);
			},
			changePassword() {
				const { current, next, confirm } = this.pwd;
				if (!current || !next || !confirm) {
					toast('请把三个密码都填上', { icon: 'none' });
					return;
				}
				if (next.length < 6) {
					toast('新密码至少 6 位', { icon: 'none' });
					return;
				}
				if (next !== confirm) {
					toast('两次输入的新密码不一样', { icon: 'none' });
					return;
				}
				this.saving = true;
				apiRequest({
					url: '/api/auth/change-password',
					method: 'POST',
					data: { current_password: current, new_password: next },
				})
					.then((res) => {
						if (res.statusCode === 200) {
							this.pwd = { current: '', next: '', confirm: '' };
							this.pwdOpen = false;
							toast('密码已修改', { icon: 'success' });
							// 改密码后旧的快捷登录凭证失效，重新签发
							if (hasQuickLogin(getQuickLogin())) {
								issueDeviceToken().catch(() => null);
							}
							return;
						}
						toast(extractError(res, '修改失败'), { icon: 'none' });
					})
					.catch(() => toast('网络不好，请重试', { icon: 'none' }))
					.finally(() => {
						this.saving = false;
					});
			},
			goSecurity() {
				navigateTo('/security');
			},
			goAbout() {
				navigateTo('/about');
			},
			callAdmin() {
				makePhoneCall('13899665458');
			},
			async logout() {
				const res = await showModal({
					title: '退出登录',
					content: '退出后需要重新输入账号密码登录，手势和指纹登录也会关闭。确定退出吗？',
					confirmText: '确定退出',
					confirmColor: 'var(--c-danger)',
					cancelText: '取消',
				});
				if (!res.confirm) {
					return;
				}
				clearQuickLogin();
				clearSession();
				reLaunch('/login');
			},
		},
	};
</script>

<style scoped>
	.pwd :deep(.van-field) {
		min-height: 3rem;
		border: 1px solid var(--c-line);
		border-radius: var(--r-input);
		background: var(--c-fill);
		transition: background-color 150ms ease, border-color 150ms ease;
	}
	.pwd :deep(.van-field:focus-within) {
		border-color: var(--c-primary);
		background: var(--c-surface);
		box-shadow: 0 0 0 2px var(--focus-ring);
	}
	.pwd :deep(.van-field__control) {
		font-size: var(--text-base);
		color: var(--c-text);
	}
</style>
