<template>
	<view class="u-page has-tabbar">
		<AppHeader title="我的" tall />

		<view class="u-body overlap">
			<view class="u-card profile">
				<view class="avatar">{{ avatarText }}</view>
				<view class="profile-info">
					<text class="name">{{ user.full_name || user.username || '-' }}</text>
					<text class="account">账号：{{ user.username || '-' }}</text>
					<text class="u-badge info role">{{ roleText }}</text>
				</view>
			</view>

			<view class="u-card menu">
				<view class="menu-item" @click="goSecurity">
					<view class="menu-icon" style="background: #E7F6EC">
						<AppIcon name="shield" :size="52" color="#15803D" />
					</view>
					<view class="menu-text">
						<text class="menu-title">快捷登录</text>
						<text class="menu-sub">{{ quickText }}</text>
					</view>
					<AppIcon name="chevron-right" :size="44" color="#94A3B8" />
				</view>

				<view class="menu-item" @click="pwdOpen = !pwdOpen">
					<view class="menu-icon" style="background: #E8F0FB">
						<AppIcon name="key" :size="52" color="#1E5AA8" />
					</view>
					<view class="menu-text">
						<text class="menu-title">修改密码</text>
						<text class="menu-sub">定期修改密码更安全</text>
					</view>
					<AppIcon :name="pwdOpen ? 'chevron-down' : 'chevron-right'" :size="44" color="#94A3B8" />
				</view>

				<view v-if="pwdOpen" class="pwd u-fade-in">
					<input v-model="pwd.current" class="u-input" password placeholder="当前密码" placeholder-class="u-placeholder" />
					<input v-model="pwd.next" class="u-input" password placeholder="新密码（至少 6 位）" placeholder-class="u-placeholder" />
					<input v-model="pwd.confirm" class="u-input" password placeholder="再输一次新密码" placeholder-class="u-placeholder" />
					<button class="u-btn primary block" :disabled="saving" @click="changePassword">{{ saving ? '正在保存…' : '保存新密码' }}</button>
				</view>

				<view class="menu-item" @click="callAdmin">
					<view class="menu-icon" style="background: #FEF3E2">
						<AppIcon name="phone" :size="52" color="#B45309" />
					</view>
					<view class="menu-text">
						<text class="menu-title">联系管理员</text>
						<text class="menu-sub">13899665458</text>
					</view>
					<AppIcon name="chevron-right" :size="44" color="#94A3B8" />
				</view>

				<view class="menu-item" @click="goAbout">
					<view class="menu-icon" style="background: #EEF2F7">
						<AppIcon name="info" :size="52" color="#475569" />
					</view>
					<view class="menu-text">
						<text class="menu-title">关于软件</text>
						<text class="menu-sub">版本信息与反馈方式</text>
					</view>
					<AppIcon name="chevron-right" :size="44" color="#94A3B8" />
				</view>
			</view>

			<button class="u-btn danger-ghost block logout" @click="logout">
				<AppIcon name="logout" :size="48" color="#C62828" />
				<text>退出登录</text>
			</button>
		</view>

		<BottomNav current="my" :userInfo="user" />
	</view>
</template>

<script>
	import AppHeader from '../../components/AppHeader.vue';
	import AppIcon from '../../components/AppIcon.vue';
	import BottomNav from '../../components/BottomNav.vue';
	import { clearSession, getToken, getUser, isAdminUser, setUser } from '../../common/js/auth.js';
	import { getRoleLabel } from '../../common/js/i18n.js';
	import { apiRequest, extractError, issueDeviceToken } from '../../common/js/request.js';
	import { biometricLabel, clearQuickLogin, getQuickLogin, hasQuickLogin } from '../../common/js/quickLogin.js';

	export default {
		components: { AppHeader, AppIcon, BottomNav },
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
		onLoad() {
			if (!getToken()) {
				uni.reLaunch({ url: '/pages/index/index' });
				return;
			}
			this.user = getUser() || {};
			this.loadMe();
		},
		onShow() {
			this.quick = getQuickLogin();
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
					uni.showToast({ title: '请把三个密码都填上', icon: 'none' });
					return;
				}
				if (next.length < 6) {
					uni.showToast({ title: '新密码至少 6 位', icon: 'none' });
					return;
				}
				if (next !== confirm) {
					uni.showToast({ title: '两次输入的新密码不一样', icon: 'none' });
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
							uni.showToast({ title: '密码已修改', icon: 'success' });
							// 改密码后旧的快捷登录凭证失效，重新签发
							if (hasQuickLogin(getQuickLogin())) {
								issueDeviceToken().catch(() => null);
							}
							return;
						}
						uni.showToast({ title: extractError(res, '修改失败'), icon: 'none' });
					})
					.catch(() => uni.showToast({ title: '网络不好，请重试', icon: 'none' }))
					.finally(() => {
						this.saving = false;
					});
			},
			goSecurity() {
				uni.navigateTo({ url: '/pages/security/security' });
			},
			goAbout() {
				uni.navigateTo({ url: '/pages/about/about' });
			},
			callAdmin() {
				uni.makePhoneCall({ phoneNumber: '13899665458', fail: () => null });
			},
			logout() {
				uni.showModal({
					title: '退出登录',
					content: '退出后需要重新输入账号密码登录，手势和指纹登录也会关闭。确定退出吗？',
					confirmText: '确定退出',
					confirmColor: '#C62828',
					cancelText: '取消',
					success: (res) => {
						if (!res.confirm) {
							return;
						}
						clearQuickLogin();
						clearSession();
						uni.reLaunch({ url: '/pages/index/index' });
					},
				});
			},
		},
	};
</script>

<style>
	.overlap {
		margin-top: -96rpx;
		position: relative;
		z-index: 2;
	}

	.profile {
		display: flex;
		align-items: center;
		gap: 28rpx;
	}

	.avatar {
		width: 136rpx;
		height: 136rpx;
		border-radius: 50%;
		background: linear-gradient(135deg, #2A6BC2, #0F2F5C);
		color: #FFFFFF;
		font-size: 46rpx;
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
		font-size: 44rpx;
		font-weight: 800;
		color: #0F172A;
	}

	.account {
		margin: 4rpx 0 12rpx;
		font-size: 30rpx;
		color: #64748B;
	}

	.role {
		font-size: 28rpx;
	}

	.menu {
		padding-top: 8rpx;
		padding-bottom: 8rpx;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 24rpx;
		min-height: 136rpx;
		border-bottom: 2rpx solid #EEF2F7;
	}

	.menu-item:last-child {
		border-bottom: none;
	}

	.menu-item:active {
		opacity: 0.7;
	}

	.menu-icon {
		width: 88rpx;
		height: 88rpx;
		border-radius: 24rpx;
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
		font-size: 36rpx;
		font-weight: 700;
		color: #0F172A;
	}

	.menu-sub {
		margin-top: 4rpx;
		font-size: 28rpx;
		color: #64748B;
	}

	.pwd {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		padding: 8rpx 0 28rpx;
		border-bottom: 2rpx solid #EEF2F7;
	}

	.logout {
		margin-bottom: 32rpx !important;
	}
</style>
