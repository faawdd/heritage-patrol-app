<template>
	<view class="page">
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

				<view class="version-row">
					<text class="version-text">App {{ appVersion }}</text>
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
			appVersion: 'v1.0.0',
			form: {
				username: '',
				password: '',
			},
		};
	},
	onLoad() {
		// #ifdef APP-PLUS
		if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.version) {
			this.appVersion = `v${plus.runtime.version}`;
		}
		// #endif
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
	background: linear-gradient(180deg, #eef4ff 0%, #d9e9ff 100%);
	position: relative;
	overflow: auto;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 60rpx 36rpx;
	box-sizing: border-box;
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
	background: #ffffff;
	border: 1.5rpx solid #c7daf8;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 14rpx;
	box-sizing: border-box;
	margin-bottom: 26rpx;
	box-shadow: 0 10rpx 26rpx rgba(22, 63, 119, 0.14);
}

.brand-icon {
	width: 100%;
	height: 100%;
	display: block;
}

.brand-title {
	font-size: 46rpx;
	font-weight: 700;
	color: #4b8fd7;
	letter-spacing: 4rpx;
	text-shadow: 0 2rpx 10rpx rgba(255, 255, 255, 0.6);
	margin-bottom: 12rpx;
}

.brand-sub {
	font-size: 24rpx;
	color: #3f5f90;
	letter-spacing: 2rpx;
}

.form-card {
	background: #ffffff;
	border-radius: 40rpx;
	padding: 56rpx 44rpx 48rpx;
	border: 1rpx solid #cfdef8;
	box-shadow: 0 24rpx 56rpx rgba(13, 44, 97, 0.16);
	position: relative;
	overflow: hidden;
}

.card-top-shine {
	position: absolute;
	top: 0;
	left: 8%;
	right: 8%;
	height: 2rpx;
	background: #d7e5fb;
}

.input-field {
	display: flex;
	align-items: center;
	background: #ffffff;
	border: 1rpx solid #c5d7f4;
	border-radius: 20rpx;
	padding: 0 24rpx 0 22rpx;
	height: 100rpx;
	margin-bottom: 26rpx;
	box-shadow: none;
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
	background: #d1def4;
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
	color: #8aa1c4;
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
	background: #5c9fe6;
	color: #fff;
	font-size: 32rpx;
	font-weight: 700;
	letter-spacing: 4rpx;
	border: none;
	box-shadow: 0 10rpx 24rpx rgba(92, 159, 230, 0.28);
}

.login-btn:active {
	background: #4b8fd7;
}

.forgot-row {
	display: flex;
	justify-content: center;
	margin-top: 30rpx;
}

.forgot-link {
	font-size: 26rpx;
	color: #4b8fd7;
}

.version-row {
	display: flex;
	justify-content: center;
	margin-top: 18rpx;
}

.version-text {
	font-size: 22rpx;
	color: #8aa1c4;
	letter-spacing: 1rpx;
}
</style>
