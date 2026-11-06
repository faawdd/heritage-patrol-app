<template>
	<div class="app-page">
		<div class="app-content">
			<div class="flex min-h-full flex-col bg-surface">
				<div class="flex flex-col items-center pb-9" :class="mode === 'gesture' || mode === 'biometric' ? 'pb-3' : ''" style="padding-top: calc(env(safe-area-inset-top) + 3.5rem)">
					<img class="h-[5.25rem] w-[5.25rem] border border-line bg-surface object-cover" :src="logoUrl" alt="" />
					<span class="mt-3.5 text-[1.375rem] font-semibold tracking-[0.125rem] text-ink">鄯善文保巡查</span>
				</div>

				<div class="relative px-8 pt-2">
					<!-- 快捷解锁 -->
					<div v-if="mode === 'gesture' || mode === 'biometric'" class="flex flex-col items-center">
						<div class="flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center border-[3px] border-surface bg-gradient-primary text-xl font-semibold text-on-primary shadow-card">{{ avatarText }}</div>
						<span class="mt-2.5 text-lg font-semibold text-ink">欢迎回来，{{ quick.fullName || quick.username }}</span>

						<template v-if="mode === 'gesture'">
							<span class="my-2 min-h-[1.375rem] text-center text-sm text-ink-2" :class="tipError ? 'font-semibold text-danger' : ''">{{ tip || '请画出手势密码登录' }}</span>
							<GestureLock ref="lock" :size="560" :disabled="busy" @complete="onGesture" />
						</template>

						<template v-else>
							<div class="mt-5 flex h-[6.875rem] w-[6.875rem] items-center justify-center bg-primary-light shadow-[0_0_0_0.5rem_rgba(var(--c-primary-rgb),0.08)] transition active:scale-[0.96]" @click="startBiometric">
								<AppIcon :name="quick.biometric === 'facial' ? 'face' : 'fingerprint'" :size="140" color="var(--c-primary)" :stroke="1.6" />
							</div>
							<span class="my-2 min-h-[1.375rem] text-center text-sm text-ink-2" :class="tipError ? 'font-semibold text-danger' : ''">{{ tip || `点击上方图标，验证${bioLabel}登录` }}</span>
						</template>

						<div class="mt-2.5 flex flex-wrap justify-center gap-2.5">
							<div v-if="mode === 'gesture' && quick.biometric && bioReady" class="flex min-h-11 items-center gap-1 bg-primary-light px-3.5 py-2 text-sm font-medium text-primary" @click="switchMode('biometric')">
								<AppIcon :name="quick.biometric === 'facial' ? 'face' : 'fingerprint'" :size="40" />
								<span>{{ bioLabel }}登录</span>
							</div>
							<div v-if="mode === 'biometric' && quick.gestureHash" class="flex min-h-11 items-center gap-1 bg-primary-light px-3.5 py-2 text-sm font-medium text-primary" @click="switchMode('gesture')">
								<AppIcon name="gesture" :size="40" />
								<span>手势登录</span>
							</div>
							<div class="flex min-h-11 items-center gap-1 bg-primary-light px-3.5 py-2 text-sm font-medium text-primary" @click="usePassword">
								<AppIcon name="key" :size="40" />
								<span>密码登录</span>
							</div>
						</div>
					</div>

					<!-- 登录后开启快捷登录 -->
					<div v-else-if="mode === 'setup'" class="flex flex-col items-center text-center">
						<div class="flex h-[4.375rem] w-[4.375rem] items-center justify-center bg-success-bg">
							<AppIcon name="shield" :size="88" color="var(--c-success)" />
						</div>
						<span class="mt-3 text-xl font-semibold text-ink">开启快捷登录</span>
						<span class="my-2 mb-[1.125rem] text-sm leading-relaxed text-ink-2">开启后，下次打开软件不用再输入密码，画一下手势或按一下指纹就能登录。</span>
						<van-button type="primary" size="large" block native-type="button" v-if="bio.fingerprint || bio.facial" :disabled="busy" @click="setupBiometric">
							<AppIcon :name="bio.fingerprint ? 'fingerprint' : 'face'" :size="56" color="var(--c-on-primary)" />
							<span>使用{{ bio.fingerprint ? '指纹' : '面容' }}登录</span>
						</van-button>
						<van-button type="primary" size="large" block native-type="button" :plain="!!(bio.fingerprint || bio.facial)" :disabled="busy" @click="mode = 'setGesture'">
							<AppIcon name="gesture" :size="56" :color="bio.fingerprint || bio.facial ? 'var(--c-primary)' : 'var(--c-on-primary)'" />
							<span>设置手势密码</span>
						</van-button>
						<div class="px-5 py-2.5 text-sm text-ink-3" @click="finishLogin">以后再说</div>
					</div>

					<div v-else-if="mode === 'setGesture'" class="flex flex-col items-center text-center">
						<GestureSetter cancel-text="返回" @confirm="onGestureSet" @cancel="mode = 'setup'" />
					</div>

					<!-- 密码登录 -->
					<div v-else class="form">
												<div v-if="expired" class="my-2 mb-1 flex items-center gap-1.5 bg-warning-bg px-3 py-2.5 text-sm font-medium text-warning">
							<AppIcon name="info" :size="40" color="var(--c-warning)" />
							<span>登录已过期，请重新输入密码</span>
						</div>

						<div class="flex h-14 items-center gap-2 border-b border-line" :class="focus === 'u' ? 'border-primary' : ''">
							<span class="w-[3em] shrink-0 text-base font-medium text-ink">账号</span>
							<van-field
								v-model="form.username"
								:formatter="value => value.trim()"
								:border="false"
								class="field-input"
								placeholder="请输入账号"
								@focus="focus = 'u'"
								@blur="focus = ''"
							/>
						</div>

						<div class="flex h-14 items-center gap-2 border-b border-line" :class="focus === 'p' ? 'border-primary' : ''">
							<span class="w-[3em] shrink-0 text-base font-medium text-ink">密码</span>
							<van-field
								v-model="form.password"
								:border="false"
								class="field-input"
								:type="showPwd ? 'text' : 'password'"
								placeholder="请输入密码"
								enterkeyhint="done"
								@focus="focus = 'p'"
								@blur="focus = ''"
								@keyup.enter="handleLogin"
							/>
							<div class="py-2 pl-2" @click="showPwd = !showPwd">
								<AppIcon :name="showPwd ? 'eye' : 'eye-off'" :size="48" color="var(--c-text-3)" />
							</div>
						</div>

						<van-button type="primary" size="large" block native-type="button" class="mt-9" :disabled="busy" @click="handleLogin">
							{{ busy ? '正在登录…' : '登 录' }}
						</van-button>

						<div class="mt-4 flex justify-between">
							<span class="py-1.5 text-sm text-ink-3" @click="handleForgotPassword">忘记密码？</span>
							<span v-if="hasQuick" class="py-1.5 text-sm font-semibold text-primary" @click="backToQuick">使用{{ quickName }}登录</span>
						</div>
						<van-button type="primary" plain block v-if="offlineAvailable && !hasQuick" native-type="button" @click="enterOffline">使用本机已登录账号离线巡查</van-button>
						<p class="mt-3.5 text-center text-xs text-ink-4">首次登录必须联网。离线任务需在联网登录后下载。</p>
					</div>
				</div>

				<span class="mt-auto px-0 pt-5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] text-center text-xs text-ink-4">{{ appVersion }} · 鄯善县文化体育广播电视和旅游局</span>
			</div>
		</div>
	</div>
</template>

<script>
	import AppIcon from '@/components/AppIcon.vue';
	import GestureLock from '@/components/GestureLock.vue';
	import GestureSetter from '@/components/GestureSetter.vue';
	import config from '@/lib/config.js';
	import { reLaunch } from '@/lib/nav.js';
	import { getAppVersion, makePhoneCall, vibrateLong } from '@/lib/native.js';
	import { hideLoading, showLoading, showModal, toast } from '@/lib/ui.js';
	import { canUseOfflinePatrol, unlockOfflinePatrol, getLastUsername, isTokenFresh, setSession } from '@/lib/auth.js';
	import { loadTasks, syncPatrols } from '@/lib/patrol.js';
	import { extractError, request } from '@/lib/request.js';
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
	} from '@/lib/quickLogin.js';

	export default {
		components: { AppIcon, GestureLock, GestureSetter },
		data() {
			return {
				logoUrl: `${import.meta.env.BASE_URL}logo.png`,
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
			offlineAvailable() {
				return canUseOfflinePatrol();
			},
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
		mounted() {
			getAppVersion().then((v) => {
				if (v) this.appVersion = `v${v}`;
			}).catch(() => null);
			const query = this.$route.query || {};
			this.mode = 'password';
			this.busy = false;
			this.tip = '';
			this.tipError = false;
			this.expired = !!query.expired;
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
				reLaunch('/tabs/home');
			}
		},
		methods: {
			enterOffline() {
				try {
					unlockOfflinePatrol();
					reLaunch('/tabs/patrol');
				} catch (error) {
					toast(error.message);
				}
			},
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
					vibrateLong();
					if (result.remaining <= 0) {
						this.quick = getQuickLogin() || {};
						showModal({
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
				showLoading('正在登录');
				resumeSession()
					.then((session) => {
						hideLoading();
						if (session.offline) reLaunch('/tabs/patrol');
						else this.finishLogin();
					})
					.catch((err) => {
						hideLoading();
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
						toast((err && err.message) || '请输入密码登录', { icon: 'none', duration: 2500 });
					});
			},
			handleLogin() {
				if (this.busy) {
					return;
				}
				if (!this.form.username || !this.form.password) {
					toast('请输入账号和密码', { icon: 'none' });
					return;
				}
				this.busy = true;
				request({
					url: `${config.API_BASE_URL}/api/auth/login`,
					method: 'POST',
					data: this.form,
					header: { 'Content-Type': 'application/json' },
					timeout: 20000,
				}).then(
					(res) => {
						if (res.statusCode === 200 && res.data && (res.data.token || res.data.access_token)) {
							this.onLoginSuccess(res.data);
							return;
						}
						this.busy = false;
						toast(extractError(res, '账号或密码错误'), { icon: 'none', duration: 2500 });
					},
					() => {
						this.busy = false;
						toast('无法连接服务器，请检查网络', { icon: 'none', duration: 2500 });
					},
				);
			},
			onLoginSuccess(data) {
				const user = data.user || {};
				const existing = getQuickLogin();
				if (existing && existing.username !== user.username) {
					// 换了账号：旧账号的快捷登录不再适用
					clearQuickLogin();
				}
				try {
					setSession(data);
				} catch (error) {
					this.busy = false;
					toast(error.message || '本地登录信息保存失败，请检查存储空间');
					return;
				}
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
							toast(err.message, { icon: 'none' });
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
						showModal({
							title: '提示',
							content: `${message}。当前服务器版本较旧，登录状态最长保持 12 小时，过期后需重新输入密码。`,
							showCancel: false,
						}).then(() => this.finishLogin());
						return;
					}
					toast(message, { icon: 'success' });
					setTimeout(() => this.finishLogin(), 600);
				});
			},
			finishLogin() {
				loadTasks().catch(error => toast(error.message || error.errMsg || '巡查任务下载失败，请在巡查页面重试'));
				syncPatrols().catch(error => toast(error.message || '离线记录同步失败'));
				reLaunch('/tabs/home');
			},
			async handleForgotPassword() {
				const res = await showModal({
					title: '忘记密码',
					content: '请联系管理员重置密码\n联系电话：13899665458',
					confirmText: '拨打电话',
					cancelText: '知道了',
				});
				if (res.confirm) {
					makePhoneCall('13899665458');
				}
			},
		}
	};
</script>

<style scoped>
	.field-input { flex: 1; min-width: 0; padding: 0 !important; background: transparent; }
	.field-input :deep(.van-field__body) { height: 100%; align-items: center; }
	.field-input :deep(.van-field__control) { height: 100%; line-height: normal; padding: 0; font-size: 1rem; }
</style>
