<template>
	<view class="u-page">
		<AppHeader title="快捷登录" subtitle="不用每次输入密码" back />

		<view class="u-body body">
			<view v-if="settingGesture" class="u-card">
				<GestureSetter @confirm="onGestureSet" @cancel="settingGesture = false" />
			</view>

			<template v-else>
				<view class="u-card intro">
					<AppIcon name="shield" :size="64" color="#15803D" />
					<text>开启后，打开软件时画一下手势或按一下指纹就能登录，不用再输入密码。</text>
				</view>

				<!-- 手势 -->
				<view class="u-card method">
					<view class="method-head">
						<view class="method-icon" style="background: #E8F0FB">
							<AppIcon name="gesture" :size="60" color="#1E5AA8" />
						</view>
						<view class="method-text">
							<text class="method-title">手势密码</text>
							<text class="method-state" :class="{ on: quick && quick.gestureHash }">{{ quick && quick.gestureHash ? '已开启' : '未开启' }}</text>
						</view>
					</view>
					<view class="method-actions">
						<button class="u-btn primary block" :disabled="busy" @click="settingGesture = true">
							{{ quick && quick.gestureHash ? '修改手势' : '设置手势' }}
						</button>
						<button v-if="quick && quick.gestureHash" class="u-btn danger-ghost block" :disabled="busy" @click="disable('gesture')">关闭手势</button>
					</view>
				</view>

				<!-- 指纹 / 面容 -->
				<view class="u-card method">
					<view class="method-head">
						<view class="method-icon" style="background: #E7F6EC">
							<AppIcon :name="bioMode === 'facial' ? 'face' : 'fingerprint'" :size="60" color="#15803D" />
						</view>
						<view class="method-text">
							<text class="method-title">{{ bioName }}登录</text>
							<text class="method-state" :class="{ on: bioOn }">{{ bioStateText }}</text>
						</view>
					</view>
					<view v-if="bioMode" class="method-actions">
						<button v-if="!bioOn" class="u-btn success block" :disabled="busy" @click="enableBio">开启{{ bioName }}登录</button>
						<button v-else class="u-btn danger-ghost block" :disabled="busy" @click="disable('biometric')">关闭{{ bioName }}登录</button>
					</view>
					<text v-else class="method-note">{{ checking ? '正在检测本机是否支持…' : '本机不支持指纹/面容，或还没有在手机设置里录入指纹。可以使用手势密码。' }}</text>
				</view>

				<view v-if="hasQuick && !serverBacked" class="warn">
					<AppIcon name="info" :size="40" color="#B45309" />
					<text>服务器暂未开通长期快捷登录，登录状态最长保持 12 小时，过期后需要输入一次密码。</text>
				</view>
			</template>
		</view>
	</view>
</template>

<script>
	import AppHeader from '../../components/AppHeader.vue';
	import AppIcon from '../../components/AppIcon.vue';
	import GestureSetter from '../../components/GestureSetter.vue';
	import { getDeviceToken, getToken, getUser } from '../../common/js/auth.js';
	import {
		authenticateBiometric,
		biometricLabel,
		checkBiometricSupport,
		disableQuickLoginMethod,
		enableQuickLogin,
		getQuickLogin,
		hasQuickLogin,
		hashGesture,
	} from '../../common/js/quickLogin.js';

	export default {
		components: { AppHeader, AppIcon, GestureSetter },
		data() {
			return {
				user: {},
				quick: null,
				settingGesture: false,
				busy: false,
				checking: true,
				bio: { fingerprint: false, facial: false },
				serverBacked: false,
			};
		},
		computed: {
			hasQuick() {
				return hasQuickLogin(this.quick);
			},
			bioMode() {
				if (this.quick && this.quick.biometric) return this.quick.biometric;
				if (this.bio.fingerprint) return 'fingerprint';
				if (this.bio.facial) return 'facial';
				return '';
			},
			bioName() {
				return this.bioMode ? biometricLabel(this.bioMode) : '指纹';
			},
			bioOn() {
				return !!(this.quick && this.quick.biometric);
			},
			bioStateText() {
				if (this.bioOn) return '已开启';
				if (!this.bioMode) return '不可用';
				return '未开启';
			},
		},
		onLoad() {
			if (!getToken()) {
				uni.reLaunch({ url: '/pages/index/index' });
				return;
			}
			this.user = getUser() || {};
			this.refresh();
			checkBiometricSupport().then((bio) => {
				this.bio = bio;
				this.checking = false;
			});
		},
		methods: {
			refresh() {
				const q = getQuickLogin();
				this.quick = q && q.username === this.user.username ? q : null;
				this.serverBacked = !!getDeviceToken();
			},
			save(patch, message) {
				this.busy = true;
				return enableQuickLogin(this.user, patch).then((result) => {
					this.busy = false;
					this.refresh();
					uni.showToast({ title: message, icon: 'success' });
					return result;
				});
			},
			onGestureSet(points) {
				this.save({ gestureHash: hashGesture(this.user.username, points) }, '手势已保存').then(() => {
					this.settingGesture = false;
				});
			},
			enableBio() {
				const mode = this.bioMode;
				authenticateBiometric(mode).then(
					() => this.save({ biometric: mode }, `${biometricLabel(mode)}登录已开启`),
					(err) => {
						if (!err.cancelled) {
							uni.showToast({ title: err.message, icon: 'none' });
						}
					},
				);
			},
			disable(method) {
				const name = method === 'gesture' ? '手势' : `${this.bioName}`;
				uni.showModal({
					title: `关闭${name}登录`,
					content: `关闭后不能再用${name}登录。确定关闭吗？`,
					confirmText: '确定关闭',
					confirmColor: '#C62828',
					success: (res) => {
						if (res.confirm) {
							disableQuickLoginMethod(method);
							this.refresh();
							uni.showToast({ title: '已关闭', icon: 'none' });
						}
					},
				});
			},
		},
	};
</script>

<style>
	.body {
		padding-top: 28rpx;
		padding-bottom: 60rpx;
	}

	.intro {
		display: flex;
		align-items: center;
		gap: 24rpx;
		font-size: 32rpx;
		color: #334155;
		line-height: 1.6;
	}

	.method-head {
		display: flex;
		align-items: center;
		gap: 24rpx;
	}

	.method-icon {
		width: 112rpx;
		height: 112rpx;
		border-radius: 28rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.method-text {
		display: flex;
		flex-direction: column;
	}

	.method-title {
		font-size: 40rpx;
		font-weight: 800;
		color: #0F172A;
	}

	.method-state {
		margin-top: 4rpx;
		font-size: 30rpx;
		color: #94A3B8;
		font-weight: 600;
	}

	.method-state.on {
		color: #15803D;
	}

	.method-actions {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		margin-top: 28rpx;
	}

	.method-note {
		display: block;
		margin-top: 24rpx;
		font-size: 30rpx;
		color: #64748B;
		line-height: 1.6;
	}

	.warn {
		display: flex;
		gap: 12rpx;
		padding: 24rpx;
		border-radius: 20rpx;
		background: #FEF3E2;
		color: #B45309;
		font-size: 30rpx;
		line-height: 1.6;
	}
</style>
