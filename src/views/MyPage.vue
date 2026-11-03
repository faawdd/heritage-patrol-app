<template>
	<div class="app-page">
		<div class="app-content">
			<div class="u-page">
				<AppHeader title="我的" tall />

				<div class="u-body overlap">
					<div class="u-card profile">
						<div class="avatar">{{ avatarText }}</div>
						<div class="profile-info">
							<span class="name">{{ user.full_name || user.username || '-' }}</span>
							<span class="account">账号：{{ user.username || '-' }}</span>
							<span class="u-badge info role">{{ roleText }}</span>
						</div>
						<button type="button" class="logout" @click="logout">
							<AppIcon name="logout" :size="40" color="var(--c-danger)" />
							<span>退出登录</span>
						</button>
					</div>

					<div class="u-card menu">
						<div class="menu-item" @click="goSecurity">
							<div class="menu-icon" style="background: var(--c-success-bg)">
								<AppIcon name="shield" :size="52" color="var(--c-success)" />
							</div>
							<div class="menu-text">
								<span class="menu-title">快捷登录</span>
								<span class="menu-sub">{{ quickText }}</span>
							</div>
							<AppIcon name="chevron-right" :size="44" color="var(--c-text-4)" />
						</div>

						<div class="menu-item" @click="pwdOpen = !pwdOpen">
							<div class="menu-icon" style="background: var(--c-primary-light)">
								<AppIcon name="key" :size="52" color="var(--c-primary)" />
							</div>
							<div class="menu-text">
								<span class="menu-title">修改密码</span>
								<span class="menu-sub">定期修改密码更安全</span>
							</div>
							<AppIcon :name="pwdOpen ? 'chevron-down' : 'chevron-right'" :size="44" color="var(--c-text-4)" />
						</div>

						<div v-if="pwdOpen" class="pwd u-fade-in">
							<input v-model="pwd.current" class="u-input" type="password" placeholder="当前密码" />
							<input v-model="pwd.next" class="u-input" type="password" placeholder="新密码（至少 6 位）" />
							<input v-model="pwd.confirm" class="u-input" type="password" placeholder="再输一次新密码" />
							<van-button native-type="button" class="u-btn primary block" :disabled="saving" @click="changePassword">{{ saving ? '正在保存…' : '保存新密码' }}</van-button>
						</div>

						<div class="menu-item" @click="callAdmin">
							<div class="menu-icon" style="background: var(--c-warning-bg)">
								<AppIcon name="phone" :size="52" color="var(--c-warning)" />
							</div>
							<div class="menu-text">
								<span class="menu-title">联系管理员</span>
								<span class="menu-sub">13899665458</span>
							</div>
							<AppIcon name="chevron-right" :size="44" color="var(--c-text-4)" />
						</div>

						<div class="menu-item" @click="goAbout">
							<div class="menu-icon" style="background: var(--c-fill)">
								<AppIcon name="info" :size="52" color="var(--c-text-2)" />
							</div>
							<div class="menu-text">
								<span class="menu-title">关于软件</span>
								<span class="menu-sub">版本信息与反馈方式</span>
							</div>
							<AppIcon name="chevron-right" :size="44" color="var(--c-text-4)" />
						</div>
					</div>

					<div class="u-card appearance">
						<div class="appearance-head">
							<div class="menu-icon" style="background: var(--c-primary-light)">
								<AppIcon name="edit" :size="52" color="var(--c-primary)" />
							</div>
							<div class="menu-text">
								<span class="menu-title">外观设置</span>
								<span class="menu-sub">主题、颜色与字体大小</span>
							</div>
						</div>

						<div class="setting-row">
							<span class="setting-label">深色模式</span>
							<div class="seg">
								<button
									v-for="mode in themeModes"
									:key="mode.key"
									type="button"
									class="seg-item"
									:class="{ active: prefs.theme === mode.key }"
									@click="setPref('theme', mode.key)"
								>{{ mode.name }}</button>
							</div>
							<span class="setting-hint">「跟随系统」会随手机深色模式自动切换</span>
						</div>

						<div class="setting-row">
							<span class="setting-label">主题色</span>
							<div class="swatches">
								<button
									v-for="color in themeColors"
									:key="color.key"
									type="button"
									class="swatch"
									:class="{ active: prefs.color === color.key }"
									:style="{ background: color.hex }"
									:aria-label="color.name"
									@click="setPref('color', color.key)"
								>
									<AppIcon v-if="prefs.color === color.key" name="check" :size="32" color="#FFFFFF" :stroke="3" />
								</button>
							</div>
						</div>

						<div class="setting-row">
							<span class="setting-label">字体大小</span>
							<div class="seg">
								<button
									v-for="font in fontSizes"
									:key="font.key"
									type="button"
									class="seg-item"
									:class="{ active: prefs.fontSize === font.key }"
									@click="setPref('fontSize', font.key)"
								>{{ font.name }}</button>
							</div>
							<span class="setting-preview">巡查上报，记录文物点情况</span>
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
	.overlap {
		margin-top: -48px;
		position: relative;
		z-index: 2;
	}

	.profile {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.avatar {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--g-primary);
		color: var(--c-on-primary);
		font-size: 1.375rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.profile-info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
	}

	.name {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--c-text);
	}

	.account {
		margin: 2px 0 6px;
		font-size: 0.875rem;
		color: var(--c-text-3);
	}

	.role {
		font-size: 0.8125rem;
	}

	.menu {
		padding-top: 4px;
		padding-bottom: 4px;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 64px;
		border-bottom: 1px solid var(--c-line);
	}

	.menu-item:last-child {
		border-bottom: none;
	}

	.menu-item:active {
		opacity: 0.7;
	}

	.menu-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.menu-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.menu-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--c-text);
	}

	.menu-sub {
		margin-top: 2px;
		font-size: 0.8125rem;
		color: var(--c-text-3);
	}

	.pwd {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 4px 0 14px;
		border-bottom: 1px solid var(--c-line);
	}

	/* 外观设置 */
	.appearance {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.appearance-head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.setting-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.setting-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--c-text);
	}

	.setting-hint {
		font-size: 0.75rem;
		color: var(--c-text-3);
	}

	.setting-preview {
		font-size: 1rem;
		color: var(--c-text-2);
		padding: 8px 12px;
		border-radius: var(--r-input);
		background: var(--c-fill);
		border: 1px dashed var(--c-line-strong);
	}

	.seg {
		display: flex;
		gap: 0;
		border: 1px solid var(--c-line);
		border-radius: var(--r-input);
		overflow: hidden;
		background: var(--c-fill);
	}

	.seg-item {
		flex: 1;
		min-width: 0;
		padding: 10px 4px;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--c-text-2);
		background: transparent;
		border: none;
		border-right: 1px solid var(--c-line);
		transition: all 150ms ease;
	}

	.seg-item:last-child {
		border-right: none;
	}

	.seg-item.active {
		color: var(--c-on-primary, #FFFFFF);
		background: var(--c-primary);
		font-weight: 600;
	}

	.swatches {
		display: flex;
		gap: 14px;
	}

	.swatch {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 2px solid transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition: all 150ms ease;
	}

	.swatch.active {
		box-shadow: 0 0 0 2px var(--c-surface), 0 0 0 4px var(--c-primary);
	}

	.swatch:active {
		transform: scale(0.94);
	}

	.logout {
		margin-left: auto;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 8px 12px;
		border: 1px solid var(--c-danger);
		border-radius: 999px;
		background: var(--c-danger-bg);
		color: var(--c-danger);
		font-size: 0.8125rem;
		font-weight: 600;
	}
</style>
