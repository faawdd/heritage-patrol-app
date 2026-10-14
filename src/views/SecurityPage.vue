<template>
	<div class="app-page">
		<div class="app-content">
			<div class="u-page">
				<AppHeader title="快捷登录" subtitle="不用每次输入密码" back />

				<div class="u-body body">
					<div v-if="settingGesture" class="u-card">
						<GestureSetter @confirm="onGestureSet" @cancel="settingGesture = false" />
					</div>

					<template v-else>
						<div class="u-card intro">
							<AppIcon name="shield" :size="64" color="#15803D" />
							<span>开启后，打开软件时画一下手势或按一下指纹就能登录，不用再输入密码。</span>
						</div>

						<!-- 手势 -->
						<div class="u-card method">
							<div class="method-head">
								<div class="method-icon" style="background: #E8F0FB">
									<AppIcon name="gesture" :size="60" color="#1E5AA8" />
								</div>
								<div class="method-text">
									<span class="method-title">手势密码</span>
									<span class="method-state" :class="{ on: quick && quick.gestureHash }">{{ quick && quick.gestureHash ? '已开启' : '未开启' }}</span>
								</div>
							</div>
							<div class="method-actions">
								<van-button native-type="button" class="u-btn primary block" :disabled="busy" @click="settingGesture = true">
									{{ quick && quick.gestureHash ? '修改手势' : '设置手势' }}
								</van-button>
								<van-button native-type="button" v-if="quick && quick.gestureHash" class="u-btn danger-ghost block" :disabled="busy" @click="disable('gesture')">关闭手势</van-button>
							</div>
						</div>

						<!-- 指纹 / 面容 -->
						<div class="u-card method">
							<div class="method-head">
								<div class="method-icon" style="background: #E7F6EC">
									<AppIcon :name="bioMode === 'facial' ? 'face' : 'fingerprint'" :size="60" color="#15803D" />
								</div>
								<div class="method-text">
									<span class="method-title">{{ bioName }}登录</span>
									<span class="method-state" :class="{ on: bioOn }">{{ bioStateText }}</span>
								</div>
							</div>
							<div v-if="bioMode" class="method-actions">
								<van-button native-type="button" v-if="!bioOn" class="u-btn success block" :disabled="busy" @click="enableBio">开启{{ bioName }}登录</van-button>
								<van-button native-type="button" v-else class="u-btn danger-ghost block" :disabled="busy" @click="disable('biometric')">关闭{{ bioName }}登录</van-button>
							</div>
							<span v-else class="method-note">{{ checking ? '正在检测本机是否支持…' : '本机不支持指纹/面容，或还没有在手机设置里录入指纹。可以使用手势密码。' }}</span>
						</div>

						<div v-if="hasQuick && !serverBacked" class="warn">
							<AppIcon name="info" :size="40" color="#B45309" />
							<span>服务器暂未开通长期快捷登录，登录状态最长保持 12 小时，过期后需要输入一次密码。</span>
						</div>
					</template>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import GestureSetter from '@/components/GestureSetter.vue';
	import { reLaunch } from '@/lib/nav.js';
	import { showModal, toast } from '@/lib/ui.js';
	import { getDeviceToken, getToken, getUser } from '@/lib/auth.js';
	import {
		authenticateBiometric,
		biometricLabel,
		checkBiometricSupport,
		disableQuickLoginMethod,
		enableQuickLogin,
		getQuickLogin,
		hasQuickLogin,
		hashGesture,
	} from '@/lib/quickLogin.js';

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
		mounted() {
			if (!getToken()) {
				reLaunch('/login');
				return;
			}
			this.settingGesture = false;
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
					toast(message, { icon: 'success' });
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
							toast(err.message, { icon: 'none' });
						}
					},
				);
			},
			async disable(method) {
				const name = method === 'gesture' ? '手势' : `${this.bioName}`;
				const res = await showModal({
					title: `关闭${name}登录`,
					content: `关闭后不能再用${name}登录。确定关闭吗？`,
					confirmText: '确定关闭',
					confirmColor: '#C62828',
				});
				if (res.confirm) {
					disableQuickLoginMethod(method);
					this.refresh();
					toast('已关闭', { icon: 'none' });
				}
			},
		},
	};
</script>

<style scoped>
	.body {
		padding-top: 14px;
		padding-bottom: 30px;
	}

	.intro {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 16px;
		color: #334155;
		line-height: 1.6;
	}

	.method-head {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.method-icon {
		width: 56px;
		height: 56px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.method-text {
		display: flex;
		flex-direction: column;
	}

	.method-title {
		font-size: 20px;
		font-weight: 800;
		color: #0F172A;
	}

	.method-state {
		margin-top: 2px;
		font-size: 15px;
		color: #94A3B8;
		font-weight: 600;
	}

	.method-state.on {
		color: #15803D;
	}

	.method-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 14px;
	}

	.method-note {
		display: block;
		margin-top: 12px;
		font-size: 15px;
		color: #64748B;
		line-height: 1.6;
	}

	.warn {
		display: flex;
		gap: 6px;
		padding: 12px;
		border-radius: 10px;
		background: #FEF3E2;
		color: #B45309;
		font-size: 15px;
		line-height: 1.6;
	}
</style>
