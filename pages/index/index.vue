<template>
	<view class="page">
		<view class="bg-glow bg-glow-tl"></view>
		<view class="bg-glow bg-glow-br"></view>
		<view class="bg-glow bg-glow-mid"></view>
		<view class="bg-circle bg-circle-lg"></view>
		<view class="bg-circle bg-circle-sm"></view>

		<view class="login-wrap">
			<view class="brand">
				<view class="brand-halo">
					<image class="brand-icon" src="/static/1.png" mode="aspectFit" />
				</view>
				<text class="brand-title">{{ t('app.brand') }}</text>
				<text class="brand-sub">文物保护巡查管理系统</text>
			</view>

			<view class="form-card">
				<view class="card-top-shine"></view>

				<view class="input-field">
					<image
						class="field-icon"
						mode="aspectFit"
						src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='8' r='3.5' fill='%23163F77'/%3E%3Cpath fill='%23163F77' d='M4 20c0-4 3.58-7 8-7s8 3 8 7H4z'/%3E%3C/svg%3E"
					/>
					<view class="field-sep"></view>
					<input
						v-model="form.username"
						class="field-input"
						:placeholder="t('login.usernamePlaceholder')"
						placeholder-class="field-ph"
					/>
				</view>

				<view class="input-field">
					<image
						class="field-icon"
						mode="aspectFit"
						src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='5' y='11' width='14' height='10' rx='2' fill='%23163F77'/%3E%3Cpath d='M8 11V7a4 4 0 0 1 8 0v4' fill='none' stroke='%23163F77' stroke-width='2.2' stroke-linecap='round'/%3E%3Ccircle cx='12' cy='16' r='1.3' fill='white'/%3E%3C/svg%3E"
					/>
					<view class="field-sep"></view>
					<input
						v-model="form.password"
						class="field-input"
						password
						:placeholder="t('login.passwordPlaceholder')"
						placeholder-class="field-ph"
					/>
				</view>

				<view class="btn-row">
					<button class="login-btn" :loading="loading" @click="handleLogin">{{ t('login.submit') }}</button>
				</view>

				<view class="forgot-row">
					<text class="forgot-link" @click="handleForgotPassword">忘记密码？</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import config from '../../common/js/config.js';
import { getToken, setSession } from '../../common/js/auth.js';
import createPageI18n from '../../common/js/pageI18n.js';

export default {
	mixins: [createPageI18n('index')],
	data() {
		return {
			loading: false,
			form: {
				username: '',
				password: '',
			},
		};
	},
	onLoad() {
		if (getToken()) {
			uni.reLaunch({ url: '/pages/home/home' });
		}
	},
	methods: {
		handleLogin() {
			if (!this.form.username || !this.form.password) {
				uni.showToast({ title: this.t('login.missingCredentials'), icon: 'none' });
				return;
			}
			this.loading = true;
			uni.request({
				url: `${config.API_BASE_URL}/api/auth/login`,
				method: 'POST',
				data: this.form,
				header: {
					'Content-Type': 'application/json',
				},
				success: (res) => {
					if (res.statusCode === 200 && res.data && res.data.token) {
						setSession(res.data.token, res.data.user);
						uni.showToast({ title: this.t('login.success'), icon: 'success' });
						setTimeout(() => {
							uni.reLaunch({ url: '/pages/home/home' });
						}, 300);
						return;
					}
					uni.showToast({ title: (res.data && res.data.detail) || this.t('login.failed'), icon: 'none' });
				},
				fail: () => {
					uni.showToast({ title: this.t('login.serverUnavailable'), icon: 'none' });
				},
				complete: () => {
					this.loading = false;
				},
			});
		},
		handleForgotPassword() {
			uni.showModal({
				title: '忘记密码',
				content: '请联系管理员\n联系电话：13899665458',
				showCancel: false,
				confirmText: '知道了',
			});
		},
	},
};
</script>

<style>
.page {
	min-height: 100vh;
	background: linear-gradient(165deg, #eef5ff 0%, #dfeeff 45%, #cfe5ff 78%, #eaf4ff 100%);
	position: relative;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 60rpx 36rpx;
	box-sizing: border-box;
}

.bg-glow {
	position: absolute;
	border-radius: 50%;
	pointer-events: none;
}

.bg-glow-tl {
	width: 700rpx;
	height: 700rpx;
	background: rgba(99, 144, 230, 0.42);
	filter: blur(80rpx);
	top: -260rpx;
	left: -240rpx;
}

.bg-glow-br {
	width: 620rpx;
	height: 620rpx;
	background: rgba(72, 116, 205, 0.30);
	filter: blur(100rpx);
	bottom: -240rpx;
	right: -200rpx;
}

.bg-glow-mid {
	width: 440rpx;
	height: 440rpx;
	background: rgba(80, 150, 220, 0.24);
	filter: blur(70rpx);
	top: 30%;
	left: 50%;
	transform: translateX(-50%);
}

.bg-circle {
	position: absolute;
	border-radius: 50%;
	pointer-events: none;
	border: 1rpx solid rgba(22, 63, 119, 0.14);
}

.bg-circle-lg {
	width: 780rpx;
	height: 780rpx;
	top: -200rpx;
	right: -300rpx;
	background: transparent;
	box-shadow: inset 0 0 60rpx rgba(22, 63, 119, 0.05);
}

.bg-circle-sm {
	width: 360rpx;
	height: 360rpx;
	bottom: 5%;
	left: -120rpx;
	background: rgba(22, 63, 119, 0.04);
}

.login-wrap {
	width: 100%;
	max-width: 640rpx;
	position: relative;
	z-index: 1;
}

.brand {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 52rpx;
}

.brand-halo {
	width: 128rpx;
	height: 128rpx;
	border-radius: 30rpx;
	background: rgba(255, 255, 255, 0.35);
	border: 1.5rpx solid rgba(255, 255, 255, 0.65);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 14rpx;
	box-sizing: border-box;
	margin-bottom: 26rpx;
	box-shadow: 0 0 44rpx rgba(80, 140, 230, 0.25), 0 10rpx 28rpx rgba(22, 63, 119, 0.20);
}

.brand-icon {
	width: 100%;
	height: 100%;
	display: block;
}

.brand-title {
	font-size: 46rpx;
	font-weight: 700;
	color: #163f77;
	letter-spacing: 4rpx;
	text-shadow: 0 2rpx 10rpx rgba(255, 255, 255, 0.6);
	margin-bottom: 12rpx;
}

.brand-sub {
	font-size: 24rpx;
	color: rgba(22, 63, 119, 0.72);
	letter-spacing: 2rpx;
}

.form-card {
	background: rgba(255, 255, 255, 0.25);
	border-radius: 40rpx;
	padding: 56rpx 44rpx 48rpx;
	border: 1rpx solid rgba(255, 255, 255, 0.30);
	backdrop-filter: blur(15px);
	-webkit-backdrop-filter: blur(15px);
	box-shadow: 0 40rpx 100rpx rgba(5, 16, 52, 0.25), 0 10rpx 30rpx rgba(5, 16, 52, 0.12), inset 0 1rpx 0 rgba(255, 255, 255, 0.50);
	position: relative;
	overflow: hidden;
}

.card-top-shine {
	position: absolute;
	top: 0;
	left: 8%;
	right: 8%;
	height: 1rpx;
	background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.85), transparent);
}

.input-field {
	display: flex;
	align-items: center;
	background: rgba(255, 255, 255, 0.52);
	border: 1rpx solid rgba(22, 63, 119, 0.28);
	border-radius: 20rpx;
	padding: 0 24rpx 0 22rpx;
	height: 100rpx;
	margin-bottom: 26rpx;
	box-shadow: inset 0 2rpx 10rpx rgba(22, 63, 119, 0.08);
}

.field-icon {
	width: 44rpx;
	height: 44rpx;
	flex-shrink: 0;
	opacity: 0.9;
}

.field-sep {
	width: 1rpx;
	height: 46rpx;
	background: rgba(22, 63, 119, 0.20);
	margin: 0 20rpx 0 18rpx;
	flex-shrink: 0;
}

.field-input {
	flex: 1;
	height: 100%;
	background: transparent;
	border: none;
	padding: 0;
	font-size: 30rpx;
	color: #163452;
}

.field-ph {
	color: rgba(22, 63, 119, 0.46);
	font-size: 28rpx;
}

.btn-row {
	margin-top: 12rpx;
}

.login-btn {
	width: 100%;
	height: 96rpx;
	line-height: 96rpx;
	border-radius: 20rpx;
	background: linear-gradient(135deg, #0b2351 0%, #163f77 38%, #1878b8 72%, #14acd4 100%);
	color: #fff;
	font-size: 32rpx;
	font-weight: 700;
	letter-spacing: 4rpx;
	border: none;
	box-shadow: 0 0 36rpx rgba(20, 172, 212, 0.35), 0 10rpx 36rpx rgba(8, 20, 60, 0.30), inset 0 1rpx 0 rgba(255, 255, 255, 0.22);
}

.forgot-row {
	display: flex;
	justify-content: center;
	margin-top: 30rpx;
}

.forgot-link {
	font-size: 26rpx;
	color: rgba(22, 63, 119, 0.82);
}
</style>
