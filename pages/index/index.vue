<template>
	<view class="login-page">
		<view class="login-hero" :class="{ 'has-avatar': mode === 'gesture' || mode === 'biometric' }" :style="{ paddingTop: `${statusBar + 40}px` }">
			<view class="brand-mark">
				<AppIcon name="landmark" :size="76" color="#FFFFFF" :stroke="1.8" />
			</view>
			<text class="brand-title">鄯善文保巡查</text>
			<text class="brand-sub">文物看护 · 日常巡查上报</text>
		</view>

		<view class="login-panel u-fade-in">
			<!-- 快捷解锁 -->
			<view v-if="mode === 'gesture' || mode === 'biometric'" class="unlock">
				<view class="avatar">{{ avatarText }}</view>
				<text class="welcome">欢迎回来，{{ quick.fullName || quick.username }}</text>

				<template v-if="mode === 'gesture'">
					<text class="unlock-tip" :class="{ error: tipError }">{{ tip || '请画出手势密码登录' }}</text>
					<GestureLock ref="lock" :size="560" :disabled="busy" @complete="onGesture" />
				</template>

				<template v-else>
					<view class="bio-btn" @click="startBiometric">
						<AppIcon :name="quick.biometric === 'facial' ? 'face' : 'fingerprint'" :size="140" color="#1E5AA8" :stroke="1.6" />
					</view>
					<text class="unlock-tip" :class="{ error: tipError }">{{ tip || `点击上方图标，验证${bioLabel}登录` }}</text>
				</template>

				<view class="switch-row">
					<view v-if="mode === 'gesture' && quick.biometric && bioReady" class="switch-link" @click="switchMode('biometric')">
						<AppIcon :name="quick.biometric === 'facial' ? 'face' : 'fingerprint'" :size="40" />
						<text>{{ bioLabel }}登录</text>
					</view>
					<view v-if="mode === 'biometric' && quick.gestureHash" class="switch-link" @click="switchMode('gesture')">
						<AppIcon name="gesture" :size="40" />
						<text>手势登录</text>
					</view>
					<view class="switch-link" @click="usePassword">
						<AppIcon name="key" :size="40" />
						<text>密码登录</text>
					</view>
				</view>
			</view>

			<!-- 登录后开启快捷登录 -->
			<view v-else-if="mode === 'setup'" class="setup">
				<view class="setup-icon">
					<AppIcon name="shield" :size="88" color="#15803D" />
				</view>
				<text class="setup-title">开启快捷登录</text>
				<text class="setup-desc">开启后，下次打开软件不用再输入密码，画一下手势或按一下指纹就能登录。</text>
				<button v-if="bio.fingerprint || bio.facial" class="u-btn primary xl block setup-btn" :disabled="busy" @click="setupBiometric">
					<AppIcon :name="bio.fingerprint ? 'fingerprint' : 'face'" :size="56" color="#FFFFFF" />
					<text>使用{{ bio.fingerprint ? '指纹' : '面容' }}登录</text>
				</button>
				<button class="u-btn xl block setup-btn" :class="bio.fingerprint || bio.facial ? 'ghost' : 'primary'" :disabled="busy" @click="mode = 'setGesture'">
					<AppIcon name="gesture" :size="56" :color="bio.fingerprint || bio.facial ? '#1E5AA8' : '#FFFFFF'" />
					<text>设置手势密码</text>
				</button>
				<view class="skip" @click="finishLogin">以后再说</view>
			</view>

			<view v-else-if="mode === 'setGesture'" class="setup">
				<GestureSetter cancel-text="返回" @confirm="onGestureSet" @cancel="mode = 'setup'" />
			</view>

			<!-- 密码登录 -->
			<view v-else class="form">
				<text class="form-title">账号登录</text>
				<view v-if="expired" class="notice">
					<AppIcon name="info" :size="40" color="#B45309" />
					<text>登录已过期，请重新输入密码</text>
				</view>

				<text class="label">账号</text>
				<view class="field" :class="{ focus: focus === 'u' }">
					<AppIcon name="user" :size="48" color="#64748B" />
					<input
						v-model.trim="form.username"
						class="field-input"
						placeholder="请输入账号"
						placeholder-class="u-placeholder"
						@focus="focus = 'u'"
						@blur="focus = ''"
					/>
				</view>

				<text class="label">密码</text>
				<view class="field" :class="{ focus: focus === 'p' }">
					<AppIcon name="lock" :size="48" color="#64748B" />
					<input
						v-model="form.password"
						class="field-input"
						:password="!showPwd"
						placeholder="请输入密码"
						placeholder-class="u-placeholder"
						confirm-type="done"
						@focus="focus = 'p'"
						@blur="focus = ''"
						@confirm="handleLogin"
					/>
					<view class="eye" @click="showPwd = !showPwd">
						<AppIcon :name="showPwd ? 'eye' : 'eye-off'" :size="48" color="#64748B" />
					</view>
				</view>

				<button class="u-btn primary xl block login-btn" :loading="busy" :disabled="busy" @click="handleLogin">
					{{ busy ? '正在登录…' : '登 录' }}
				</button>

				<view class="form-links">
					<text class="link" @click="handleForgotPassword">忘记密码？</text>
					<text v-if="hasQuick" class="link strong" @click="backToQuick">使用{{ quickName }}登录</text>
				</view>
			</view>
		</view>

		<text class="version">{{ appVersion }} · 鄯善县文物局</text>
	</view>
</template>

<script>
	import AppIcon from '../../components/AppIcon.vue';
	import GestureLock from '../../components/GestureLock.vue';
	import GestureSetter from '../../components/GestureSetter.vue';
	import config from '../../common/js/config.js';
	import { getLastUsername, isTokenFresh, setSession } from '../../common/js/auth.js';
	import { extractError } from '../../common/js/request.js';
	import {
		authenticateBiometric,
		biometricLabel,
		checkBiometricSupport,
		clearQuickLogin,
		enableQuickLogin,
		getQuickLogin,
		hasQuickLogin,
		hashGesture,
		MIN_GESTURE_POINTS,
		resumeSession,
		verifyGesture,
		wasSetupAsked,
	} from '../../common/js/quickLogin.js';

	export default {
		components: { AppIcon, GestureLock, GestureSetter },
		data() {
			let statusBar = 0;
			try {
				statusBar = uni.getSystemInfoSync().statusBarHeight || 0;
			} catch (error) {
				statusBar = 0;
			}
			return {
				statusBar,
				mode: 'password',
				expired: false,
				busy: false,
				focus: '',
				showPwd: false,
				tip: '',
				tipError: false,
				appVersion: 'v1.0.0',
				quick: {},
				bio: { fingerprint: false, facial: false },
				bioReady: false,
				loggedUser: null,
				form: { username: '', password: '' },
			};
		},
		computed: {
			hasQuick() {
				return hasQuickLogin(this.quick);
			},
			bioLabel() {
				return biometricLabel(this.quick.biometric);
			},
			quickName() {
				if (this.quick.biometric && this.bioReady) {
					return this.bioLabel;
				}
				return '手势';
			},
			avatarText() {
				const name = this.quick.fullName || this.quick.username || '巡';
				return name.slice(-2);
			},
		},
		onLoad(query) {
			// #ifdef APP-PLUS
			if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.version) {
				this.appVersion = `v${plus.runtime.version}`;
			}
			// #endif
			this.expired = !!(query && query.expired);
			this.quick = getQuickLogin() || {};
			this.form.username = this.quick.username || getLastUsername();

			checkBiometricSupport().then((bio) => {
				this.bio = bio;
				this.bioReady = !!(this.quick.biometric && bio[this.quick.biometric]);
				if (this.mode === 'biometric') {
					if (this.bioReady) {
						this.startBiometric();
					} else {
						this.mode = this.quick.gestureHash ? 'gesture' : 'password';
					}
				}
			});

			if (this.hasQuick) {
				this.mode = this.quick.biometric ? 'biometric' : 'gesture';
				return;
			}
			if (!this.expired && isTokenFresh()) {
				uni.reLaunch({ url: '/pages/home/home' });
			}
		},
		methods: {
			setTip(text, error = false) {
				this.tip = text;
				this.tipError = error;
			},
			switchMode(mode) {
				this.setTip('');
				this.mode = mode;
				if (mode === 'biometric') {
					this.startBiometric();
				}
			},
			usePassword() {
				this.setTip('');
				this.mode = 'password';
			},
			backToQuick() {
				this.quick = getQuickLogin() || {};
				this.mode = this.quick.biometric && this.bioReady ? 'biometric' : 'gesture';
				if (!this.quick.gestureHash && this.mode === 'gesture') {
					this.mode = 'biometric';
				}
			},
			onGesture(points) {
				if (points.length < MIN_GESTURE_POINTS) {
					this.$refs.lock.showResult(false);
					this.setTip(`至少连接 ${MIN_GESTURE_POINTS} 个点`, true);
					return;
				}
				const result = verifyGesture(points);
				if (!result.ok) {
					this.$refs.lock.showResult(false);
					// #ifdef APP-PLUS
					uni.vibrateLong();
					// #endif
					if (result.remaining <= 0) {
						this.quick = getQuickLogin() || {};
						uni.showModal({
							title: '手势已锁定',
							content: '手势错误次数过多，请使用密码登录。登录后可在「我的 > 快捷登录」重新设置手势。',
							showCancel: false,
							confirmText: '去输入密码',
						});
						this.mode = 'password';
						return;
					}
					this.setTip(`手势不正确，还可以再试 ${result.remaining} 次`, true);
					return;
				}
				this.$refs.lock.showResult(true, 1500);
				this.setTip('验证通过，正在登录…');
				this.resume();
			},
			startBiometric() {
				if (this.busy) {
					return;
				}
				this.setTip('');
				authenticateBiometric(this.quick.biometric).then(
					() => {
						this.setTip('验证通过，正在登录…');
						this.resume();
					},
					(err) => {
						this.setTip(err.cancelled ? `点击上方图标，验证${this.bioLabel}登录` : `${err.message}，请重试`, !err.cancelled);
					},
				);
			},
			resume() {
				this.busy = true;
				uni.showLoading({ title: '正在登录', mask: true });
				resumeSession()
					.then(() => {
						uni.hideLoading();
						uni.reLaunch({ url: '/pages/home/home' });
					})
					.catch((err) => {
						uni.hideLoading();
						this.busy = false;
						if (err && err.code === 'network') {
							this.setTip('网络连接失败，请检查网络后重试', true);
							if (this.$refs.lock) {
								this.$refs.lock.reset();
							}
							return;
						}
						this.mode = 'password';
						this.expired = true;
						uni.showToast({ title: (err && err.message) || '请输入密码登录', icon: 'none', duration: 2500 });
					});
			},
			handleLogin() {
				if (this.busy) {
					return;
				}
				if (!this.form.username || !this.form.password) {
					uni.showToast({ title: '请输入账号和密码', icon: 'none' });
					return;
				}
				this.busy = true;
				uni.request({
					url: `${config.API_BASE_URL}/api/auth/login`,
					method: 'POST',
					data: this.form,
					header: { 'Content-Type': 'application/json' },
					timeout: 20000,
					success: (res) => {
						if (res.statusCode === 200 && res.data && (res.data.token || res.data.access_token)) {
							this.onLoginSuccess(res.data);
							return;
						}
						this.busy = false;
						uni.showToast({ title: extractError(res, '账号或密码错误'), icon: 'none', duration: 2500 });
					},
					fail: () => {
						this.busy = false;
						uni.showToast({ title: '无法连接服务器，请检查网络', icon: 'none', duration: 2500 });
					},
				});
			},
			onLoginSuccess(data) {
				const user = data.user || {};
				const existing = getQuickLogin();
				if (existing && existing.username !== user.username) {
					// 换了账号：旧账号的快捷登录不再适用
					clearQuickLogin();
				}
				setSession(data);
				this.loggedUser = user;
				this.form.password = '';
				this.busy = false;
				this.quick = getQuickLogin() || {};

				if (hasQuickLogin(this.quick)) {
					// 已开通快捷登录（重新输入密码的情况），顺便续签设备令牌
					enableQuickLogin(user, {}).finally(() => this.finishLogin());
					return;
				}
				if (wasSetupAsked(user.username)) {
					this.finishLogin();
					return;
				}
				this.mode = 'setup';
			},
			setupBiometric() {
				const mode = this.bio.fingerprint ? 'fingerprint' : 'facial';
				authenticateBiometric(mode).then(
					() => this.saveQuick({ biometric: mode }, `${biometricLabel(mode)}登录已开启`),
					(err) => {
						if (!err.cancelled) {
							uni.showToast({ title: err.message, icon: 'none' });
						}
					},
				);
			},
			onGestureSet(points) {
				const user = this.loggedUser || {};
				this.saveQuick({ gestureHash: hashGesture(user.username, points) }, '手势密码已设置');
			},
			saveQuick(patch, message) {
				this.busy = true;
				enableQuickLogin(this.loggedUser || {}, patch).then((result) => {
					this.busy = false;
					if (!result.serverBacked && result.error && result.error.code === 'unsupported') {
						uni.showModal({
							title: '提示',
							content: `${message}。当前服务器版本较旧，登录状态最长保持 12 小时，过期后需重新输入密码。`,
							showCancel: false,
							success: () => this.finishLogin(),
						});
						return;
					}
					uni.showToast({ title: message, icon: 'success' });
					setTimeout(() => this.finishLogin(), 600);
				});
			},
			finishLogin() {
				uni.reLaunch({ url: '/pages/home/home' });
			},
			handleForgotPassword() {
				uni.showModal({
					title: '忘记密码',
					content: '请联系管理员重置密码\n联系电话：13899665458',
					confirmText: '拨打电话',
					cancelText: '知道了',
					success: (res) => {
						if (res.confirm) {
							uni.makePhoneCall({ phoneNumber: '13899665458' });
						}
					},
				});
			},
		}
	};
</script>

<style>
	.login-page {
		min-height: 100vh;
		background: #F1F4F9;
		display: flex;
		flex-direction: column;
	}

	.login-hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-bottom: 150rpx;
		background: linear-gradient(160deg, #2A6BC2 0%, #1E5AA8 45%, #0F2F5C 100%);
		color: #FFFFFF;
		position: relative;
		overflow: hidden;
	}

	.login-hero.has-avatar {
		padding-bottom: 210rpx;
	}

	.login-hero::after {
		content: '';
		position: absolute;
		left: -10%;
		right: -10%;
		bottom: -2rpx;
		height: 120rpx;
		background: #F1F4F9;
		border-radius: 50% 50% 0 0;
	}

	.brand-mark {
		width: 144rpx;
		height: 144rpx;
		border-radius: 40rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.16);
		border: 2rpx solid rgba(255, 255, 255, 0.35);
	}

	.brand-title {
		margin-top: 28rpx;
		font-size: 56rpx;
		font-weight: 800;
		letter-spacing: 6rpx;
	}

	.brand-sub {
		margin-top: 10rpx;
		font-size: 30rpx;
		color: rgba(255, 255, 255, 0.85);
		letter-spacing: 4rpx;
	}

	.login-panel {
		position: relative;
		z-index: 2;
		margin: -110rpx 32rpx 0;
		padding: 48rpx 40rpx;
		background: #FFFFFF;
		border-radius: 36rpx;
		box-shadow: 0 16rpx 48rpx rgba(15, 47, 92, 0.12);
	}

	.form-title {
		display: block;
		font-size: 44rpx;
		font-weight: 800;
		color: #0F172A;
		margin-bottom: 12rpx;
	}

	.notice {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin: 16rpx 0 8rpx;
		padding: 20rpx 24rpx;
		border-radius: 20rpx;
		background: #FEF3E2;
		color: #B45309;
		font-size: 30rpx;
		font-weight: 600;
	}

	.label {
		display: block;
		margin: 32rpx 0 14rpx;
		font-size: 32rpx;
		font-weight: 700;
		color: #334155;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 20rpx;
		height: 116rpx;
		padding: 0 28rpx;
		border-radius: 24rpx;
		background: #F5F7FB;
		border: 3rpx solid #E2E8F0;
	}

	.field.focus {
		border-color: #1E5AA8;
		background: #FFFFFF;
	}

	.field-input {
		flex: 1;
		height: 100%;
		font-size: 36rpx;
		color: #0F172A;
	}

	.eye {
		padding: 16rpx 0 16rpx 16rpx;
	}

	.login-btn {
		margin-top: 56rpx !important;
	}

	.form-links {
		display: flex;
		justify-content: space-between;
		margin-top: 36rpx;
	}

	.link {
		font-size: 30rpx;
		color: #64748B;
		padding: 12rpx 0;
	}

	.link.strong {
		color: #1E5AA8;
		font-weight: 700;
	}

	.unlock {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.avatar {
		width: 128rpx;
		height: 128rpx;
		border-radius: 50%;
		background: linear-gradient(135deg, #2A6BC2, #0F2F5C);
		color: #FFFFFF;
		font-size: 44rpx;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: -112rpx;
		border: 8rpx solid #FFFFFF;
		box-shadow: 0 8rpx 24rpx rgba(15, 47, 92, 0.2);
	}

	.welcome {
		margin-top: 20rpx;
		font-size: 40rpx;
		font-weight: 800;
		color: #0F172A;
	}

	.unlock-tip {
		margin: 16rpx 0 28rpx;
		min-height: 44rpx;
		font-size: 32rpx;
		color: #64748B;
		text-align: center;
	}

	.unlock-tip.error {
		color: #C62828;
		font-weight: 700;
	}

	.bio-btn {
		margin-top: 48rpx;
		width: 240rpx;
		height: 240rpx;
		border-radius: 50%;
		background: #E8F0FB;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 0 20rpx rgba(30, 90, 168, 0.06);
	}

	.bio-btn:active {
		transform: scale(0.96);
	}

	.switch-row {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 24rpx;
		margin-top: 24rpx;
	}

	.switch-link {
		display: flex;
		align-items: center;
		gap: 10rpx;
		padding: 18rpx 28rpx;
		border-radius: 999rpx;
		background: #E8F0FB;
		color: #1E5AA8;
		font-size: 30rpx;
		font-weight: 700;
	}

	.setup {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.setup-icon {
		width: 152rpx;
		height: 152rpx;
		border-radius: 50%;
		background: #E7F6EC;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.setup-title {
		margin-top: 24rpx;
		font-size: 44rpx;
		font-weight: 800;
		color: #0F172A;
	}

	.setup-desc {
		margin: 16rpx 0 40rpx;
		font-size: 32rpx;
		color: #475569;
		line-height: 1.6;
	}

	.setup-btn {
		margin-bottom: 24rpx !important;
	}

	.skip {
		padding: 20rpx 40rpx;
		font-size: 32rpx;
		color: #64748B;
	}

	.version {
		margin: auto 0 0;
		padding: 48rpx 0 calc(32rpx + env(safe-area-inset-bottom));
		text-align: center;
		font-size: 26rpx;
		color: #94A3B8;
	}
</style>
