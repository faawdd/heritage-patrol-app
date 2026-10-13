<template>
	<view class="u-page has-tabbar">
		<AppHeader title="巡查上报" subtitle="按照下面 3 步完成上报" />

		<view class="u-body steps">
			<!-- 第 1 步：文物点 -->
			<view class="u-card step" :class="{ finished: !!site }">
				<view class="step-head">
					<view class="step-no">{{ site ? '✓' : '1' }}</view>
					<text class="step-title">确认文物点</text>
				</view>

				<view v-if="locating && !site" class="locating">
					<AppIcon name="locate" :size="56" color="#94A3B8" />
					<text>正在定位，查找附近文物点…</text>
				</view>

				<view v-else-if="site" class="site">
					<view class="site-main">
						<text class="site-name">{{ site.name }}</text>
						<text v-if="site.address" class="site-addr">{{ site.address }}</text>
						<view class="site-tags">
							<text v-if="site.manual" class="u-badge info">手动选择</text>
							<text v-else-if="distanceText" class="u-badge" :class="isFar ? 'warn' : 'ok'">距离约 {{ distanceText }}</text>
							<text v-if="!locationOk" class="u-badge warn">未获取到定位</text>
						</view>
					</view>
					<button class="u-btn sm change-btn" @click="openPicker">换一个</button>
				</view>

				<view v-else class="locating">
					<AppIcon name="alert" :size="56" color="#B45309" />
					<text>{{ locateError || '附近没有找到文物点' }}</text>
				</view>

				<view v-if="site && isFar" class="far-tip">
					<AppIcon name="alert" :size="40" color="#B45309" />
					<text>您离这个文物点较远，请确认是否在现场。</text>
				</view>

				<view class="row-btns">
					<button v-if="!site" class="u-btn primary block" @click="openPicker">
						<AppIcon name="search" :size="44" color="#FFFFFF" />
						<text>选择文物点</text>
					</button>
					<button class="u-btn plain block" :disabled="locating" @click="locate">
						<AppIcon name="refresh" :size="40" color="#334155" />
						<text>{{ locating ? '定位中…' : '重新定位' }}</text>
					</button>
				</view>
			</view>

			<!-- 第 2 步：拍照 -->
			<view class="u-card step" :class="{ finished: !!photo, disabled: !site }">
				<view class="step-head">
					<view class="step-no">{{ photo ? '✓' : '2' }}</view>
					<text class="step-title">拍摄现场照片</text>
				</view>
				<view v-if="!photo" class="shoot" @click="takePhoto">
					<view class="shoot-icon">
						<AppIcon name="camera" :size="88" color="#FFFFFF" />
					</view>
					<text class="shoot-text">{{ processing ? '正在处理照片…' : '点这里拍照' }}</text>
					<text class="shoot-sub">照片会自动加上时间、地点水印</text>
				</view>
				<view v-else class="photo">
					<image class="photo-img" :src="photo" mode="aspectFill" @click="preview" />
					<button class="u-btn plain block" @click="takePhoto">
						<AppIcon name="camera" :size="44" color="#334155" />
						<text>重新拍照</text>
					</button>
				</view>
			</view>

			<!-- 第 3 步：情况 -->
			<view class="u-card step" :class="{ finished: status === 'normal' || (status === 'problem' && issueText), disabled: !photo }">
				<view class="step-head">
					<view class="step-no">3</view>
					<text class="step-title">文物点情况</text>
				</view>
				<view class="status-row">
					<view class="status-btn ok" :class="{ active: status === 'normal' }" @click="setStatus('normal')">
						<AppIcon name="check-circle" :size="72" :color="status === 'normal' ? '#FFFFFF' : '#15803D'" />
						<text>正常</text>
					</view>
					<view class="status-btn bad" :class="{ active: status === 'problem' }" @click="setStatus('problem')">
						<AppIcon name="alert" :size="72" :color="status === 'problem' ? '#FFFFFF' : '#C62828'" />
						<text>有问题</text>
					</view>
				</view>

				<view v-if="status === 'problem'" class="issue u-fade-in">
					<text class="issue-label">发现了什么问题？（可多选）</text>
					<view class="chips">
						<view
							v-for="item in issueOptions"
							:key="item"
							class="chip"
							:class="{ active: chips.indexOf(item) > -1 }"
							@click="toggleChip(item)"
						>{{ item }}</view>
					</view>
					<textarea
						v-model="issueNote"
						class="issue-input"
						maxlength="300"
						placeholder="补充说明（选填）：例如位置、范围、严重程度"
						placeholder-class="u-placeholder"
						:auto-height="false"
					/>
				</view>
			</view>

			<button class="u-btn xl block submit" :class="canSubmit ? 'primary' : 'plain'" :disabled="submitting" @click="submit">
				<AppIcon name="upload" :size="56" :color="canSubmit ? '#FFFFFF' : '#94A3B8'" />
				<text>{{ submitting ? '正在上报…' : '提交巡查' }}</text>
			</button>
			<text class="submit-hint">{{ submitHint }}</text>
		</view>

		<!-- 文物点选择 -->
		<view v-if="pickerOpen" class="sheet-mask" @click="pickerOpen = false">
			<view class="sheet" @click.stop>
				<view class="sheet-head">
					<text class="sheet-title">选择文物点</text>
					<view class="sheet-close" @click="pickerOpen = false">
						<AppIcon name="close" :size="48" color="#334155" />
					</view>
				</view>
				<view class="search">
					<AppIcon name="search" :size="44" color="#64748B" />
					<input
						v-model.trim="keyword"
						class="search-input"
						placeholder="输入文物点名称搜索"
						placeholder-class="u-placeholder"
						confirm-type="search"
						@input="onKeyword"
						@confirm="searchSites"
					/>
				</view>
				<scroll-view scroll-y class="sheet-list">
					<view v-if="searching" class="u-empty">正在搜索…</view>
					<view v-else-if="!sites.length" class="u-empty">没有找到文物点，换个名字试试</view>
					<view
						v-for="item in sites"
						:key="item.id"
						class="site-option"
						:class="{ active: site && site.id === item.id }"
						@click="chooseSite(item)"
					>
						<view class="site-option-main">
							<text class="site-option-name">{{ item.name }}</text>
							<text class="site-option-sub">{{ [item.level, item.address].filter(Boolean).join(' · ') || item.sip_code || '' }}</text>
						</view>
						<AppIcon v-if="site && site.id === item.id" name="check" :size="48" color="#1E5AA8" :stroke="3" />
					</view>
				</scroll-view>
			</view>
		</view>

		<!-- 提交成功 -->
		<view v-if="success" class="success-mask">
			<view class="success u-fade-in">
				<view class="success-icon">
					<AppIcon name="check" :size="120" color="#FFFFFF" :stroke="3" />
				</view>
				<text class="success-title">上报成功</text>
				<text class="success-sub">{{ success.site }} · {{ success.normal ? '情况正常' : '已上报问题' }}</text>
				<button class="u-btn primary xl block" @click="again">继续巡查</button>
				<button class="u-btn ghost block" style="margin-top: 24rpx" @click="goRecords">查看我的记录</button>
			</view>
		</view>

		<BottomNav current="patrol" :userInfo="user" />

		<!-- 水印绘制用的离屏 Canvas，尺寸需与原图一致避免裁切 -->
		<canvas
			canvas-id="watermarkCanvas"
			:width="watermarkCanvas.width"
			:height="watermarkCanvas.height"
			:style="`position:absolute;left:-9999px;top:-9999px;width:${watermarkCanvas.width}px;height:${watermarkCanvas.height}px;`"
		></canvas>
	</view>
</template>

<script>
	import AppHeader from '../../components/AppHeader.vue';
	import AppIcon from '../../components/AppIcon.vue';
	import BottomNav from '../../components/BottomNav.vue';
	import { addWatermark } from '../../common/js/watermark.js';
	import { getToken, getUser } from '../../common/js/auth.js';
	import { apiRequest, apiUpload, extractError } from '../../common/js/request.js';
	import { formatDistance, getLocation, pad } from '../../common/js/format.js';

	const FAR_KM = 1;

	export default {
		components: { AppHeader, AppIcon, BottomNav },
		data() {
			return {
				user: {},
				locating: false,
				locationOk: false,
				locateError: '',
				location: { latitude: 0, longitude: 0 },
				site: null,
				pickerOpen: false,
				keyword: '',
				sites: [],
				searching: false,
				searchTimer: null,
				photo: '',
				processing: false,
				status: '',
				chips: [],
				issueNote: '',
				issueOptions: ['盗掘痕迹', '人为破坏', '自然损毁', '违规建设', '标志碑损坏', '垃圾堆放', '其他'],
				submitting: false,
				success: null,
				watermarkCanvas: { width: 1, height: 1 },
			};
		},
		computed: {
			distanceText() {
				return this.site ? formatDistance(this.site.distance) : '';
			},
			isFar() {
				return !!(this.site && !this.site.manual && Number(this.site.distance) > FAR_KM);
			},
			issueText() {
				const note = (this.issueNote || '').trim();
				const tags = this.chips.join('、');
				if (tags && note) {
					return `${tags}：${note}`;
				}
				return tags || note;
			},
			canSubmit() {
				return !!(this.site && this.photo && (this.status === 'normal' || (this.status === 'problem' && this.issueText)));
			},
			submitHint() {
				if (!this.site) return '请先确认文物点';
				if (!this.photo) return '请拍摄现场照片';
				if (!this.status) return '请选择「正常」或「有问题」';
				if (this.status === 'problem' && !this.issueText) return '请选择或填写发现的问题';
				return '信息已填好，请点击提交';
			},
		},
		onLoad() {
			if (!getToken()) {
				uni.reLaunch({ url: '/pages/index/index' });
				return;
			}
			this.user = getUser() || {};
			this.locate();
		},
		onUnload() {
			clearTimeout(this.searchTimer);
		},
		methods: {
			locate() {
				this.locating = true;
				this.locateError = '';
				return getLocation()
					.then((loc) => {
						this.locationOk = true;
						this.location = { latitude: loc.latitude, longitude: loc.longitude };
						return apiRequest({ url: '/api/heritages/nearby', data: this.location });
					})
					.then((res) => {
						if (res.statusCode === 200 && res.data && res.data.id) {
							// 手动选择后再次定位时，不覆盖用户的选择
							if (!this.site || !this.site.manual) {
								this.site = { ...res.data, manual: false };
							}
						} else if (!this.site) {
							this.locateError = '附近没有找到文物点，请手动选择';
						}
					})
					.catch(() => {
						if (!this.locationOk) {
							this.locateError = '定位失败，请打开手机定位(GPS)后重试，或手动选择文物点';
						} else if (!this.site) {
							this.locateError = '网络不好，查找文物点失败，请重试';
						}
					})
					.finally(() => {
						this.locating = false;
					});
			},
			openPicker() {
				this.pickerOpen = true;
				if (!this.sites.length) {
					this.searchSites();
				}
			},
			onKeyword() {
				clearTimeout(this.searchTimer);
				this.searchTimer = setTimeout(() => this.searchSites(), 400);
			},
			searchSites() {
				this.searching = true;
				apiRequest({ url: '/api/heritages/search', data: { q: this.keyword || '', limit: 50 } })
					.then((res) => {
						this.sites = res.statusCode === 200 && res.data ? res.data.items || [] : [];
					})
					.catch(() => {
						this.sites = [];
						uni.showToast({ title: '网络不好，请重试', icon: 'none' });
					})
					.finally(() => {
						this.searching = false;
					});
			},
			chooseSite(item) {
				this.site = {
					id: item.id,
					name: item.name,
					address: item.address,
					latitude: item.latitude,
					longitude: item.longitude,
					manual: true,
				};
				if (!this.locationOk) {
					this.location = { latitude: Number(item.latitude) || 0, longitude: Number(item.longitude) || 0 };
				}
				this.pickerOpen = false;
			},
			takePhoto() {
				if (!this.site) {
					uni.showToast({ title: '请先确认文物点', icon: 'none' });
					return;
				}
				if (this.processing) {
					return;
				}
				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['camera'],
					success: (res) => {
						const path = res.tempFilePaths[0];
						this.processing = true;
						addWatermark(path, this.watermarkText(), this)
							.then((marked) => {
								this.photo = marked;
							})
							.catch(() => {
								this.photo = path;
								uni.showToast({ title: '水印添加失败，已使用原图', icon: 'none' });
							})
							.finally(() => {
								this.processing = false;
							});
					},
					fail: (err) => {
						if (err && /cancel/i.test(String(err.errMsg || ''))) {
							return;
						}
						uni.showToast({ title: '无法打开相机，请检查相机权限', icon: 'none' });
					},
				});
			},
			watermarkText() {
				const d = new Date();
				const time = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
				const name = this.user.full_name || this.user.username || '-';
				const lng = Number(this.location.longitude || 0).toFixed(6);
				const lat = Number(this.location.latitude || 0).toFixed(6);
				return `巡查人: ${name}\n文物点: ${this.site ? this.site.name : '-'}\n时间: ${time}\n坐标: ${lng}, ${lat}`;
			},
			preview() {
				uni.previewImage({ urls: [this.photo] });
			},
			setStatus(value) {
				this.status = value;
			},
			toggleChip(item) {
				const i = this.chips.indexOf(item);
				if (i > -1) {
					this.chips.splice(i, 1);
				} else {
					this.chips.push(item);
				}
			},
			submit() {
				if (this.submitting) {
					return;
				}
				if (!this.canSubmit) {
					uni.showToast({ title: this.submitHint, icon: 'none' });
					return;
				}
				const doSubmit = () => {
					this.submitting = true;
					uni.showLoading({ title: '正在上报', mask: true });
					apiUpload({
						url: '/api/inspections/upload',
						filePath: this.photo,
						name: 'photo',
						formData: {
							site_id: this.site.id,
							latitude: this.location.latitude,
							longitude: this.location.longitude,
							is_normal: this.status === 'normal',
							issue_details: this.status === 'problem' ? this.issueText : '',
						},
					})
						.then((res) => {
							uni.hideLoading();
							if (res.statusCode === 201 || res.statusCode === 200) {
								this.success = { site: this.site.name, normal: this.status === 'normal' };
								// #ifdef APP-PLUS
								uni.vibrateLong();
								// #endif
								return;
							}
							uni.showModal({ title: '上报失败', content: extractError(res, '上报失败，请稍后重试'), showCancel: false });
						})
						.catch(() => {
							uni.hideLoading();
							uni.showModal({
								title: '网络不好',
								content: '照片没有传上去，请到信号好的地方再点「提交巡查」。已拍的照片和填写的内容会保留。',
								showCancel: false,
								confirmText: '知道了',
							});
						})
						.finally(() => {
							this.submitting = false;
						});
				};
				if (this.isFar) {
					uni.showModal({
						title: '确认提交',
						content: `您距离「${this.site.name}」约 ${this.distanceText}，确定已经在现场了吗？`,
						confirmText: '确定提交',
						cancelText: '再看看',
						success: (r) => r.confirm && doSubmit(),
					});
					return;
				}
				doSubmit();
			},
			again() {
				this.success = null;
				this.photo = '';
				this.status = '';
				this.chips = [];
				this.issueNote = '';
				this.site = null;
				uni.pageScrollTo({ scrollTop: 0, duration: 0 });
				this.locate();
			},
			goRecords() {
				uni.reLaunch({ url: '/pages/records/records' });
			},
		},
	};
</script>

<style>
	.steps {
		padding-top: 28rpx;
	}

	.step {
		border: 3rpx solid transparent;
		transition: opacity 0.2s;
	}

	.step.finished {
		border-color: #BBE3C8;
	}

	.step.disabled {
		opacity: 0.55;
	}

	.step-head {
		display: flex;
		align-items: center;
		gap: 18rpx;
		margin-bottom: 24rpx;
	}

	.step-no {
		width: 60rpx;
		height: 60rpx;
		border-radius: 50%;
		background: #1E5AA8;
		color: #FFFFFF;
		font-size: 34rpx;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.finished .step-no {
		background: #15803D;
	}

	.step-title {
		font-size: 40rpx;
		font-weight: 800;
		color: #0F172A;
	}

	.locating {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16rpx;
		padding: 20rpx 0 28rpx;
		font-size: 32rpx;
		color: #475569;
		text-align: center;
	}

	.site {
		display: flex;
		align-items: flex-start;
		gap: 20rpx;
		padding: 24rpx;
		border-radius: 24rpx;
		background: #F5F8FD;
	}

	.site-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.site-name {
		font-size: 42rpx;
		font-weight: 800;
		color: #0F172A;
		line-height: 1.3;
	}

	.site-addr {
		margin-top: 8rpx;
		font-size: 28rpx;
		color: #64748B;
	}

	.site-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-top: 16rpx;
	}

	.change-btn {
		flex-shrink: 0;
	}

	.far-tip {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-top: 20rpx;
		padding: 18rpx 22rpx;
		border-radius: 18rpx;
		background: #FEF3E2;
		color: #B45309;
		font-size: 30rpx;
		font-weight: 600;
	}

	.row-btns {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		margin-top: 24rpx;
	}

	.shoot {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 48rpx 24rpx;
		border-radius: 28rpx;
		border: 4rpx dashed #9DB9E0;
		background: #F5F8FD;
	}

	.shoot:active {
		background: #E8F0FB;
	}

	.shoot-icon {
		width: 168rpx;
		height: 168rpx;
		border-radius: 50%;
		background: linear-gradient(135deg, #2A6BC2, #174B8F);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 14rpx 32rpx rgba(30, 90, 168, 0.35);
	}

	.shoot-text {
		margin-top: 24rpx;
		font-size: 40rpx;
		font-weight: 800;
		color: #1E5AA8;
	}

	.shoot-sub {
		margin-top: 8rpx;
		font-size: 28rpx;
		color: #64748B;
	}

	.photo {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.photo-img {
		width: 100%;
		height: 440rpx;
		border-radius: 24rpx;
		background: #E2E8F0;
	}

	.status-row {
		display: flex;
		gap: 24rpx;
	}

	.status-btn {
		flex: 1;
		height: 200rpx;
		border-radius: 28rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12rpx;
		font-size: 40rpx;
		font-weight: 800;
		border: 4rpx solid;
		transition: all 0.15s;
	}

	.status-btn.ok {
		color: #15803D;
		border-color: #A7DDB9;
		background: #F1FAF4;
	}

	.status-btn.bad {
		color: #C62828;
		border-color: #F1B5B5;
		background: #FEF5F5;
	}

	.status-btn.ok.active {
		color: #FFFFFF;
		background: #15803D;
		border-color: #15803D;
		box-shadow: 0 12rpx 28rpx rgba(21, 128, 61, 0.32);
	}

	.status-btn.bad.active {
		color: #FFFFFF;
		background: #C62828;
		border-color: #C62828;
		box-shadow: 0 12rpx 28rpx rgba(198, 40, 40, 0.3);
	}

	.issue {
		margin-top: 28rpx;
	}

	.issue-label {
		display: block;
		font-size: 32rpx;
		font-weight: 700;
		color: #334155;
		margin-bottom: 18rpx;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
	}

	.chip {
		padding: 20rpx 28rpx;
		border-radius: 999rpx;
		border: 3rpx solid #E2E8F0;
		background: #FFFFFF;
		font-size: 32rpx;
		color: #334155;
	}

	.chip.active {
		border-color: #C62828;
		background: #FDECEC;
		color: #C62828;
		font-weight: 700;
	}

	.issue-input {
		width: 100%;
		height: 220rpx;
		margin-top: 24rpx;
		padding: 24rpx;
		border-radius: 24rpx;
		border: 3rpx solid #E2E8F0;
		background: #F8FAFC;
		font-size: 32rpx;
		color: #0F172A;
		box-sizing: border-box;
	}

	.submit {
		margin-top: 12rpx !important;
	}

	.submit-hint {
		display: block;
		margin: 18rpx 0 28rpx;
		text-align: center;
		font-size: 30rpx;
		color: #64748B;
	}

	.sheet-mask,
	.success-mask {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 1000;
		background: rgba(15, 23, 42, 0.5);
		display: flex;
	}

	.sheet-mask {
		align-items: flex-end;
	}

	.sheet {
		width: 100%;
		height: 82vh;
		background: #FFFFFF;
		border-radius: 36rpx 36rpx 0 0;
		display: flex;
		flex-direction: column;
		padding: 32rpx 32rpx env(safe-area-inset-bottom);
		box-sizing: border-box;
	}

	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sheet-title {
		font-size: 42rpx;
		font-weight: 800;
		color: #0F172A;
	}

	.sheet-close {
		padding: 12rpx;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 16rpx;
		height: 104rpx;
		margin: 24rpx 0 12rpx;
		padding: 0 24rpx;
		border-radius: 24rpx;
		background: #F1F5FB;
		border: 3rpx solid #E2E8F0;
	}

	.search-input {
		flex: 1;
		height: 100%;
		font-size: 34rpx;
	}

	.sheet-list {
		flex: 1;
		height: 0;
	}

	.site-option {
		display: flex;
		align-items: center;
		gap: 16rpx;
		padding: 28rpx 8rpx;
		border-bottom: 2rpx solid #EEF2F7;
	}

	.site-option.active {
		background: #F5F8FD;
	}

	.site-option-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.site-option-name {
		font-size: 36rpx;
		font-weight: 700;
		color: #0F172A;
	}

	.site-option-sub {
		margin-top: 4rpx;
		font-size: 28rpx;
		color: #64748B;
	}

	.success-mask {
		align-items: center;
		justify-content: center;
		padding: 40rpx;
	}

	.success {
		width: 100%;
		padding: 56rpx 40rpx 44rpx;
		border-radius: 40rpx;
		background: #FFFFFF;
		display: flex;
		flex-direction: column;
		align-items: center;
		box-sizing: border-box;
	}

	.success-icon {
		width: 200rpx;
		height: 200rpx;
		border-radius: 50%;
		background: #15803D;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 0 24rpx #E7F6EC;
	}

	.success-title {
		margin-top: 44rpx;
		font-size: 52rpx;
		font-weight: 800;
		color: #15803D;
	}

	.success-sub {
		margin: 12rpx 0 48rpx;
		font-size: 32rpx;
		color: #475569;
		text-align: center;
	}
</style>
