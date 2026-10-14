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
					</div>

					<div class="u-card menu">
						<div class="menu-item" @click="goSecurity">
							<div class="menu-icon" style="background: #E7F6EC">
								<AppIcon name="shield" :size="52" color="#15803D" />
							</div>
							<div class="menu-text">
								<span class="menu-title">快捷登录</span>
								<span class="menu-sub">{{ quickText }}</span>
							</div>
							<AppIcon name="chevron-right" :size="44" color="#94A3B8" />
						</div>

						<div class="menu-item" @click="pwdOpen = !pwdOpen">
							<div class="menu-icon" style="background: #E8F0FB">
								<AppIcon name="key" :size="52" color="#1E5AA8" />
							</div>
							<div class="menu-text">
								<span class="menu-title">修改密码</span>
								<span class="menu-sub">定期修改密码更安全</span>
							</div>
							<AppIcon :name="pwdOpen ? 'chevron-down' : 'chevron-right'" :size="44" color="#94A3B8" />
						</div>

						<div v-if="pwdOpen" class="pwd u-fade-in">
							<input v-model="pwd.current" class="u-input" type="password" placeholder="当前密码" />
							<input v-model="pwd.next" class="u-input" type="password" placeholder="新密码（至少 6 位）" />
							<input v-model="pwd.confirm" class="u-input" type="password" placeholder="再输一次新密码" />
							<van-button native-type="button" class="u-btn primary block" :disabled="saving" @click="changePassword">{{ saving ? '正在保存…' : '保存新密码' }}</van-button>
						</div>

						<div class="menu-item" @click="callAdmin">
							<div class="menu-icon" style="background: #FEF3E2">
								<AppIcon name="phone" :size="52" color="#B45309" />
							</div>
							<div class="menu-text">
								<span class="menu-title">联系管理员</span>
								<span class="menu-sub">13899665458</span>
							</div>
							<AppIcon name="chevron-right" :size="44" color="#94A3B8" />
						</div>

						<div class="menu-item" @click="goAbout">
							<div class="menu-icon" style="background: #EEF2F7">
								<AppIcon name="info" :size="52" color="#475569" />
							</div>
							<div class="menu-text">
								<span class="menu-title">关于软件</span>
								<span class="menu-sub">版本信息与反馈方式</span>
							</div>
							<AppIcon name="chevron-right" :size="44" color="#94A3B8" />
						</div>
					</div>

					<van-button native-type="button" class="u-btn danger-ghost block logout" @click="logout">
						<AppIcon name="logout" :size="48" color="#C62828" />
						<span>退出登录</span>
					</van-button>
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

	export default {
		components: { AppHeader, AppIcon },
		data() {
			return {
				user: {},
				quick: null,
				pwdOpen: false,
				saving: false,
				pwd: { current: '', next: '', confirm: '' },
			};
		},
		computed: {
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
					confirmColor: '#C62828',
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
		width: 68px;
		height: 68px;
		border-radius: 50%;
		background: linear-gradient(135deg, #2A6BC2, #0F2F5C);
		color: #FFFFFF;
		font-size: 23px;
		font-weight: 800;
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
		font-size: 22px;
		font-weight: 800;
		color: #0F172A;
	}

	.account {
		margin: 2px 0 6px;
		font-size: 15px;
		color: #64748B;
	}

	.role {
		font-size: 14px;
	}

	.menu {
		padding-top: 4px;
		padding-bottom: 4px;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 68px;
		border-bottom: 1px solid #EEF2F7;
	}

	.menu-item:last-child {
		border-bottom: none;
	}

	.menu-item:active {
		opacity: 0.7;
	}

	.menu-icon {
		width: 44px;
		height: 44px;
		border-radius: 12px;
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
		font-size: 18px;
		font-weight: 700;
		color: #0F172A;
	}

	.menu-sub {
		margin-top: 2px;
		font-size: 14px;
		color: #64748B;
	}

	.pwd {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 4px 0 14px;
		border-bottom: 1px solid #EEF2F7;
	}

	.logout {
		margin-bottom: 16px !important;
	}
</style>
