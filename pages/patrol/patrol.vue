<template>
	<view class="container">
		<view class="hero-card">
			<view class="hero-top">
				<view>
					<text class="hero-label">{{ t('patrol.heroLabel') }}</text>
					<text class="hero-title">{{ currentUser.full_name || currentUser.username || t('patrol.notLoggedInUser') }}</text>
					<text class="hero-role">{{ t('patrol.currentRole', { role: getRoleText() }) }}</text>
				</view>
			</view>
			<text class="hero-desc">{{ t('patrol.heroDesc') }}</text>
		</view>

		<view class="location-section">
			<text class="section-kicker">{{ t('patrol.locationInfo') }}</text>
			<text class="location-address">{{ location.address || t('patrol.locating') }}</text>
			<text class="location-coord">{{ t('patrol.longitude') }} {{ location.longitude.toFixed(4) }} · {{ t('patrol.latitude') }} {{ location.latitude.toFixed(4) }}</text>
		</view>

		<view class="heritage-section">
			<text class="title">{{ t('patrol.nearestSite') }}</text>
			<view v-if="nearestSite">
				<text class="site-name">{{ nearestSite.name }}</text>
				<text v-if="typeof nearestSite.distance === 'number'" class="site-meta">{{ t('home.distanceKm', { distance: nearestSite.distance }) }}</text>
				<text v-else class="site-meta">{{ nearestSite.distance || t('patrol.selectedSite') }}</text>
				<text class="site-meta">{{ nearestSite.address || t('patrol.noAddressInfo') }}</text>
			</view>
			<view v-else>
				<text class="site-meta">{{ t('patrol.searching') }}</text>
			</view>
		</view>

		<view class="manual-section">
			<text class="title">{{ t('patrol.manualTitle') }}</text>
			<text class="manual-copy">{{ t('patrol.manualCopy') }}</text>
			<view class="manual-search-row">
				<input v-model="manualSearchKeyword" class="manual-input" :placeholder="t('patrol.manualSearchPlaceholder')" />
				<button class="manual-search-btn" @click="searchManualSites">{{ t('common.search') }}</button>
			</view>
			<picker
				class="manual-picker"
				:range="manualSites"
				range-key="name"
				@change="onManualSiteChange"
				:disabled="!manualSites.length"
			>
				<view class="manual-picker-text">{{ getManualPickerText() }}</view>
			</picker>
			<text v-if="!manualLoading && !manualSites.length" class="manual-empty">{{ t('patrol.manualNoResult') }}</text>
		</view>

		<view class="action-section">
			<text class="title">{{ t('patrol.actionTitle') }}</text>
			<text class="action-copy">{{ t('patrol.actionCopy') }}</text>
			<view class="status-row">
				<text class="status-label">{{ t('patrol.siteStatus') }}</text>
				<view class="status-options">
					<view :class="['status-option', inspectionStatus === 'normal' ? 'active' : '']" @click="setInspectionStatus('normal')">{{ t('patrol.normal') }}</view>
					<view :class="['status-option', 'problem', inspectionStatus === 'problem' ? 'active' : '']" @click="setInspectionStatus('problem')">{{ t('patrol.problem') }}</view>
				</view>
			</view>
			<textarea
				v-model="issueDetails"
				class="issue-textarea"
				:placeholder="inspectionStatus === 'problem' ? t('patrol.problemRequiredPlaceholder') : t('patrol.problemOptionalPlaceholder')"
			></textarea>
			<text v-if="inspectionStatus === 'problem'" class="issue-hint">{{ t('patrol.problemHint') }}</text>
			<button class="action-btn" @click="takePhoto">{{ t('patrol.takePhoto') }}</button>
		</view>

		<view class="preview-section" v-if="previewImage">
			<text class="title">{{ t('patrol.previewTitle') }}</text>
			<image :src="previewImage" mode="aspectFit"></image>
			<button class="upload-btn" @click="uploadRecord">{{ t('patrol.confirmUpload') }}</button>
		</view>

		<BottomNav current="patrol" :userInfo="currentUser" />
		
		<!-- 用于水印绘制的Canvas，应在视图外；尺寸需与原图一致避免裁切 -->
		<canvas
			canvas-id="watermarkCanvas"
			:width="watermarkCanvas.width"
			:height="watermarkCanvas.height"
			:style="`position:absolute;left:-9999px;top:-9999px;width:${watermarkCanvas.width}px;height:${watermarkCanvas.height}px;`"
		></canvas>
	</view>
</template>

<script>
	import { addWatermark } from '../../common/js/watermark.js';
	import config from '../../common/js/config.js';
	import { getAuthHeader, getToken, getUser } from '../../common/js/auth.js';
	import { getRoleLabel, t as translate } from '../../common/js/i18n.js';
	import createPageI18n from '../../common/js/pageI18n.js';
	import BottomNav from '../../components/BottomNav.vue';
	
	export default {
		mixins: [createPageI18n('patrol')],
		components: {
			BottomNav,
		},
		data() {
			return {
				currentUser: {},
				inspectionStatus: 'normal',
				issueDetails: '',
				locationAvailable: false,
				location: {
					latitude: 0,
					longitude: 0,
					address: translate('patrol.locating')
				},
				nearestSite: null,
				manualSearchKeyword: '',
				manualSites: [],
				manualSelectedIndex: -1,
				manualLoading: false,
				previewImage: null,
				patrolRecord: {
					site_id: null,
					photo_path: null,
					latitude: null,
					longitude: null,
				},
				watermarkCanvas: {
					width: 1,
					height: 1,
				},
			};
		},
		onLoad() {
			if (!getToken()) {
				uni.reLaunch({ url: '/pages/index/index' });
				return;
			}
			this.currentUser = getUser() || {};
			this.getCurrentLocation();
			this.loadManualSites();
		},
		methods: {
			getRoleText() {
				const role = this.currentUser.role || (this.currentUser.is_admin ? '管理员' : '看护员');
				return getRoleLabel(role);
			},
			getWatermarkUserName() {
				return this.currentUser.full_name || this.currentUser.username || this.t('patrol.notLoggedInUser');
			},
			getSelectedSiteName() {
				if (this.nearestSite && this.nearestSite.name) {
					return this.nearestSite.name;
				}

				if (this.manualSelectedIndex >= 0 && this.manualSites[this.manualSelectedIndex]) {
					return this.manualSites[this.manualSelectedIndex].name;
				}

				const matchedSite = this.manualSites.find(item => item.id === this.patrolRecord.site_id);
				if (matchedSite && matchedSite.name) {
					return matchedSite.name;
				}

				return this.t('patrol.unselectedSiteName');
			},
			buildWatermarkText(time) {
				const userName = this.getWatermarkUserName();
				const siteName = this.getSelectedSiteName();
				const longitude = Number(this.location.longitude || 0).toFixed(6);
				const latitude = Number(this.location.latitude || 0).toFixed(6);
				return `${this.t('patrol.watermarkUser')}: ${userName}\n${this.t('patrol.watermarkSite')}: ${siteName}\n${this.t('patrol.watermarkTime')}: ${time}\n${this.t('patrol.watermarkCoord')}: ${longitude}, ${latitude}`;
			},
			setInspectionStatus(status) {
				this.inspectionStatus = status;
			},
			// 1. 获取当前地理位置
			getCurrentLocation() {
				uni.getLocation({
					type: 'wgs84',
					geocode: true, // 返回地址信息
					success: (res) => {
						this.locationAvailable = true;
						this.location.latitude = res.latitude;
						this.location.longitude = res.longitude;
						this.location.address = res.address ? `${res.address.city}${res.address.district}${res.address.street}${res.address.streetNum}` : this.t('patrol.unknownLocation');
						this.findNearestSite();
					},
					fail: (err) => {
						this.locationAvailable = false;
						this.location.address = this.t('patrol.locationFailedManual');
						uni.showToast({
							title: this.t('patrol.locationFailedToast'),
							icon: 'none'
						});
						this.loadManualSites();
						console.error('获取位置失败:', err);
					}
				});
			},
			// 2. 请求后端查找最近的文物点
			findNearestSite() {
				uni.request({
					url: `${config.API_BASE_URL}/api/heritages/nearby`,
					method: 'GET',
					header: getAuthHeader(),
					data: {
						latitude: this.location.latitude,
						longitude: this.location.longitude
					},
					success: (res) => {
						if (res.statusCode === 200 && res.data) {
							this.nearestSite = res.data;
							this.patrolRecord.site_id = res.data.id;
						} else {
							this.nearestSite = { name: this.t('patrol.nearbyNotFound'), distance: '-' };
						}
					},
					fail: (err) => {
						this.nearestSite = { name: this.t('patrol.nearbyFailed'), distance: '-' };
						this.loadManualSites();
						console.error('查找最近文物点失败:', err);
					}
				});
			},
			loadManualSites(keyword = '') {
				this.manualLoading = true;
				uni.request({
					url: `${config.API_BASE_URL}/api/heritages/search`,
					method: 'GET',
					header: getAuthHeader(),
					data: {
						q: keyword,
						limit: 20,
					},
					success: (res) => {
						if (res.statusCode === 200 && res.data) {
							this.manualSites = res.data.items || [];
							const selectedId = this.patrolRecord.site_id;
							this.manualSelectedIndex = this.manualSites.findIndex(item => item.id === selectedId);
							return;
						}
						this.manualSites = [];
						this.manualSelectedIndex = -1;
					},
					fail: () => {
						this.manualSites = [];
						this.manualSelectedIndex = -1;
					},
					complete: () => {
						this.manualLoading = false;
					}
				});
			},
			searchManualSites() {
				this.loadManualSites(this.manualSearchKeyword || '');
			},
			onManualSiteChange(event) {
				const index = Number(event.detail.value);
				const site = this.manualSites[index];
				if (!site) {
					return;
				}
				this.manualSelectedIndex = index;
				this.selectManualSite(site);
			},
			getManualPickerText() {
				if (!this.manualSites.length) {
					return this.manualLoading ? this.t('patrol.loadingSites') : this.t('patrol.noSelectableSites');
				}
				if (this.manualSelectedIndex < 0 || !this.manualSites[this.manualSelectedIndex]) {
					return this.t('patrol.selectPatrolSite');
				}
				const site = this.manualSites[this.manualSelectedIndex];
				return this.t('patrol.selectedSiteFormat', {
					name: site.name,
					code: site.sip_code || this.t('patrol.noCode'),
				});
			},
			selectManualSite(site) {
				this.nearestSite = {
					id: site.id,
					name: site.name,
					address: site.address,
					distance: this.t('patrol.manualSelected'),
				};
				this.patrolRecord.site_id = site.id;

				if (!this.locationAvailable) {
					this.location.latitude = Number(site.latitude) || 0;
					this.location.longitude = Number(site.longitude) || 0;
					this.location.address = site.address || this.t('patrol.manualSelectedAddress', { name: site.name });
				}

				uni.showToast({ title: this.t('patrol.selectedToast', { name: site.name }), icon: 'none' });
			},
			// 3. 拍照
			takePhoto() {
				if (!this.patrolRecord.site_id) {
					uni.showToast({
						title: this.t('patrol.selectSiteFirst'),
						icon: 'none'
					});
					return;
				}
				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['camera'],
					success: (res) => {
						const tempFilePath = res.tempFilePaths[0];
						const now = new Date();
						const time = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
						const watermarkText = this.buildWatermarkText(time);
						
						// 4. 添加水印
						addWatermark(tempFilePath, watermarkText, this).then(watermarkedPath => {
							this.previewImage = watermarkedPath;
							this.patrolRecord.photo_path = watermarkedPath;
							this.patrolRecord.latitude = this.location.latitude;
							this.patrolRecord.longitude = this.location.longitude;
						}).catch(err => {
							// 水印失败时回退到原图，避免影响巡查提交流程
							uni.showToast({ title: this.t('patrol.watermarkFailed'), icon: 'none' });
							this.previewImage = tempFilePath;
							this.patrolRecord.photo_path = tempFilePath;
							this.patrolRecord.latitude = this.location.latitude;
							this.patrolRecord.longitude = this.location.longitude;
							console.error('水印添加失败:', err);
						});
					},
					fail: (err) => {
						if (err && /cancel/i.test(String(err.errMsg || ''))) {
							return;
						}
						uni.showToast({ title: this.t('patrol.watermarkFailed'), icon: 'none' });
						console.error('拍照失败:', err);
					}
				});
			},
			// 5. 上传巡查记录
			uploadRecord() {
				if (!this.patrolRecord.photo_path) {
					uni.showToast({ title: this.t('patrol.shootPhotoFirst'), icon: 'none' });
					return;
				}

				const issueDetails = (this.issueDetails || '').trim();
				if (this.inspectionStatus === 'problem' && !issueDetails) {
					uni.showToast({ title: this.t('patrol.fillIssueDetails'), icon: 'none' });
					return;
				}

				if (this.patrolRecord.latitude == null || this.patrolRecord.longitude == null) {
					this.patrolRecord.latitude = this.location.latitude;
					this.patrolRecord.longitude = this.location.longitude;
				}

				uni.uploadFile({
					url: `${config.API_BASE_URL}/api/inspections/upload`,
					filePath: this.patrolRecord.photo_path,
					name: 'photo',
					header: getAuthHeader(),
					formData: {
						'site_id': this.patrolRecord.site_id,
						'latitude': this.patrolRecord.latitude,
						'longitude': this.patrolRecord.longitude,
						'is_normal': this.inspectionStatus !== 'problem',
						'issue_details': issueDetails,
					},
					success: (uploadRes) => {
						let data = {};
						try {
							data = JSON.parse(uploadRes.data || '{}');
						} catch (e) {
							data = {};
						}
						if (uploadRes.statusCode === 201) {
							uni.showToast({
								title: this.t('patrol.uploadSuccess'),
								icon: 'success'
							});
							this.previewImage = null; // 清空预览
							this.patrolRecord.photo_path = null;
							this.inspectionStatus = 'normal';
							this.issueDetails = '';
						} else {
							uni.showToast({
								title: data.detail || this.t('patrol.uploadFailed'),
								icon: 'none'
							});
						}
					},
					fail: (err) => {
						uni.showToast({
							title: this.t('patrol.uploadFailedNetwork'),
							icon: 'none'
						});
						console.error('上传失败:', err);
					}
				});
			}
		}
	}
</script>

<style>
	.container {
		min-height: 100vh;
		padding: 24rpx;
		padding-bottom: calc(184rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(184rpx + constant(safe-area-inset-bottom));
		box-sizing: border-box;
		font-size: 14px;
		line-height: 24px;
		background: var(--bg-primary);
	}
	.hero-card {
		min-height: var(--topbar-min-height);
		width: 100%;
		box-sizing: border-box;
		padding: 24rpx;
		border-radius: var(--radius-card);
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: var(--text-contrast);
		margin-bottom: 24rpx;
		box-shadow: var(--shadow-strong);
	}
	.hero-top {
		display: flex;
		justify-content: space-between;
		gap: 16rpx;
	}
	.hero-label {
		display: block;
		font-size: 20rpx;
		letter-spacing: 3rpx;
		text-transform: uppercase;
		opacity: 0.7;
		margin-bottom: 10rpx;
	}
	.hero-title {
		display: block;
		font-size: 20px;
		font-weight: 700;
		margin-bottom: 10rpx;
	}
	.hero-role, .hero-desc {
		display: block;
		font-size: 14px;
		line-height: 1.7;
		opacity: 0.84;
	}
	.hero-actions {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}
	.small-btn {
		padding: 0 22rpx;
		line-height: 60rpx;
		height: 60rpx;
		border-radius: var(--radius-pill);
		font-size: 23rpx;
	}
	.primary-btn {
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
	}
	.secondary-btn {
		background: rgba(255, 255, 255, 0.14);
		color: #fff;
		border: 1rpx solid rgba(255, 255, 255, 0.2);
	}
	.ghost-btn {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
		border: 1rpx solid rgba(255, 255, 255, 0.18);
	}
	.location-section, .heritage-section, .action-section, .preview-section, .manual-section {
		margin-bottom: 20px;
		padding: var(--card-padding);
		border: 1rpx solid var(--line-soft);
		border-radius: 18rpx;
		display: flex;
		flex-direction: column;
		background: #fff;
		backdrop-filter: blur(8rpx);
		box-shadow: var(--shadow-soft);
	}
	.manual-copy {
		display: block;
		font-size: 24rpx;
		color: var(--text-secondary);
		line-height: 1.7;
		margin-bottom: 12rpx;
	}
	.manual-search-row {
		display: flex;
		gap: 10rpx;
		margin-bottom: 12rpx;
	}
	.manual-input {
		flex: 1;
		height: 72rpx;
		background: var(--input-bg);
		border: 1rpx solid var(--line-soft);
		border-radius: 16rpx;
		padding: 0 18rpx;
		font-size: 24rpx;
	}
	.manual-search-btn {
		width: 140rpx;
		height: 72rpx;
		line-height: 72rpx;
		padding: 0;
		border-radius: 16rpx;
		font-size: 24rpx;
		color: #fff;
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
	}
	.manual-picker {
		margin-top: 4rpx;
	}
	.manual-picker-text {
		height: 76rpx;
		line-height: 76rpx;
		padding: 0 18rpx;
		border-radius: 16rpx;
		border: 1rpx solid var(--line-soft);
		background: rgba(255, 255, 255, 0.72);
		font-size: 24rpx;
		color: var(--text-primary);
	}
	.manual-empty {
		display: block;
		font-size: 23rpx;
		color: var(--text-secondary);
		padding: 8rpx 2rpx;
	}
	.section-kicker {
		display: block;
		font-size: 20rpx;
		letter-spacing: 3rpx;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin-bottom: 12rpx;
	}
	.location-address {
		display: block;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 10rpx;
		line-height: 1.5;
	}
	.location-coord {
		display: block;
		font-size: 14px;
		color: var(--text-secondary);
	}
	.title {
		font-size: var(--title-lg);
		font-weight: 700;
		margin-bottom: 10px;
		color: var(--text-primary);
	}
	.site-name {
		display: block;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 10rpx;
	}
	.site-meta, .action-copy {
		display: block;
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.7;
		margin-bottom: 8rpx;
	}
	.status-row {
		margin: 6rpx 0 10rpx;
	}
	.status-label {
		display: block;
		font-size: 14px;
		color: var(--text-secondary);
		margin-bottom: 10rpx;
	}
	.status-options {
		display: flex;
		gap: 12rpx;
	}
	.status-option {
		flex: 1;
		height: 72rpx;
		line-height: 72rpx;
		text-align: center;
		border-radius: 14rpx;
		font-size: 24rpx;
		font-weight: 600;
		background: var(--input-bg);
		color: var(--text-secondary);
		border: 1rpx solid var(--line-soft);
	}
	.status-option.active {
		background: var(--accent-soft);
		color: var(--accent-strong);
		border-color: var(--accent);
	}
	.status-option.problem.active {
		background: var(--danger-soft);
		color: var(--danger);
		border-color: rgba(220, 38, 38, 0.3);
	}
	.issue-textarea {
		width: 100%;
		height: 140rpx;
		margin-top: 12rpx;
		padding: 18rpx;
		box-sizing: border-box;
		border-radius: 16rpx;
		background: var(--input-bg);
		border: 1rpx solid var(--line-soft);
		font-size: 24rpx;
		line-height: 1.6;
		color: var(--text-primary);
	}
	.issue-hint {
		display: block;
		margin-top: 8rpx;
		font-size: 22rpx;
		color: var(--danger);
	}
	.action-btn, .upload-btn {
		margin-top: 14rpx;
		border-radius: var(--radius-pill);
		font-size: 28rpx;
		font-weight: 700;
	}
	.action-btn {
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
	}
	.action-btn:active,
	.upload-btn:active,
	.manual-search-btn:active {
		opacity: 0.92;
		transform: translateY(1rpx);
	}
	.upload-btn {
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
	}
	.preview-section image {
		width: 100%;
		margin-top: 10px;
		margin-bottom: 10px;
		border-radius: 18rpx;
	}
</style>
