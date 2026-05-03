<template>
	<view class="page">
		<view class="hero">
			<view>
				<text class="hero-kicker">{{ t('my.heroLabel') }}</text>
				<text class="hero-title">{{ t('my.title') }}</text>
				<text class="hero-subtitle">{{ t('my.subtitle') }}</text>
			</view>
		</view>

		<view class="card profile-card">
			<text class="label">{{ t('my.fullName') }}</text>
			<text class="value">{{ user.full_name || '-' }}</text>
			<text class="label">{{ t('my.username') }}</text>
			<text class="value">{{ user.username || '-' }}</text>
			<text class="label">{{ t('my.role') }}</text>
			<text class="value">{{ getRoleDisplay() }}</text>
		</view>

		<view class="card password-card">
			<text class="section-title">{{ t('my.changePassword') }}</text>
			<input class="input" password v-model="passwordForm.current_password" :placeholder="t('my.currentPassword')" />
			<input class="input" password v-model="passwordForm.new_password" :placeholder="t('my.newPassword')" />
			<input class="input" password v-model="passwordForm.confirm_password" :placeholder="t('my.confirmPassword')" />
			<button class="action-btn primary" @click="changePassword" :disabled="saving">{{ saving ? t('my.saving') : t('my.saveNewPassword') }}</button>
		</view>

		<view class="card logout-card">
			<button class="action-btn danger" @click="logout">{{ t('my.logout') }}</button>
		</view>

		<view class="card about-card">
			<text class="section-title">{{ t('my.aboutSoftware') }}</text>
			<text class="about-desc">{{ t('my.aboutSoftwareDesc') }}</text>
			<button class="action-btn secondary" @click="goAbout">{{ t('my.openAboutSoftware') }}</button>
		</view>

		<BottomNav current="my" :userInfo="user" />
	</view>
</template>

<script>
	import config from '../../common/js/config.js';
	import { clearSession, getAuthHeader, getToken, getUser, setSession } from '../../common/js/auth.js';
	import { getRoleLabel } from '../../common/js/i18n.js';
	import createPageI18n from '../../common/js/pageI18n.js';
	import BottomNav from '../../components/BottomNav.vue';

	export default {
		mixins: [createPageI18n('my')],
		components: {
			BottomNav,
		},
		data() {
			return {
				user: {},
				saving: false,
				passwordForm: {
					current_password: '',
					new_password: '',
					confirm_password: '',
				},
			};
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
			if (getToken()) {
				this.loadMe(false);
			}
		},
		methods: {
			getRoleDisplay() {
				if (!this.user || (!this.user.role && !this.user.is_admin)) {
					return '-';
				}
				const rawRole = this.user.role || (this.user.is_admin ? '管理员' : '看护员');
				return getRoleLabel(rawRole);
			},
			loadMe(showLoading = true) {
				if (showLoading) {
					uni.showLoading({ title: this.t('my.loadMe') });
				}
				uni.request({
					url: `${config.API_BASE_URL}/api/auth/me`,
					method: 'GET',
					header: getAuthHeader(),
					success: (res) => {
						if (res.statusCode === 200 && res.data && res.data.user) {
							this.user = res.data.user;
							setSession(getToken(), this.user);
							return;
						}
						if (res.statusCode === 401) {
							this.logout(false);
						}
					},
					complete: () => {
						if (showLoading) {
							uni.hideLoading();
						}
					},
				});
			},
			changePassword() {
				const form = this.passwordForm;
				if (!form.current_password || !form.new_password || !form.confirm_password) {
					uni.showToast({ title: this.t('my.fillPasswordInfo'), icon: 'none' });
					return;
				}
				if (form.new_password.length < 6) {
					uni.showToast({ title: this.t('my.newPasswordMin'), icon: 'none' });
					return;
				}
				if (form.new_password !== form.confirm_password) {
					uni.showToast({ title: this.t('my.passwordMismatch'), icon: 'none' });
					return;
				}
				this.saving = true;
				uni.request({
					url: `${config.API_BASE_URL}/api/auth/change-password`,
					method: 'POST',
					header: {
						'Content-Type': 'application/json',
						...getAuthHeader(),
					},
					data: {
						current_password: form.current_password,
						new_password: form.new_password,
					},
					success: (res) => {
						if (res.statusCode === 200) {
							this.passwordForm.current_password = '';
							this.passwordForm.new_password = '';
							this.passwordForm.confirm_password = '';
							uni.showToast({ title: this.t('my.passwordSuccess'), icon: 'success' });
							return;
						}
						uni.showToast({ title: (res.data && res.data.detail) || this.t('my.passwordFailed'), icon: 'none' });
					},
					fail: () => {
						uni.showToast({ title: this.t('my.passwordFailed'), icon: 'none' });
					},
					complete: () => {
						this.saving = false;
					},
				});
			},
			logout(showToast = true) {
				clearSession();
				if (showToast) {
					uni.showToast({ title: this.t('my.loggedOut'), icon: 'none' });
				}
				setTimeout(() => {
					uni.reLaunch({ url: '/pages/index/index' });
				}, 200);
			},
			goAbout() {
				uni.navigateTo({
					url: '/pages/about/about',
					fail: (error) => {
						console.error('打开关于页面失败:', error);
						uni.showToast({ title: this.t('my.openAboutFailed'), icon: 'none' });
					},
				});
			},
		},
	};
</script>

<style>
	.page {
		min-height: 100vh;
		padding: 24rpx;
		padding-bottom: calc(284rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(284rpx + constant(safe-area-inset-bottom));
		box-sizing: border-box;
		background: var(--bg-primary);
	}
	.hero {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		min-height: var(--topbar-min-height);
		width: 100%;
		box-sizing: border-box;
		padding: var(--card-padding);
		border-radius: var(--radius-card);
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
		box-shadow: var(--shadow-strong);
		margin-bottom: 20rpx;
	}
	.hero-kicker {
		display: block;
		font-size: 20rpx;
		letter-spacing: 3rpx;
		text-transform: uppercase;
		opacity: 0.72;
		margin-bottom: 10rpx;
	}
	.hero-title {
		display: block;
		font-size: 20px;
		font-weight: 700;
		margin-bottom: 10rpx;
	}
	.hero-subtitle {
		display: block;
		font-size: 14px;
		line-height: 1.6;
		opacity: 0.88;
	}
	.card {
		background: #fff;
		border-radius: 18rpx;
		border: 1rpx solid var(--line-soft);
		padding: var(--card-padding);
		box-shadow: var(--shadow-soft);
		margin-bottom: 18rpx;
	}
	.label {
		display: block;
		font-size: 14px;
		color: var(--text-secondary);
		margin-top: 8rpx;
	}
	.value {
		display: block;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		margin: 6rpx 0 10rpx;
	}
	.section-title {
		display: block;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 14rpx;
	}
	.input {
		width: 100%;
		height: 84rpx;
		padding: 0 24rpx;
		border-radius: 18rpx;
		background: var(--input-bg);
		border: 1rpx solid var(--line-soft);
		margin-bottom: 14rpx;
		box-sizing: border-box;
		font-size: 14px;
	}
	.action-btn {
		border-radius: 999rpx;
		font-size: 28rpx;
		font-weight: 600;
		margin-top: 8rpx;
	}
	.action-btn.primary {
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
	}
	.action-btn.secondary {
		background: rgba(9, 92, 219, 0.12);
		color: var(--accent-strong);
		border: 1rpx solid rgba(9, 92, 219, 0.26);
	}
	.action-btn.danger {
		background: var(--danger-soft);
		color: var(--danger);
		border: 1rpx solid rgba(220, 38, 38, 0.24);
	}
	.about-desc {
		display: block;
		font-size: 14px;
		line-height: 1.7;
		color: var(--text-secondary);
		margin-bottom: 12rpx;
	}
</style>
