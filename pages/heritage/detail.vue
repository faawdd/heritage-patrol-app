<template>
	<view class="page">
		<view v-if="loading && !detail" class="state-box">
			<text class="state-text">{{ t('heritageDetail.loading') }}</text>
		</view>

		<view v-else-if="errorMessage && !detail" class="state-box">
			<text class="state-text">{{ errorMessage }}</text>
			<button class="primary-btn state-btn" @click="loadDetail">{{ t('heritageDetail.retry') }}</button>
		</view>

		<view v-else-if="detail" class="content">
			<view class="hero-card">
				<text class="hero-main">{{ detail.header.main_title }}</text>
				<text v-if="detail.header.sub_title" class="hero-sub">{{ detail.header.sub_title }}</text>
				<text class="hero-name">{{ detail.name }}</text>
				<view class="code-grid">
					<view class="code-cell">
						<text class="code-label">{{ t('heritageDetail.surveyCode') }}</text>
						<text class="code-value">{{ detail.codes.survey_code || '——' }}</text>
					</view>
					<view v-if="detail.codes.previous_survey_code" class="code-cell">
						<text class="code-label">{{ t('heritageDetail.previousCode') }}</text>
						<text class="code-value">{{ detail.codes.previous_survey_code }}</text>
					</view>
					<view class="code-cell">
						<text class="code-label">{{ t('heritageDetail.collectedAt') }}</text>
						<text class="code-value">{{ detail.codes.collected_at || '——' }}</text>
					</view>
				</view>
				<view class="action-row">
					<button v-if="hasLocation" class="ghost-btn" @click="copyCoordinates">{{ t('heritageDetail.copyCoords') }}</button>
					<button v-if="hasLocation" class="ghost-btn" @click="openMap">{{ t('heritageDetail.openMap') }}</button>
					<button v-if="detail.web_url" class="ghost-btn" @click="openOnline">{{ t('heritageDetail.openOnline') }}</button>
				</view>
			</view>

			<view v-if="!detail.is_registered" class="notice-card">
				<text class="notice-text">{{ t('heritageDetail.notRegistered') }}</text>
			</view>

			<view v-for="section in detail.sections" :key="section.key" class="section-card">
				<text class="section-title">{{ section.title }}</text>
				<view class="field-grid">
					<view
						v-for="(field, index) in section.items"
						:key="section.key + '-' + index"
						:class="['field', field.wide || field.type === 'longtext' || field.type === 'choices' ? 'field-wide' : '']"
					>
						<text v-if="!field.hide_label" class="field-label">{{ field.label }}</text>
						<view v-if="field.type === 'choices'" class="chip-row">
							<text
								v-for="(option, optIndex) in field.options"
								:key="optIndex"
								:class="['chip', option.checked ? 'chip-checked' : '']"
							>{{ option.checked ? '✓ ' : '' }}{{ option.label }}</text>
						</view>
						<text v-else-if="field.type === 'longtext'" class="field-value field-longtext" user-select>{{ field.value }}</text>
						<text v-else :class="['field-value', field.type === 'mono' ? 'field-mono' : '']" user-select>{{ field.value }}</text>
					</view>
				</view>

				<view v-if="section.table" class="table-block">
					<view class="table-head">
						<text class="table-title">{{ section.table.title }}</text>
						<text v-if="section.table.rows && section.table.rows.length" class="table-count">{{ t('heritageDetail.boundaryCount', { count: section.table.rows.length }) }}</text>
					</view>
					<view v-if="section.table.rows && section.table.rows.length" class="table">
						<view class="table-row table-row-head">
							<text v-for="col in section.table.columns" :key="col.key" :class="['table-cell', 'cell-' + col.key]">{{ col.label }}</text>
						</view>
						<view v-for="(row, rowIndex) in section.table.rows" :key="rowIndex" class="table-row">
							<text v-for="col in section.table.columns" :key="col.key" :class="['table-cell', 'cell-' + col.key]">{{ formatCell(row[col.key]) }}</text>
						</view>
					</view>
					<text v-else class="empty-text">{{ section.table.empty_text }}</text>
				</view>

				<text v-if="section.note" class="section-note">{{ section.note }}</text>
			</view>

			<view class="section-card">
				<text class="section-title">{{ t('heritageDetail.photosTitle') }}</text>
				<view v-if="detail.photos && detail.photos.length" class="photo-grid">
					<view v-for="(photo, index) in detail.photos" :key="index" class="photo-item" @click="previewPhoto(index)">
						<image class="photo-img" :src="photo.url" mode="aspectFill" lazy-load />
						<text v-if="photo.is_cover" class="photo-cover">{{ t('heritageDetail.coverTag') }}</text>
						<text class="photo-caption">{{ photoCaption(photo) }}</text>
					</view>
				</view>
				<text v-else class="empty-text">{{ detail.photo_empty_text }}</text>
			</view>

			<view v-if="detail.signatures && detail.signatures.length" class="section-card">
				<text class="section-title">{{ t('heritageDetail.signTitle') }}</text>
				<view class="sign-grid">
					<view v-for="(sign, index) in detail.signatures" :key="index" class="sign-cell">
						<text class="field-label">{{ sign.label }}</text>
						<text class="field-value">{{ sign.value || '——' }}</text>
						<text v-if="sign.sub" class="sign-sub">{{ sign.sub }}</text>
					</view>
				</view>
			</view>

			<view v-if="detail.footer_note" class="footer-card">
				<text class="footer-title">{{ t('heritageDetail.footerTitle') }}</text>
				<text class="footer-text">{{ detail.footer_note }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import config from '../../common/js/config.js';
	import { getAuthHeader } from '../../common/js/auth.js';
	import createPageI18n from '../../common/js/pageI18n.js';

	export default {
		mixins: [createPageI18n('heritageDetail')],
		data() {
			return {
				siteId: '',
				siteName: '',
				loading: false,
				errorMessage: '',
				detail: null,
			};
		},
		computed: {
			coordinates() {
				const site = (this.detail && this.detail.site) || {};
				const longitude = Number(site.longitude);
				const latitude = Number(site.latitude);
				if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || (!longitude && !latitude)) {
					return null;
				}
				return { longitude, latitude };
			},
			hasLocation() {
				return !!this.coordinates;
			},
		},
		onLoad(options) {
			this.siteId = options.id || '';
			this.siteName = options.name ? decodeURIComponent(options.name) : '';
			this.updateNavigationTitle();
			this.loadDetail();
		},
		onPullDownRefresh() {
			this.loadDetail().then(() => uni.stopPullDownRefresh());
		},
		methods: {
			updateNavigationTitle() {
				const title = (this.detail && this.detail.name) || this.siteName;
				uni.setNavigationBarTitle({ title: title || this.t('nav.heritageDetail') });
			},
			loadDetail() {
				if (!this.siteId) {
					this.errorMessage = this.t('heritageDetail.loadFailed');
					return Promise.resolve();
				}
				this.loading = true;
				this.errorMessage = '';
				return new Promise((resolve) => {
					uni.request({
						url: `${config.API_BASE_URL}/api/admin/heritages/${encodeURIComponent(this.siteId)}/detail`,
						method: 'GET',
						header: { ...getAuthHeader() },
						success: (res) => {
							if (res.statusCode === 200 && res.data && Array.isArray(res.data.sections)) {
								this.detail = res.data;
								this.updateNavigationTitle();
							} else {
								const detailMsg = res.data && typeof res.data.detail === 'string' ? res.data.detail : '';
								this.errorMessage = detailMsg || this.t('heritageDetail.loadFailed');
								if (this.detail) {
									uni.showToast({ title: this.errorMessage, icon: 'none' });
								}
							}
						},
						fail: () => {
							this.errorMessage = this.t('heritageDetail.loadFailed');
							if (this.detail) {
								uni.showToast({ title: this.errorMessage, icon: 'none' });
							}
						},
						complete: () => {
							this.loading = false;
							resolve();
						},
					});
				});
			},
			formatCell(value) {
				return value === null || value === undefined || value === '' ? '-' : String(value);
			},
			photoCaption(photo) {
				return [photo.photo_type_display, photo.caption, photo.shot_at].filter(Boolean).join(' · ');
			},
			previewPhoto(index) {
				const urls = (this.detail.photos || []).map(photo => photo.url);
				uni.previewImage({ urls, current: urls[index] });
			},
			copyCoordinates() {
				if (!this.coordinates) {
					return;
				}
				uni.setClipboardData({
					data: `${this.coordinates.longitude},${this.coordinates.latitude}`,
					success: () => uni.showToast({ title: this.t('heritageDetail.copied'), icon: 'none' }),
				});
			},
			openMap() {
				if (!this.coordinates) {
					return;
				}
				const site = this.detail.site || {};
				uni.openLocation({
					longitude: this.coordinates.longitude,
					latitude: this.coordinates.latitude,
					name: this.detail.name || '',
					address: site.address || '',
				});
			},
			openOnline() {
				const title = this.detail.name || this.t('nav.heritageDetail');
				uni.navigateTo({
					url: `/pages/kml/kml?url=${encodeURIComponent(this.detail.web_url)}&title=${encodeURIComponent(title)}&locate=0`,
				});
			},
		},
	};
</script>

<style>
	.page {
		min-height: 100vh;
		background: var(--bg-primary, #f4f6fa);
		padding: 24rpx 24rpx 60rpx;
		box-sizing: border-box;
	}
	.state-box {
		padding: 160rpx 40rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.state-text {
		font-size: 28rpx;
		color: var(--text-secondary, #5b6573);
		text-align: center;
	}
	.state-btn {
		margin-top: 32rpx;
		padding: 0 60rpx;
	}
	.primary-btn {
		border-radius: var(--radius-pill, 999rpx);
		font-size: 26rpx;
		background: linear-gradient(135deg, var(--accent, #1677ff) 0%, var(--accent-strong, #095cdb) 100%);
		color: #fff;
	}
	.hero-card, .section-card, .notice-card, .footer-card {
		background: #fff;
		border-radius: 20rpx;
		border: 1rpx solid var(--line-soft, #e5e9f0);
		box-shadow: var(--shadow-soft, 0 6rpx 20rpx rgba(15, 35, 70, 0.06));
		padding: 28rpx;
		margin-bottom: 22rpx;
	}
	.hero-main {
		display: block;
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text-primary, #1d2733);
		text-align: center;
	}
	.hero-sub {
		display: block;
		font-size: 24rpx;
		color: var(--text-secondary, #5b6573);
		text-align: center;
		margin-top: 6rpx;
	}
	.hero-name {
		display: block;
		font-size: 38rpx;
		font-weight: 700;
		color: var(--accent-strong, #095cdb);
		text-align: center;
		margin: 22rpx 0 18rpx;
	}
	.code-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 14rpx;
	}
	.code-cell {
		flex: 1 1 40%;
		background: var(--input-bg, #f5f7fb);
		border-radius: 14rpx;
		padding: 14rpx 18rpx;
		min-width: 0;
	}
	.code-label {
		display: block;
		font-size: 22rpx;
		color: var(--text-secondary, #5b6573);
	}
	.code-value {
		display: block;
		font-size: 26rpx;
		color: var(--text-primary, #1d2733);
		font-family: Menlo, Consolas, monospace;
		word-break: break-all;
		margin-top: 4rpx;
	}
	.action-row {
		display: flex;
		gap: 14rpx;
		margin-top: 22rpx;
	}
	.ghost-btn {
		flex: 1;
		margin: 0;
		padding: 0 8rpx;
		font-size: 24rpx;
		line-height: 68rpx;
		border-radius: var(--radius-pill, 999rpx);
		background: rgba(9, 92, 219, 0.1);
		color: var(--accent-strong, #095cdb);
		border: 1rpx solid rgba(9, 92, 219, 0.24);
	}
	.ghost-btn::after {
		border: none;
	}
	.notice-card {
		background: #fff8e6;
		border-color: #f5d48a;
	}
	.notice-text {
		font-size: 25rpx;
		color: #8a5a00;
		line-height: 1.6;
	}
	.section-title {
		display: block;
		font-size: 30rpx;
		font-weight: 700;
		color: var(--text-primary, #1d2733);
		padding-left: 16rpx;
		border-left: 8rpx solid var(--accent, #1677ff);
		margin-bottom: 20rpx;
	}
	.field-grid {
		display: flex;
		flex-wrap: wrap;
	}
	.field {
		width: 50%;
		box-sizing: border-box;
		padding: 14rpx 12rpx 14rpx 0;
		border-bottom: 1rpx solid var(--line-soft, #eef1f5);
	}
	.field-wide {
		width: 100%;
	}
	.field-label {
		display: block;
		font-size: 22rpx;
		color: var(--text-secondary, #7a8594);
		margin-bottom: 6rpx;
	}
	.field-value {
		display: block;
		font-size: 27rpx;
		color: var(--text-primary, #1d2733);
		line-height: 1.55;
		word-break: break-all;
	}
	.field-mono {
		font-family: Menlo, Consolas, monospace;
		font-size: 25rpx;
	}
	.field-longtext {
		white-space: pre-wrap;
		line-height: 1.75;
	}
	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 10rpx;
	}
	.chip {
		font-size: 23rpx;
		padding: 6rpx 16rpx;
		border-radius: var(--radius-pill, 999rpx);
		background: #f1f3f6;
		color: #9aa3ae;
	}
	.chip-checked {
		background: var(--accent-soft, #e6f0ff);
		color: var(--accent-strong, #095cdb);
		font-weight: 700;
	}
	.table-block {
		margin-top: 22rpx;
	}
	.table-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12rpx;
	}
	.table-title {
		font-size: 26rpx;
		font-weight: 700;
		color: var(--text-primary, #1d2733);
	}
	.table-count {
		font-size: 22rpx;
		color: var(--text-secondary, #7a8594);
	}
	.table {
		border: 1rpx solid var(--line-soft, #e5e9f0);
		border-radius: 12rpx;
		overflow: hidden;
	}
	.table-row {
		display: flex;
		border-top: 1rpx solid var(--line-soft, #eef1f5);
	}
	.table-row-head {
		border-top: none;
		background: #f5f7fb;
	}
	.table-row-head .table-cell {
		font-weight: 700;
		color: var(--text-secondary, #5b6573);
	}
	.table-cell {
		padding: 12rpx 8rpx;
		font-size: 22rpx;
		color: var(--text-primary, #1d2733);
		text-align: center;
		word-break: break-all;
	}
	.cell-block, .cell-index {
		flex: 0 0 15%;
	}
	.cell-longitude, .cell-latitude {
		flex: 1;
		font-family: Menlo, Consolas, monospace;
	}
	.empty-text {
		display: block;
		font-size: 24rpx;
		color: #9aa3ae;
		text-align: center;
		padding: 20rpx 0;
	}
	.section-note {
		display: block;
		margin-top: 16rpx;
		font-size: 22rpx;
		color: #8a5a00;
		line-height: 1.6;
	}
	.photo-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
	}
	.photo-item {
		position: relative;
		width: calc(50% - 8rpx);
	}
	.photo-img {
		width: 100%;
		height: 240rpx;
		border-radius: 12rpx;
		background: #eef1f5;
	}
	.photo-cover {
		position: absolute;
		top: 10rpx;
		left: 10rpx;
		font-size: 20rpx;
		color: #fff;
		background: rgba(9, 92, 219, 0.85);
		padding: 4rpx 12rpx;
		border-radius: 8rpx;
	}
	.photo-caption {
		display: block;
		font-size: 22rpx;
		color: var(--text-secondary, #5b6573);
		margin-top: 8rpx;
		line-height: 1.4;
	}
	.sign-grid {
		display: flex;
		flex-wrap: wrap;
	}
	.sign-cell {
		width: 50%;
		box-sizing: border-box;
		padding: 12rpx 12rpx 12rpx 0;
	}
	.sign-sub {
		display: block;
		font-size: 22rpx;
		color: #9aa3ae;
		margin-top: 4rpx;
	}
	.footer-title {
		display: block;
		font-size: 24rpx;
		font-weight: 700;
		color: var(--text-secondary, #5b6573);
		margin-bottom: 8rpx;
	}
	.footer-text {
		font-size: 22rpx;
		color: #8a94a3;
		line-height: 1.7;
		white-space: pre-wrap;
	}
</style>
