<template>
	<div class="app-page">
		<div class="app-content">
			<van-pull-refresh v-model="refreshing" @refresh="onRefresh">
			<AppHeader :title="t('nav.heritageDetail')" back />
	<div class="box-border min-h-full bg-page px-3 py-3 pb-[1.875rem]">
		<div v-if="loading && !detail" class="flex flex-col items-center px-5 py-20">
			<span class="text-center text-sm text-ink-2">{{ t('heritageDetail.loading') }}</span>
		</div>

		<div v-else-if="errorMessage && !detail" class="flex flex-col items-center px-5 py-20">
			<span class="text-center text-sm text-ink-2">{{ errorMessage }}</span>
			<van-button native-type="button" class="!mt-4 !h-11 !min-h-11 !rounded-[0.625rem] !border-0 !bg-gradient-primary !px-[1.875rem] !text-[0.8125rem] !text-on-primary" @click="loadDetail()">{{ t('heritageDetail.retry') }}</van-button>
		</div>

		<div v-else-if="detail" class="">
			<div class="mb-[0.6875rem] rounded-card border border-line bg-surface p-3.5 shadow-card">
				<span class="block text-center text-[0.9375rem] font-semibold text-ink">{{ detail.header.main_title }}</span>
				<span v-if="detail.header.sub_title" class="mt-0.5 block text-center text-xs text-ink-3">{{ detail.header.sub_title }}</span>
				<span class="my-2.5 block text-center text-[1.1875rem] font-semibold text-primary">{{ detail.name }}</span>
				<div class="flex flex-wrap gap-[0.4375rem]">
					<div class="min-w-0 flex-[1_1_40%] rounded-lg bg-fill px-[0.5625rem] py-[0.4375rem]">
						<span class="block text-[0.6875rem] text-ink-3">{{ t('heritageDetail.surveyCode') }}</span>
						<span class="mt-0.5 block break-all font-mono text-[0.8125rem] text-ink">{{ detail.codes.survey_code || '——' }}</span>
					</div>
					<div v-if="detail.codes.previous_survey_code" class="min-w-0 flex-[1_1_40%] rounded-lg bg-fill px-[0.5625rem] py-[0.4375rem]">
						<span class="block text-[0.6875rem] text-ink-3">{{ t('heritageDetail.previousCode') }}</span>
						<span class="mt-0.5 block break-all font-mono text-[0.8125rem] text-ink">{{ detail.codes.previous_survey_code }}</span>
					</div>
					<div class="min-w-0 flex-[1_1_40%] rounded-lg bg-fill px-[0.5625rem] py-[0.4375rem]">
						<span class="block text-[0.6875rem] text-ink-3">{{ t('heritageDetail.collectedAt') }}</span>
						<span class="mt-0.5 block break-all font-mono text-[0.8125rem] text-ink">{{ detail.codes.collected_at || '——' }}</span>
					</div>
				</div>
				<div class="mt-2.5 flex gap-[0.4375rem]">
					<van-button v-if="hasLocation" class="!m-0 !h-11 !min-h-11 min-w-0 flex-1 !rounded-[0.625rem] !border !border-line !bg-primary-light !px-1 !text-xs !text-primary" @click="copyCoordinates">{{ t('heritageDetail.copyCoords') }}</van-button>
					<van-button v-if="hasLocation" class="!m-0 !h-11 !min-h-11 min-w-0 flex-1 !rounded-[0.625rem] !border !border-line !bg-primary-light !px-1 !text-xs !text-primary" @click="openMap">{{ t('heritageDetail.openMap') }}</van-button>
					<van-button v-if="detail.web_url" class="!m-0 !h-11 !min-h-11 min-w-0 flex-1 !rounded-[0.625rem] !border !border-line !bg-primary-light !px-1 !text-xs !text-primary" @click="openOnline">{{ t('heritageDetail.openOnline') }}</van-button>
				</div>
			</div>

			<div v-if="!detail.is_registered" class="mb-[0.6875rem] rounded-card border border-warning bg-warning-bg p-3.5 shadow-card">
				<span class="text-[0.7813rem] leading-[1.6] text-warning">{{ t('heritageDetail.notRegistered') }}</span>
			</div>

			<div v-for="section in detail.sections" :key="section.key" class="mb-[0.6875rem] rounded-card border border-line bg-surface p-3.5 shadow-card">
				<span class="mb-2.5 block border-l-[3px] border-primary pl-2 text-[0.9375rem] font-semibold text-ink">{{ section.title }}</span>
				<div class="flex flex-wrap">
					<div
						v-for="(field, index) in section.items"
						:key="section.key + '-' + index"
						:class="['field', field.wide || field.type === 'longtext' || field.type === 'choices' ? 'field-wide' : '']"
					>
						<span v-if="!field.hide_label" class="mb-0.5 block text-[0.6875rem] text-ink-3">{{ field.label }}</span>
						<div v-if="field.type === 'choices'" class="flex flex-wrap gap-1">
							<span
								v-for="(option, optIndex) in field.options"
								:key="optIndex"
								:class="['chip', option.checked ? 'chip-checked' : '']"
							>{{ option.checked ? '✓ ' : '' }}{{ option.label }}</span>
						</div>
						<span v-else-if="field.type === 'longtext'" class="block break-all whitespace-pre-wrap text-[0.8438rem] leading-[1.75] text-ink">{{ field.value }}</span>
						<span v-else :class="['field-value', field.type === 'mono' ? 'field-mono' : '']">{{ field.value }}</span>
					</div>
				</div>

				<div v-if="section.table" class="mt-2.5">
					<div class="mb-1.5 flex items-center justify-between">
						<span class="text-[0.8125rem] font-semibold text-ink">{{ section.table.title }}</span>
						<span v-if="section.table.rows && section.table.rows.length" class="text-[0.6875rem] text-ink-3">{{ t('heritageDetail.boundaryCount', { count: section.table.rows.length }) }}</span>
					</div>
					<div v-if="section.table.rows && section.table.rows.length" class="overflow-hidden rounded-md border border-line">
						<div class="flex border-0 bg-fill">
							<span v-for="col in section.table.columns" :key="col.key" :class="['min-w-0 px-1 py-1.5 text-center text-[0.6875rem] text-ink break-all', ['block', 'index'].includes(col.key) ? 'flex-[0_0_15%]' : 'flex-1 font-mono']">{{ col.label }}</span>
						</div>
						<div v-for="(row, rowIndex) in section.table.rows" :key="rowIndex" class="flex border-t border-line">
							<span v-for="col in section.table.columns" :key="col.key" :class="['min-w-0 px-1 py-1.5 text-center text-[0.6875rem] text-ink break-all', ['block', 'index'].includes(col.key) ? 'flex-[0_0_15%]' : 'flex-1 font-mono']">{{ formatCell(row[col.key]) }}</span>
						</div>
					</div>
					<span v-else class="block px-0 py-2.5 text-center text-xs text-ink-4">{{ section.table.empty_text }}</span>
				</div>

				<span v-if="section.note" class="mt-2 block text-[0.6875rem] leading-[1.6] text-warning">{{ section.note }}</span>
			</div>

			<div class="mb-[0.6875rem] rounded-card border border-line bg-surface p-3.5 shadow-card">
				<span class="mb-2.5 block border-l-[3px] border-primary pl-2 text-[0.9375rem] font-semibold text-ink">{{ t('heritageDetail.photosTitle') }}</span>
				<div v-if="detail.photos && detail.photos.length" class="flex flex-wrap gap-2">
					<div v-for="(photo, index) in detail.photos" :key="index" class="relative w-[calc(50%-0.25rem)]" @click="previewPhoto(index)">
						<img class="block h-[7.5rem] w-full rounded-lg bg-line object-cover" :src="photo.url" loading="lazy" />
						<span v-if="photo.is_cover" class="absolute left-1 top-1 rounded px-1.5 py-0.5 text-[0.625rem] text-on-primary bg-primary">{{ t('heritageDetail.coverTag') }}</span>
						<span class="mt-1 block text-[0.6875rem] leading-[1.4] text-ink-3">{{ photoCaption(photo) }}</span>
					</div>
				</div>
				<span v-else class="block px-0 py-2.5 text-center text-xs text-ink-4">{{ detail.photo_empty_text }}</span>
			</div>

			<div v-if="detail.signatures && detail.signatures.length" class="mb-[0.6875rem] rounded-card border border-line bg-surface p-3.5 shadow-card">
				<span class="mb-2.5 block border-l-[3px] border-primary pl-2 text-[0.9375rem] font-semibold text-ink">{{ t('heritageDetail.signTitle') }}</span>
				<div class="flex flex-wrap">
					<div v-for="(sign, index) in detail.signatures" :key="index" class="box-border w-1/2 px-0 pr-1.5 py-1.5">
						<span class="mb-0.5 block text-[0.6875rem] text-ink-3">{{ sign.label }}</span>
						<span class="block break-all text-[0.8438rem] leading-[1.55] text-ink">{{ sign.value || '——' }}</span>
						<span v-if="sign.sub" class="mt-0.5 block text-[0.6875rem] text-ink-4">{{ sign.sub }}</span>
					</div>
				</div>
			</div>

			<div v-if="detail.footer_note" class="mb-[0.6875rem] rounded-card border border-line bg-surface p-3.5 shadow-card">
				<span class="mb-1 block text-xs font-semibold text-ink-2">{{ t('heritageDetail.footerTitle') }}</span>
				<span class="whitespace-pre-wrap text-[0.6875rem] leading-[1.7] text-ink-3">{{ detail.footer_note }}</span>
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
@reference "../theme/tailwind.css";

.ghost-btn :deep(.van-button__content)::after,
.ghost-btn::after {
	border: none;
}
</style>
