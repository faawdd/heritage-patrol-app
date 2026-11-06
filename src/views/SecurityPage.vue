<template>
	<div class="app-page">
		<div class="app-content">
			<div class="u-page">
				<AppHeader title="快捷登录" subtitle="不用每次输入密码" back />

				<div class="u-body pt-3.5 pb-[1.875rem]">
					<div v-if="settingGesture" class="u-card">
						<GestureSetter @confirm="onGestureSet" @cancel="settingGesture = false" />
					</div>

					<template v-else>
						<div class="u-card flex items-center gap-3 text-base leading-relaxed text-ink-2">
							<AppIcon name="shield" :size="64" color="var(--c-success)" />
							<span>开启后，打开软件时画一下手势或按一下指纹就能登录，不用再输入密码。</span>
						</div>

						<!-- 手势 -->
						<div class="u-card">
							<div class="flex items-center gap-3">
								<div class="flex h-14 w-14 items-center justify-center bg-primary-light">
									<AppIcon name="gesture" :size="60" color="var(--c-primary)" />
								</div>
								<div class="flex flex-col">
									<span class="text-xl font-extrabold text-ink">手势密码</span>
									<span class="mt-0.5 text-[0.9375rem] font-semibold text-ink-4" :class="quick && quick.gestureHash ? 'text-success' : ''">{{ quick && quick.gestureHash ? '已开启' : '未开启' }}</span>
								</div>
							</div>
							<div class="mt-3.5 flex flex-col gap-2.5">
								<van-button type="primary" block native-type="button" :disabled="busy" @click="settingGesture = true">
									{{ quick && quick.gestureHash ? '修改手势' : '设置手势' }}
								</van-button>
								<van-button type="danger" plain block native-type="button" v-if="quick && quick.gestureHash" :disabled="busy" @click="disable('gesture')">关闭手势</van-button>
							</div>
						</div>

						<!-- 指纹 / 面容 -->
						<div class="u-card">
							<div class="flex items-center gap-3">
								<div class="flex h-14 w-14 items-center justify-center bg-success-bg">
									<AppIcon :name="bioMode === 'facial' ? 'face' : 'fingerprint'" :size="60" color="var(--c-success)" />
								</div>
								<div class="flex flex-col">
									<span class="text-xl font-extrabold text-ink">{{ bioName }}登录</span>
									<span class="mt-0.5 text-[0.9375rem] font-semibold text-ink-4" :class="bioOn ? 'text-success' : ''">{{ bioStateText }}</span>
								</div>
							</div>
							<div v-if="bioMode" class="mt-3.5 flex flex-col gap-2.5">
								<van-button type="success" block native-type="button" v-if="!bioOn" :disabled="busy" @click="enableBio">开启{{ bioName }}登录</van-button>
								<van-button type="danger" plain block native-type="button" v-else :disabled="busy" @click="disable('biometric')">关闭{{ bioName }}登录</van-button>
							</div>
							<span v-else class="mt-3 block text-[0.9375rem] leading-relaxed text-ink-3">{{ checking ? '正在检测本机是否支持…' : '本机不支持指纹/面容，或还没有在手机设置里录入指纹。可以使用手势密码。' }}</span>
						</div>

						<div v-if="hasQuick && !serverBacked" class="flex gap-1.5 bg-warning-bg p-3 text-[0.9375rem] leading-relaxed text-warning">
							<AppIcon name="info" :size="40" color="var(--c-warning)" />
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
					confirmColor: 'var(--c-danger)',
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


