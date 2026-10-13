<template>
	<ion-page>
		<ion-header>
			<ion-toolbar class="app-toolbar">
				<ion-buttons slot="start"><ion-back-button default-href="/tabs/admin" /></ion-buttons>
				<ion-title>文物现场采集</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content>
			<div class="page-wrap">
				<HeritageCollectRefactor ref="collectRef" :loading="submitting" :meta="formMeta" @submit="handleSubmit" />
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup>
	import { IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent } from '@ionic/vue';
	import { onMounted, reactive, ref } from 'vue';
	import config from '@/lib/config.js';
	import { getAuthHeader } from '@/lib/auth.js';
	import { request, apiUpload } from '@/lib/request.js';
	import { toast, showModal } from '@/lib/ui.js';
	import HeritageCollectRefactor from '@/components/HeritageCollectRefactor.vue';

	const API = config.API_BASE_URL;

	const collectRef = ref(null);
	const submitting = ref(false);
	const formMeta = reactive({
		categoryChoices: [],
		protectionLevelChoices: [],
		ownershipChoices: [],
		preservationStatusChoices: [],
	});

	onMounted(() => {
		loadFormMetaDefaults();
	});

	function cleanText(value) {
		return String(value || '').trim();
	}

	async function loadFormMetaDefaults() {
		try {
			const res = await request({ url: `${API}/api/collect/form-meta`, header: getAuthHeader() });
			if (res.statusCode !== 200 || !res.data) return;
			const d = res.data;
			formMeta.categoryChoices = d.category_choices || [];
			formMeta.protectionLevelChoices = d.protection_level_choices || [];
			formMeta.ownershipChoices = d.ownership_choices || [];
			formMeta.preservationStatusChoices = d.preservation_status_choices || [];
		} catch (_) {
			formMeta.categoryChoices = [
				{ value: 'GWZ', label: '古文化遗址' },
				{ value: 'GMZ', label: '古墓葬' },
				{ value: 'GJZ', label: '古建筑' },
				{ value: 'SKT', label: '石窟寺及石刻' },
				{ value: 'JDJW', label: '近现代重要史迹及代表性建筑' },
				{ value: 'QT', label: '其他' },
			];
			formMeta.protectionLevelChoices = [
				{ value: 'GB', label: '全国重点文物保护单位' },
				{ value: 'SB', label: '省（自治区、直辖市）级文物保护单位' },
				{ value: 'XB', label: '市（县）级文物保护单位' },
				{ value: 'DS', label: '尚未定级的不可移动文物' },
			];
			formMeta.ownershipChoices = [
				{ value: 'state', label: '国有' },
				{ value: 'collective', label: '集体' },
				{ value: 'private', label: '私人' },
				{ value: 'other', label: '其他' },
			];
			formMeta.preservationStatusChoices = [
				{ value: '好', label: '好' },
				{ value: '较好', label: '较好' },
				{ value: '一般', label: '一般' },
				{ value: '较差', label: '较差' },
				{ value: '差', label: '差' },
			];
		}
	}

	async function createHeritage(payload) {
		const longitude = Number(payload.longitude);
		const latitude = Number(payload.latitude);
		const altitude = payload.altitude !== '' && payload.altitude != null ? Number(payload.altitude) : null;

		let res;
		try {
			res = await request({
				url: `${API}/api/collect/create`,
				method: 'POST',
				header: { 'Content-Type': 'application/json', ...getAuthHeader() },
				data: {
					survey_code: payload.surveyCodeAuto ? '' : cleanText(payload.code),
					name: cleanText(payload.name),
					former_name: cleanText(payload.former_name),
					era: cleanText(payload.era),
					category: cleanText(payload.category),
					coord_list: Array.isArray(payload.coord_list) ? payload.coord_list : [],
					province: cleanText(payload.province),
					city: cleanText(payload.city),
					county: cleanText(payload.county),
					township: cleanText(payload.township),
					village: cleanText(payload.village),
					address: cleanText(payload.address),
					longitude: Number.isFinite(longitude) ? longitude : null,
					latitude: Number.isFinite(latitude) ? latitude : null,
					altitude: Number.isFinite(altitude) ? altitude : null,
					protection_level: cleanText(payload.protection_level),
					ownership: cleanText(payload.ownership),
					preservation_status: cleanText(payload.preservation_status),
					description: cleanText(payload.remark),
				},
			});
		} catch (err) {
			throw err?.errMsg || '网络异常';
		}
		if (res.statusCode === 201) {
			return { heritage_id: res.data?.heritage_id, survey_code: res.data?.survey_code || '' };
		}
		throw res.data?.detail || res.data?.message || '创建失败';
	}

	async function uploadPhoto(heritageId, photo, isCover) {
		let res;
		try {
			res = await apiUpload({
				url: `${API}/api/collect/photos/${heritageId}`,
				file: photo.blob || photo.path,
				fileName: 'photo.jpg',
				name: 'photo',
				formData: {
					photo_type: isCover ? 'overview' : 'detail',
					is_cover: isCover ? 'true' : 'false',
				},
			});
		} catch (err) {
			throw err?.errMsg || '网络异常';
		}
		let data = res.data;
		if (typeof data === 'string') {
			try {
				data = JSON.parse(data);
			} catch (_) {
				if (res.statusCode === 201) return {};
				throw '上传响应解析失败';
			}
		}
		if (res.statusCode === 201) return data || {};
		throw data?.detail || '上传失败';
	}

	async function handleSubmit(payload) {
		if (submitting.value) return;
		submitting.value = true;

		try {
			const created = await createHeritage(payload);
			const photos = Array.isArray(payload.photos) ? payload.photos : [];

			let successCount = 0;
			for (let i = 0; i < photos.length; i += 1) {
				const photo = photos[i];
				if (!photo || !(photo.blob || photo.path)) continue;
				try {
					await uploadPhoto(created.heritage_id, photo, i === 0);
					successCount += 1;
				} catch (_) {
					// 单张失败不阻断整个流程
				}
			}

			const suffix = photos.length > 0 ? `，照片 ${successCount}/${photos.length}` : '';
			await showModal({
				title: '采集提交成功',
				content: `编号：${created.survey_code || '已生成'}${suffix}`,
				showCancel: false,
			});
		} catch (err) {
			toast(`提交失败：${String(err || '未知错误')}`, { icon: 'none', duration: 3000 });
		} finally {
			submitting.value = false;
		}
	}
</script>

<style scoped>
.page-wrap {
	height: 100%;
}
</style>
