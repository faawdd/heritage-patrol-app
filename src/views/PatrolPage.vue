<template>
	<ion-page>
		<ion-content ref="content" :fullscreen="true">
			<div class="u-page">
				<AppHeader title="巡查上报" subtitle="按照下面 3 步完成上报" />

				<div class="u-body steps">
					<!-- 第 1 步：文物点 -->
					<div class="u-card step" :class="{ finished: !!site }">
						<div class="step-head">
							<div class="step-no">{{ site ? '✓' : '1' }}</div>
							<span class="step-title">确认文物点</span>
						</div>

						<div v-if="locating && !site" class="locating">
							<AppIcon name="locate" :size="56" color="#94A3B8" />
							<span>正在定位，查找附近文物点…</span>
						</div>

						<div v-else-if="site" class="site">
							<div class="site-content">
								<div class="site-main">
									<span class="site-name">{{ site.name }}</span>
									<span v-if="site.address" class="site-addr">{{ site.address }}</span>
									<div class="site-tags">
										<span v-if="site.manual" class="u-badge info">手动选择</span>
										<span v-else-if="distanceText" class="u-badge" :class="isFar ? 'warn' : 'ok'">距离约 {{ distanceText }}</span>
										<span v-if="!locationOk" class="u-badge warn">未获取到定位</span>
									</div>
								</div>
								<button type="button" class="u-btn sm change-btn" @click="openPicker">换一个</button>
							</div>
							<div v-if="isFar" class="far-tip">
								<AppIcon name="alert" :size="40" color="#B45309" />
								<span>您离这个文物点较远，请确认是否在现场。</span>
							</div>
						</div>

						<div v-else class="locating">
							<AppIcon name="alert" :size="56" color="#B45309" />
							<span>{{ locateError || '附近没有找到文物点' }}</span>
						</div>

						<div class="row-btns">
							<button v-if="!site" type="button" class="u-btn primary block" @click="openPicker">
								<AppIcon name="search" :size="44" color="#FFFFFF" />
								<span>选择文物点</span>
							</button>
							<button type="button" class="u-btn plain block" :disabled="locating" @click="locate">
								<AppIcon name="refresh" :size="40" color="#334155" />
								<span>{{ locating ? '定位中…' : '重新定位' }}</span>
							</button>
						</div>
					</div>

					<!-- 第 2 步：拍照 -->
					<div class="u-card step" :class="{ finished: !!photo, disabled: !site }">
						<div class="step-head">
							<div class="step-no">{{ photo ? '✓' : '2' }}</div>
							<span class="step-title">拍摄现场照片</span>
						</div>
						<div v-if="!photo" class="shoot" @click="takePhoto">
							<div class="shoot-icon">
								<AppIcon name="camera" :size="88" color="#FFFFFF" />
							</div>
							<span class="shoot-text">{{ processing ? '正在处理照片…' : '点这里拍照' }}</span>
							<span class="shoot-sub">照片会自动加上时间、地点水印</span>
						</div>
						<div v-else class="photo">
							<img class="photo-img" :src="photo" alt="" @click="preview" />
							<button type="button" class="u-btn plain block" @click="takePhoto">
								<AppIcon name="camera" :size="44" color="#334155" />
								<span>重新拍照</span>
							</button>
						</div>
					</div>

					<!-- 第 3 步：情况 -->
					<div class="u-card step" :class="{ finished: status === 'normal' || (status === 'problem' && issueText), disabled: !photo }">
						<div class="step-head">
							<div class="step-no">3</div>
							<span class="step-title">文物点情况</span>
						</div>
						<div class="status-row">
							<div class="status-btn ok" :class="{ active: status === 'normal' }" @click="setStatus('normal')">
								<AppIcon name="check-circle" :size="72" :color="status === 'normal' ? '#FFFFFF' : '#15803D'" />
								<span>正常</span>
							</div>
							<div class="status-btn bad" :class="{ active: status === 'problem' }" @click="setStatus('problem')">
								<AppIcon name="alert" :size="72" :color="status === 'problem' ? '#FFFFFF' : '#C62828'" />
								<span>有问题</span>
							</div>
						</div>

						<div v-if="status === 'problem'" class="issue u-fade-in">
							<span class="issue-label">发现了什么问题？（可多选）</span>
							<div class="chips">
								<div
									v-for="item in issueOptions"
									:key="item"
									class="chip"
									:class="{ active: chips.indexOf(item) > -1 }"
									@click="toggleChip(item)"
								>{{ item }}</div>
							</div>
							<textarea
								v-model="issueNote"
								class="issue-input"
								maxlength="300"
								placeholder="补充说明（选填）：例如位置、范围、严重程度"
							/>
						</div>
					</div>

					<button type="button" class="u-btn xl block submit" :class="canSubmit ? 'primary' : 'plain'" :disabled="submitting" @click="submit">
						<AppIcon name="upload" :size="56" :color="canSubmit ? '#FFFFFF' : '#94A3B8'" />
						<span>{{ submitting ? '正在上报…' : '提交巡查' }}</span>
					</button>
					<span class="submit-hint">{{ submitHint }}</span>
				</div>
			</div>

			<!-- 文物点选择 -->
			<div v-if="pickerOpen" class="sheet-mask" @click="pickerOpen = false">
				<div class="sheet" @click.stop>
					<div class="sheet-head">
						<span class="sheet-title">选择文物点</span>
						<div class="sheet-close" @click="pickerOpen = false">
							<AppIcon name="close" :size="48" color="#334155" />
						</div>
					</div>
					<div class="search">
						<AppIcon name="search" :size="44" color="#64748B" />
						<input
							v-model.trim="keyword"
							class="search-input"
							placeholder="输入文物点名称搜索"
							enterkeyhint="search"
							@input="onKeyword"
							@keyup.enter="searchSites"
						/>
					</div>
					<div class="sheet-list">
						<div v-if="searching" class="u-empty">正在搜索…</div>
						<div v-else-if="!sites.length" class="u-empty">没有找到文物点，换个名字试试</div>
						<div
							v-for="item in sites"
							:key="item.id"
							class="site-option"
							:class="{ active: site && site.id === item.id }"
							@click="chooseSite(item)"
						>
							<div class="site-option-main">
								<span class="site-option-name">{{ item.name }}</span>
								<span class="site-option-sub">{{ [item.level, item.address].filter(Boolean).join(' · ') || item.sip_code || '' }}</span>
							</div>
							<AppIcon v-if="site && site.id === item.id" name="check" :size="48" color="#1E5AA8" :stroke="3" />
						</div>
					</div>
				</div>
			</div>

			<!-- 提交成功 -->
			<div v-if="success" class="success-mask">
				<div class="success u-fade-in">
					<div class="success-icon">
						<AppIcon name="check" :size="120" color="#FFFFFF" :stroke="3" />
					</div>
					<span class="success-title">上报成功</span>
					<span class="success-sub">{{ success.site }} · {{ success.normal ? '情况正常' : '已上报问题' }}</span>
					<button type="button" class="u-btn primary xl block" @click="again">继续巡查</button>
					<button type="button" class="u-btn ghost block" style="margin-top: 12px" @click="goRecords">查看我的记录</button>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script>
	import { IonContent, IonPage } from '@ionic/vue';
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import { addWatermark } from '@/lib/watermark.js';
	import { getUser } from '@/lib/auth.js';
	import { apiRequest, apiUpload, extractError } from '@/lib/request.js';
	import { formatDistance, pad } from '@/lib/format.js';
	import { chooseImage, getLocation, previewImage, vibrateLong } from '@/lib/native.js';
	import { switchTab } from '@/lib/nav.js';
	import { hideLoading, showLoading, showModal, toast } from '@/lib/ui.js';

	const FAR_KM = 1;

	export default {
		components: { AppHeader, AppIcon, IonContent, IonPage },
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
		ionViewWillEnter() {
			this.user = getUser() || {};
			this.locate();
		},
		ionViewWillLeave() {
			this.pickerOpen = false;
		},
		beforeUnmount() {
			clearTimeout(this.searchTimer);
			this.revokePhoto();
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
						toast('网络不好，请重试', { icon: 'none' });
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
			revokePhoto() {
				if (this.photo && this.photo.indexOf('blob:') === 0) {
					URL.revokeObjectURL(this.photo);
				}
				this.photo = '';
				this.photoFile = null;
			},
			async takePhoto() {
				if (!this.site) {
					toast('请先确认文物点', { icon: 'none' });
					return;
				}
				if (this.processing) {
					return;
				}
				let picked;
				try {
					picked = await chooseImage({ source: 'camera' });
				} catch (err) {
					if (err && (err.cancelled || /cancel/i.test(String(err.errMsg || err.message || '')))) {
						return;
					}
					toast('无法打开相机，请检查相机权限', { icon: 'none' });
					return;
				}
				const path = picked.webPath;
				this.processing = true;
				try {
					const marked = await addWatermark(path, this.watermarkText());
					this.revokePhoto();
					this.photo = marked.url;
					this.photoFile = marked.blob;
				} catch (e) {
					this.revokePhoto();
					this.photo = path;
					this.photoFile = path;
					toast('水印添加失败，已使用原图', { icon: 'none' });
				} finally {
					this.processing = false;
				}
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
				previewImage([this.photo]);
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
			async submit() {
				if (this.submitting) {
					return;
				}
				if (!this.canSubmit) {
					toast(this.submitHint, { icon: 'none' });
					return;
				}
				if (this.isFar) {
					const r = await showModal({
						title: '确认提交',
						content: `您距离「${this.site.name}」约 ${this.distanceText}，确定已经在现场了吗？`,
						confirmText: '确定提交',
						cancelText: '再看看',
					});
					if (!r.confirm) {
						return;
					}
				}
				this.doSubmit();
			},
			async doSubmit() {
				this.submitting = true;
				showLoading('正在上报');
				try {
					const res = await apiUpload({
						url: '/api/inspections/upload',
						file: this.photoFile || this.photo,
						fileName: 'photo.jpg',
						name: 'photo',
						formData: {
							site_id: this.site.id,
							latitude: this.location.latitude,
							longitude: this.location.longitude,
							is_normal: this.status === 'normal',
							issue_details: this.status === 'problem' ? this.issueText : '',
						},
					});
					hideLoading();
					if (res.statusCode === 201 || res.statusCode === 200) {
						this.success = { site: this.site.name, normal: this.status === 'normal' };
						vibrateLong();
					} else {
						showModal({ title: '上报失败', content: extractError(res, '上报失败，请稍后重试'), showCancel: false });
					}
				} catch (e) {
					hideLoading();
					showModal({
						title: '网络不好',
						content: '照片没有传上去，请到信号好的地方再点「提交巡查」。已拍的照片和填写的内容会保留。',
						showCancel: false,
						confirmText: '知道了',
					});
				} finally {
					this.submitting = false;
				}
			},
			resetForm() {
				this.success = null;
				this.revokePhoto();
				this.status = '';
				this.chips = [];
				this.issueNote = '';
				this.site = null;
				this.pickerOpen = false;
			},
			again() {
				this.resetForm();
				const el = this.$refs.content && this.$refs.content.$el;
				if (el && el.scrollToTop) {
					el.scrollToTop(0);
				}
				this.locate();
			},
			goRecords() {
				this.resetForm();
				switchTab('/tabs/records');
			},
		},
	};
</script>

<style scoped>
	.steps {
		padding-top: 14px;
	}

	.step {
		border: 1.5px solid transparent;
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
		gap: 9px;
		margin-bottom: 12px;
	}

	.step-no {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: #1E5AA8;
		color: #FFFFFF;
		font-size: 17px;
		font-weight: 800;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.finished .step-no {
		background: #15803D;
	}

	.step-title {
		font-size: 20px;
		font-weight: 800;
		color: #0F172A;
	}

	.locating {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 10px 0 14px;
		font-size: 16px;
		color: #475569;
		text-align: center;
	}

	.site {
		padding: 12px;
		border-radius: 12px;
		background: #F5F8FD;
	}

	.site-content {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.site-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.site-name {
		font-size: 21px;
		font-weight: 800;
		color: #0F172A;
		line-height: 1.3;
	}

	.site-addr {
		margin-top: 4px;
		font-size: 14px;
		color: #64748B;
	}

	.site-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}

	.change-btn {
		flex-shrink: 0;
	}

	.far-tip {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 10px;
		padding: 9px 11px;
		border-radius: 10px;
		background: #FEF3E2;
		color: #B45309;
		font-size: 15px;
		font-weight: 600;
	}

	.row-btns {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 12px;
	}

	.shoot {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24px 12px;
		border-radius: 14px;
		border: 2px dashed #9DB9E0;
		background: #F5F8FD;
	}

	.shoot:active {
		background: #E8F0FB;
	}

	.shoot-icon {
		width: 84px;
		height: 84px;
		border-radius: 50%;
		background: linear-gradient(135deg, #2A6BC2, #174B8F);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 7px 16px rgba(30, 90, 168, 0.35);
	}

	.shoot-text {
		margin-top: 12px;
		font-size: 20px;
		font-weight: 800;
		color: #1E5AA8;
	}

	.shoot-sub {
		margin-top: 4px;
		font-size: 14px;
		color: #64748B;
	}

	.photo {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.photo-img {
		display: block;
		width: 100%;
		height: 220px;
		object-fit: cover;
		border-radius: 12px;
		background: #E2E8F0;
	}

	.status-row {
		display: flex;
		gap: 12px;
	}

	.status-btn {
		flex: 1;
		height: 100px;
		border-radius: 14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-size: 20px;
		font-weight: 800;
		border: 2px solid;
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
		box-shadow: 0 6px 14px rgba(21, 128, 61, 0.32);
	}

	.status-btn.bad.active {
		color: #FFFFFF;
		background: #C62828;
		border-color: #C62828;
		box-shadow: 0 6px 14px rgba(198, 40, 40, 0.3);
	}

	.issue {
		margin-top: 14px;
	}

	.issue-label {
		display: block;
		font-size: 16px;
		font-weight: 700;
		color: #334155;
		margin-bottom: 9px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		padding: 10px 14px;
		border-radius: 999px;
		border: 1.5px solid #E2E8F0;
		background: #FFFFFF;
		font-size: 16px;
		color: #334155;
	}

	.chip.active {
		border-color: #C62828;
		background: #FDECEC;
		color: #C62828;
		font-weight: 700;
	}

	.issue-input {
		display: block;
		width: 100%;
		height: 110px;
		margin-top: 12px;
		padding: 12px;
		border-radius: 12px;
		border: 1.5px solid #E2E8F0;
		background: #F8FAFC;
		font-size: 16px;
		color: #0F172A;
		box-sizing: border-box;
		font-family: inherit;
		resize: none;
		outline: none;
	}

	.issue-input::placeholder,
	.search-input::placeholder {
		color: #94A3B8;
	}

	.submit {
		margin-top: 6px !important;
	}

	.submit-hint {
		display: block;
		margin: 9px 0 14px;
		text-align: center;
		font-size: 15px;
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
		border-radius: 18px 18px 0 0;
		display: flex;
		flex-direction: column;
		padding: 16px 16px env(safe-area-inset-bottom);
		box-sizing: border-box;
	}

	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sheet-title {
		font-size: 21px;
		font-weight: 800;
		color: #0F172A;
	}

	.sheet-close {
		padding: 6px;
	}

	.search {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 52px;
		margin: 12px 0 6px;
		padding: 0 12px;
		border-radius: 12px;
		background: #F1F5FB;
		border: 1.5px solid #E2E8F0;
	}

	.search-input {
		flex: 1;
		height: 100%;
		font-size: 17px;
		border: none;
		outline: none;
		background: transparent;
	}

	.sheet-list {
		flex: 1;
		height: 0;
		overflow-y: auto;
	}

	.site-option {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 14px 4px;
		border-bottom: 1px solid #EEF2F7;
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
		font-size: 18px;
		font-weight: 700;
		color: #0F172A;
	}

	.site-option-sub {
		margin-top: 2px;
		font-size: 14px;
		color: #64748B;
	}

	.success-mask {
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.success {
		width: 100%;
		padding: 28px 20px 22px;
		border-radius: 20px;
		background: #FFFFFF;
		display: flex;
		flex-direction: column;
		align-items: center;
		box-sizing: border-box;
	}

	.success-icon {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		background: #15803D;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 0 12px #E7F6EC;
	}

	.success-title {
		margin-top: 22px;
		font-size: 26px;
		font-weight: 800;
		color: #15803D;
	}

	.success-sub {
		margin: 6px 0 24px;
		font-size: 16px;
		color: #475569;
		text-align: center;
	}
</style>
