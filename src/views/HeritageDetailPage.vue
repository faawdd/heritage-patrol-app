<template>
	<div class="app-page">
		<div class="app-content">
			<van-pull-refresh v-model="refreshing" @refresh="onRefresh">
			<AppHeader :title="t('nav.heritageDetail')" back />
	<div class="page">
		<div v-if="loading && !detail" class="state-box">
			<span class="state-text">{{ t('heritageDetail.loading') }}</span>
		</div>

		<div v-else-if="errorMessage && !detail" class="state-box">
			<span class="state-text">{{ errorMessage }}</span>
			<van-button native-type="button" class="primary-btn state-btn" @click="loadDetail()">{{ t('heritageDetail.retry') }}</van-button>
		</div>

		<div v-else-if="detail" class="content">
			<div class="hero-card">
				<span class="hero-main">{{ detail.header.main_title }}</span>
				<span v-if="detail.header.sub_title" class="hero-sub">{{ detail.header.sub_title }}</span>
				<span class="hero-name">{{ detail.name }}</span>
				<div class="code-grid">
					<div class="code-cell">
						<span class="code-label">{{ t('heritageDetail.surveyCode') }}</span>
						<span class="code-value">{{ detail.codes.survey_code || '——' }}</span>
					</div>
					<div v-if="detail.codes.previous_survey_code" class="code-cell">
						<span class="code-label">{{ t('heritageDetail.previousCode') }}</span>
						<span class="code-value">{{ detail.codes.previous_survey_code }}</span>
					</div>
					<div class="code-cell">
						<span class="code-label">{{ t('heritageDetail.collectedAt') }}</span>
						<span class="code-value">{{ detail.codes.collected_at || '——' }}</span>
					</div>
				</div>
				<div class="action-row">
					<van-button v-if="hasLocation" class="ghost-btn" @click="copyCoordinates">{{ t('heritageDetail.copyCoords') }}</van-button>
					<van-button v-if="hasLocation" class="ghost-btn" @click="openMap">{{ t('heritageDetail.openMap') }}</van-button>
					<van-button v-if="detail.web_url" class="ghost-btn" @click="openOnline">{{ t('heritageDetail.openOnline') }}</van-button>
				</div>
			</div>

			<div v-if="!detail.is_registered" class="notice-card">
				<span class="notice-text">{{ t('heritageDetail.notRegistered') }}</span>
			</div>

			<div v-for="section in detail.sections" :key="section.key" class="section-card">
				<span class="section-title">{{ section.title }}</span>
				<div class="field-grid">
					<div
						v-for="(field, index) in section.items"
						:key="section.key + '-' + index"
						:class="['field', field.wide || field.type === 'longtext' || field.type === 'choices' ? 'field-wide' : '']"
					>
						<span v-if="!field.hide_label" class="field-label">{{ field.label }}</span>
						<div v-if="field.type === 'choices'" class="chip-row">
							<span
								v-for="(option, optIndex) in field.options"
								:key="optIndex"
								:class="['chip', option.checked ? 'chip-checked' : '']"
							>{{ option.checked ? '✓ ' : '' }}{{ option.label }}</span>
						</div>
						<span v-else-if="field.type === 'longtext'" class="field-value field-longtext">{{ field.value }}</span>
						<span v-else :class="['field-value', field.type === 'mono' ? 'field-mono' : '']">{{ field.value }}</span>
					</div>
				</div>

				<div v-if="section.table" class="table-block">
					<div class="table-head">
						<span class="table-title">{{ section.table.title }}</span>
						<span v-if="section.table.rows && section.table.rows.length" class="table-count">{{ t('heritageDetail.boundaryCount', { count: section.table.rows.length }) }}</span>
					</div>
					<div v-if="section.table.rows && section.table.rows.length" class="table">
						<div class="table-row table-row-head">
							<span v-for="col in section.table.columns" :key="col.key" :class="['table-cell', 'cell-' + col.key]">{{ col.label }}</span>
						</div>
						<div v-for="(row, rowIndex) in section.table.rows" :key="rowIndex" class="table-row">
							<span v-for="col in section.table.columns" :key="col.key" :class="['table-cell', 'cell-' + col.key]">{{ formatCell(row[col.key]) }}</span>
						</div>
					</div>
					<span v-else class="empty-text">{{ section.table.empty_text }}</span>
				</div>

				<span v-if="section.note" class="section-note">{{ section.note }}</span>
			</div>

			<div class="section-card">
				<span class="section-title">{{ t('heritageDetail.photosTitle') }}</span>
				<div v-if="detail.photos && detail.photos.length" class="photo-grid">
					<div v-for="(photo, index) in detail.photos" :key="index" class="photo-item" @click="previewPhoto(index)">
						<img class="photo-img" :src="photo.url" loading="lazy" />
						<span v-if="photo.is_cover" class="photo-cover">{{ t('heritageDetail.coverTag') }}</span>
						<span class="photo-caption">{{ photoCaption(photo) }}</span>
					</div>
				</div>
				<span v-else class="empty-text">{{ detail.photo_empty_text }}</span>
			</div>

			<div v-if="detail.signatures && detail.signatures.length" class="section-card">
				<span class="section-title">{{ t('heritageDetail.signTitle') }}</span>
				<div class="sign-grid">
					<div v-for="(sign, index) in detail.signatures" :key="index" class="sign-cell">
						<span class="field-label">{{ sign.label }}</span>
						<span class="field-value">{{ sign.value || '——' }}</span>
						<span v-if="sign.sub" class="sign-sub">{{ sign.sub }}</span>
					</div>
				</div>
			</div>

			<div v-if="detail.footer_note" class="footer-card">
				<span class="footer-title">{{ t('heritageDetail.footerTitle') }}</span>
				<span class="footer-text">{{ detail.footer_note }}</span>
			</div>
		</div>
	</div>
		</van-pull-refresh>
		</div>
	</div>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import config from '@/lib/config.js';
	import { getAuthHeader } from '@/lib/auth.js';
	import { request } from '@/lib/request.js';
	import { t } from '@/lib/i18n.js';
	import { toast } from '@/lib/ui.js';
	import { openApiEntry } from '@/lib/webview.js';
	import { previewImage, setClipboard, openLocation } from '@/lib/native.js';

	export default {
		components: { AppHeader },
		data() {
			return {
				refreshing: false,
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
		created() {
			const query = (this.$route && this.$route.query) || {};
			this.siteId = query.id ? String(query.id) : '';
			this.siteName = query.name ? String(query.name) : '';
			this.loadDetail();
		},
		methods: {
			t,
			async onRefresh() {
				try {
					await this.loadDetail();
				} finally {
					this.refreshing = false;
				}
			},
			async loadDetail() {
				if (!this.siteId) {
					this.errorMessage = this.t('heritageDetail.loadFailed');
					return;
				}
				this.loading = true;
				this.errorMessage = '';
				try {
					const res = await request({
						url: `${config.API_BASE_URL}/api/admin/heritages/${encodeURIComponent(this.siteId)}/detail`,
						method: 'GET',
						header: { ...getAuthHeader() },
					});
					if (res.statusCode === 200 && res.data && Array.isArray(res.data.sections)) {
						this.detail = res.data;
					} else {
						const detailMsg = res.data && typeof res.data.detail === 'string' ? res.data.detail : '';
						this.errorMessage = detailMsg || this.t('heritageDetail.loadFailed');
						if (this.detail) {
							toast(this.errorMessage, { icon: 'none' });
						}
					}
				} catch (_) {
					this.errorMessage = this.t('heritageDetail.loadFailed');
					if (this.detail) {
						toast(this.errorMessage, { icon: 'none' });
					}
				} finally {
					this.loading = false;
				}
			},
			formatCell(value) {
				return value === null || value === undefined || value === '' ? '-' : String(value);
			},
			photoCaption(photo) {
				return [photo.photo_type_display, photo.caption, photo.shot_at].filter(Boolean).join(' · ');
			},
			previewPhoto(index) {
				const urls = (this.detail.photos || []).map(photo => photo.url);
				previewImage(urls, urls[index]);
			},
			async copyCoordinates() {
				if (!this.coordinates) {
					return;
				}
				await setClipboard(`${this.coordinates.longitude},${this.coordinates.latitude}`);
				toast(this.t('heritageDetail.copied'), { icon: 'none' });
			},
			openMap() {
				if (!this.coordinates) {
					return;
				}
				openLocation({
					longitude: this.coordinates.longitude,
					latitude: this.coordinates.latitude,
					name: this.detail.name || '',
				});
			},
			openOnline() {
				// 入口令牌仅 10 分钟有效，重新获取详情以拿到新的地址
				return openApiEntry(`/api/admin/heritages/${encodeURIComponent(this.siteId)}/detail`, {
					pick: (data) => (data && data.web_url) || this.detail.web_url,
				});
			},
		},
	};
</script>

<style scoped>
	.page {
		min-height: 100%;
		background: var(--c-bg, #F4F6F5);
		padding: 12px 12px 30px;
		box-sizing: border-box;
	}
	.state-box {
		padding: 80px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.state-text {
		font-size: 14px;
		color: var(--c-text-2, #4A5D54);
		text-align: center;
	}
	.state-btn {
		margin-top: 16px;
		padding: 0 30px;
	}
	.primary-btn {
		border-radius: var(--r-btn, 10px);
		font-size: 13px;
		background: linear-gradient(135deg, #3A7D68 0%, #245B4A 100%);
		color: #fff;
	}
	.hero-card, .section-card, .notice-card, .footer-card {
		background: #fff;
		border-radius: var(--r-card, 12px);
		border: 0.5px solid var(--c-line, #E4E9E5);
		box-shadow: var(--shadow-sm, 0 1px 3px rgba(36, 91, 74, 0.06));
		padding: 14px;
		margin-bottom: 11px;
	}
	.hero-main {
		display: block;
		font-size: 15px;
		font-weight: 600;
		color: var(--c-text, #26332D);
		text-align: center;
	}
	.hero-sub {
		display: block;
		font-size: 12px;
		color: var(--c-text-3, #77817B);
		text-align: center;
		margin-top: 3px;
	}
	.hero-name {
		display: block;
		font-size: 19px;
		font-weight: 600;
		color: var(--c-primary, #245B4A);
		text-align: center;
		margin: 11px 0 9px;
	}
	.code-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
	}
	.code-cell {
		flex: 1 1 40%;
		background: var(--c-fill, #F9FAF9);
		border-radius: 8px;
		padding: 7px 9px;
		min-width: 0;
	}
	.code-label {
		display: block;
		font-size: 11px;
		color: var(--c-text-3, #77817B);
	}
	.code-value {
		display: block;
		font-size: 13px;
		color: var(--c-text, #26332D);
		font-family: Menlo, Consolas, monospace;
		word-break: break-all;
		margin-top: 2px;
	}
	.action-row {
		display: flex;
		gap: 7px;
		margin-top: 11px;
	}
	.ghost-btn {
		flex: 1;
		margin: 0;
		padding: 0 4px;
		font-size: 12px;
		line-height: 34px;
		border-radius: var(--r-btn, 10px);
		background: var(--c-primary-light, #E8F0ED);
		color: var(--c-primary, #245B4A);
		border: 0.5px solid var(--c-line, #E4E9E5);
	}
	.ghost-btn::after {
		border: none;
	}
	.notice-card {
		background: var(--c-warning-bg, #FDF5ED);
		border-color: var(--c-warning, #B87333);
	}
	.notice-text {
		font-size: 12.5px;
		color: var(--c-warning, #B87333);
		line-height: 1.6;
	}
	.section-title {
		display: block;
		font-size: 15px;
		font-weight: 600;
		color: var(--c-text, #26332D);
		padding-left: 8px;
		border-left: 3px solid var(--c-primary, #245B4A);
		margin-bottom: 10px;
	}
	.field-grid {
		display: flex;
		flex-wrap: wrap;
	}
	.field {
		width: 50%;
		box-sizing: border-box;
		padding: 7px 6px 7px 0;
		border-bottom: 0.5px solid var(--c-line, #E4E9E5);
	}
	.field-wide {
		width: 100%;
	}
	.field-label {
		display: block;
		font-size: 11px;
		color: var(--c-text-3, #77817B);
		margin-bottom: 3px;
	}
	.field-value {
		display: block;
		font-size: 13.5px;
		color: var(--c-text, #26332D);
		line-height: 1.55;
		word-break: break-all;
	}
	.field-mono {
		font-family: Menlo, Consolas, monospace;
		font-size: 12.5px;
	}
	.field-longtext {
		white-space: pre-wrap;
		line-height: 1.75;
	}
	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.chip {
		font-size: 11.5px;
		padding: 3px 8px;
		border-radius: var(--r-tag, 8px);
		background: var(--c-fill, #F9FAF9);
		color: var(--c-text-4, #A8B0AB);
	}
	.chip-checked {
		background: var(--c-primary-light, #E8F0ED);
		color: var(--c-primary, #245B4A);
		font-weight: 600;
	}
	.table-block {
		margin-top: 11px;
	}
	.table-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}
	.table-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-text, #26332D);
	}
	.table-count {
		font-size: 11px;
		color: var(--c-text-3, #77817B);
	}
	.table {
		border: 0.5px solid var(--c-line, #E4E9E5);
		border-radius: 6px;
		overflow: hidden;
	}
	.table-row {
		display: flex;
		border-top: 0.5px solid var(--c-line, #E4E9E5);
	}
	.table-row-head {
		border-top: none;
		background: var(--c-fill, #F9FAF9);
	}
	.table-row-head .table-cell {
		font-weight: 600;
		color: var(--c-text-2, #4A5D54);
	}
	.table-cell {
		padding: 6px 4px;
		font-size: 11px;
		color: var(--c-text, #26332D);
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
		font-size: 12px;
		color: var(--c-text-4, #A8B0AB);
		text-align: center;
		padding: 10px 0;
	}
	.section-note {
		display: block;
		margin-top: 8px;
		font-size: 11px;
		color: var(--c-warning, #B87333);
		line-height: 1.6;
	}
	.photo-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.photo-item {
		position: relative;
		width: calc(50% - 4px);
	}
	.photo-img {
		width: 100%;
		height: 120px;
		border-radius: 8px;
		background: var(--c-line, #E4E9E5);
	}
	.photo-cover {
		position: absolute;
		top: 5px;
		left: 5px;
		font-size: 10px;
		color: #fff;
		background: var(--c-primary, #245B4A);
		padding: 2px 6px;
		border-radius: 4px;
	}
	.photo-caption {
		display: block;
		font-size: 11px;
		color: var(--c-text-3, #77817B);
		margin-top: 4px;
		line-height: 1.4;
	}
	.sign-grid {
		display: flex;
		flex-wrap: wrap;
	}
	.sign-cell {
		width: 50%;
		box-sizing: border-box;
		padding: 6px 6px 6px 0;
	}
	.sign-sub {
		display: block;
		font-size: 11px;
		color: var(--c-text-4, #A8B0AB);
		margin-top: 2px;
	}
	.footer-title {
		display: block;
		font-size: 12px;
		font-weight: 600;
		color: var(--c-text-2, #4A5D54);
		margin-bottom: 4px;
	}
	.footer-text {
		font-size: 11px;
		color: var(--c-text-3, #77817B);
		line-height: 1.7;
		white-space: pre-wrap;
	}
</style>
