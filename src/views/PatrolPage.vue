<template>
	<div class="app-page">
		<div ref="content" class="app-content">
			<div class="u-page">
				<AppHeader title="巡查上报" :subtitle="`第 ${currentStep + 1} 步 / 共 3 步 · ${stepTitles[currentStep]}`" />
				<div class="u-card" v-if="taskNotice">{{ taskNotice }}</div>
				<div class="u-card" v-if="draftError" style="color: #C62828">{{ draftError }}</div>

				<div class="u-body steps">
					<van-steps :active="currentStep" class="step-progress" aria-label="巡查上报进度">
						<van-step v-for="title in stepTitles" :key="title">{{ title }}</van-step>
					</van-steps>
					<!-- 第 1 步：文物点 -->
					<div v-if="currentStep === 0" class="u-card step" :class="{ finished: !!site }">
						<div class="step-head">
							<div class="step-no">{{ site ? '✓' : '1' }}</div>
							<span class="step-title">确认文物点</span>
						</div>

						<div v-if="locating && !site" class="locating">
							<AppIcon name="locate" :size="56" color="#94A3B8" />
							<span>正在定位，查找附近文物点…</span>
						</div>

						<div v-else-if="site" class="site">
							<div class="site-main">
								<span class="site-name">{{ site.name }}</span>
								<span v-if="site.address" class="site-addr">{{ site.address }}</span>
								<div class="site-tags">
									<span v-if="site.due_at" class="u-badge" :class="site.overdue ? 'warn' : 'ok'">到期：{{ new Date(site.due_at).toLocaleString() }}</span>
									<span v-if="site.manual" class="u-badge info">手动选择</span>
									<span v-else-if="distanceText" class="u-badge" :class="isFar ? 'warn' : 'ok'">距离约 {{ distanceText }}</span>
									<span v-if="!locationOk" class="u-badge warn">未获取到定位</span>
								</div>
							</div>
							<van-button native-type="button" class="u-btn sm change-btn" @click="openPicker">换一个</van-button>
						</div>

						<div v-else class="locating">
							<AppIcon name="alert" :size="56" color="#B45309" />
							<span>{{ locateError || '附近没有找到文物点' }}</span>
						</div>

						<div v-if="site && isFar" class="far-tip">
							<AppIcon name="alert" :size="40" color="#B45309" />
							<span>您离这个文物点较远，请确认是否在现场。</span>
						</div>

						<div class="row-btns">
							<van-button v-if="!site" native-type="button" class="u-btn primary block" @click="openPicker">
								<AppIcon name="search" :size="44" color="#FFFFFF" />
								<span>选择文物点</span>
							</van-button>
							<van-button native-type="button" class="u-btn plain block" :disabled="locating" @click="locate">
								<AppIcon name="refresh" :size="40" color="#334155" />
								<span>{{ locating ? '定位中…' : '重新定位' }}</span>
							</van-button>
						</div>
					</div>

					<!-- 第 2 步：拍照 -->
					<div v-else-if="currentStep === 1" class="u-card step" :class="{ finished: !!photos.length }">
						<div class="step-head">
							<div class="step-no">{{ photos.length ? '✓' : '2' }}</div>
							<span class="step-title">拍摄现场照片</span>
						</div>
						<div v-if="!photos.length" class="shoot" @click="takePhoto">
							<div class="shoot-icon">
								<AppIcon name="camera" :size="68" color="#FFFFFF" />
							</div>
							<span class="shoot-text">{{ processing ? '正在处理照片…' : '点这里拍照' }}</span>
							<span class="shoot-sub">照片会自动加上时间、地点水印</span>
						</div>
						<div v-else class="photo">
							<div v-for="(photo, index) in photos" :key="photo.url">
								<img class="photo-img" :src="photo.url" alt="" @click="preview(index)" />
								<van-button native-type="button" class="u-btn sm" :disabled="processing || submitting" @click="removePhoto(index)">删除这张照片</van-button>
							</div>
							<van-button native-type="button" class="u-btn plain block" :disabled="processing || submitting" @click="takePhoto">
								<AppIcon name="camera" :size="44" color="#334155" />
								<span>继续拍照（{{ photos.length }}/20）</span>
							</van-button>
						</div>
						<van-button native-type="button" class="u-btn plain block" :disabled="processing || !site" @click="pickAlbum">从相册批量添加</van-button>
					</div>

					<!-- 第 3 步：情况 -->
					<div v-else class="u-card step" :class="{ finished: status === 'normal' || (status === 'problem' && issueText) }">
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

					<div class="step-actions" :class="{ 'final-step': currentStep === 2 }">
						<van-button v-if="currentStep > 0" native-type="button" class="u-btn plain previous-step" :disabled="processing || submitting" @click="previousStep">
							上一步
						</van-button>
						<van-button v-if="currentStep < 2" native-type="button" class="u-btn primary xl next-step" :disabled="!canGoNext" @click="nextStep">
							{{ currentStep === 0 ? '确认文物点，下一步' : '照片已拍好，下一步' }}
						</van-button>
						<van-button v-else native-type="button" class="u-btn xl submit" :class="canSubmit ? 'primary' : 'plain'" :disabled="!canSubmit || submitting" @click="submit">
							<AppIcon name="upload" :size="44" :color="canSubmit ? '#FFFFFF' : '#94A3B8'" />
							<span>{{ submitting ? '正在上报…' : '提交巡查' }}</span>
						</van-button>
					</div>
					<span class="submit-hint" role="status">{{ stepHint }}</span>
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
					<span class="success-title">{{ success.pending ? '已保存到本机' : '上报成功' }}</span>
					<span v-if="success.pending" class="success-sub">记录与照片已离线保存，联网后自动上传；可在记录页查看同步状态。</span>
					<span class="success-sub">{{ success.site }} · {{ success.normal ? '情况正常' : '已上报问题' }}</span>
					<van-button native-type="button" class="u-btn primary xl block" @click="again">继续巡查</van-button>
					<van-button native-type="button" class="u-btn ghost block" style="margin-top: 12px" @click="goRecords">查看我的记录</van-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import { addWatermark } from '@/lib/watermark.js';
	import { getUser } from '@/lib/auth.js';
	import { enqueuePatrol, loadTasks, pendingPatrols, syncPatrols } from '@/lib/patrol.js';
	import { readCache, removeCache, saveCache } from '@/lib/patrolStore.js';
	import { Camera } from '@capacitor/camera';
	import { formatDistance, pad } from '@/lib/format.js';
	import { chooseImage, getLocation, previewImage, vibrateLong } from '@/lib/native.js';
	import { switchTab } from '@/lib/nav.js';
	import { hideLoading, showLoading, showModal, toast } from '@/lib/ui.js';

	const FAR_KM = 1;

	export default {
		components: { AppHeader, AppIcon, },
		data() {
			return {
				user: {},
				currentStep: 0,
				stepTitles: ['确认文物点', '拍摄照片', '填写情况'],
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
				photos: [],
				tasks: [],
				taskNotice: '',
				draftError: '',
				draftSaving: Promise.resolve(),
				capturedAt: '',
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
			canGoNext() {
				if (this.processing || this.submitting) return false;
				return this.currentStep === 0 ? !!this.site : this.currentStep === 1 && !!this.site && !!this.photos.length;
			},
			stepHint() {
				if (this.processing) return '请等待照片处理完成';
				if (this.currentStep === 0) return this.site ? '确认文物点后，点击下一步拍摄现场照片' : '请先选择或定位文物点';
				if (this.currentStep === 1) return this.photos.length ? `已添加 ${this.photos.length} 张照片，点击下一步填写情况` : '请至少添加一张现场照片';
				return this.submitHint;
			},
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
				return !!(this.site && this.photos.length && !this.processing && (this.status === 'normal' || (this.status === 'problem' && this.issueText)));
			},
			submitHint() {
				if (!this.site) return '请先确认文物点';
				if (!this.photos.length) return '请拍摄现场照片';
				if (this.processing) return '请等待照片处理完成';
				if (!this.status) return '请选择「正常」或「有问题」';
				if (this.status === 'problem' && !this.issueText) return '请选择或填写发现的问题';
				return '信息已填好，请点击提交';
			},
		},
		async activated() {
			const previousId = this.user.id;
			this.user = getUser() || {};
			if (previousId !== this.user.id) {
				this.resetForm();
				this.tasks = [];
				this.sites = [];
				this.locationOk = false;
				this.location = { latitude: 0, longitude: 0 };
				try {
					const cached = await readCache(this.user.id, 'draft');
					if (cached?.value) {
						const draft = cached.value;
						this.site = draft.site;
						this.location = draft.location;
						this.locationOk = draft.locationOk;
						this.status = draft.status;
						this.chips = draft.chips;
						this.issueNote = draft.issueNote;
						this.capturedAt = draft.capturedAt || '';
						this.photos = draft.photos.map(file => ({ file, url: URL.createObjectURL(file) }));
						this.currentStep = this.site && this.photos.length && [0, 1, 2].includes(draft.currentStep) ? draft.currentStep : 0;
					}
				} catch (error) {
					toast(error.message || '本地巡查草稿读取失败');
				}
			}
			await this.refreshTasks();
			this.locate();
		},
		watch: {
			status() { this.persistDraft(); },
			chips: { deep: true, handler() { this.persistDraft(); } },
			issueNote() { this.persistDraft(); },
		},
		deactivated() {
			this.pickerOpen = false;
		},
		beforeUnmount() {
			clearTimeout(this.searchTimer);
			this.revokePhoto();
		},
		methods: {
			setStep(step) {
				this.currentStep = step;
				this.persistDraft();
				this.$nextTick(() => this.$refs.content?.scrollTo({ top: 0 }));
			},
			nextStep() {
				if (!this.canGoNext) {
					toast(this.stepHint, { icon: 'none' });
					return;
				}
				this.setStep(this.currentStep + 1);
			},
			previousStep() {
				if (this.currentStep === 0 || this.processing || this.submitting) return;
				this.setStep(this.currentStep - 1);
			},
			persistDraft() {
				if (!this.user.id || !this.photos.length || this.success) return this.draftSaving;
				const userId = this.user.id;
				const draft = {
					site: { ...this.site }, location: { ...this.location }, locationOk: this.locationOk,
					status: this.status, chips: [...this.chips], issueNote: this.issueNote,
					capturedAt: this.capturedAt,
					currentStep: this.currentStep,
					photos: this.photos.map(photo => photo.file),
				};
				this.draftSaving = this.draftSaving.then(async () => {
					await saveCache(userId, 'draft', draft);
					this.draftError = '';
				}).catch(error => {
					this.draftError = error.message || '草稿保存失败，请检查本机剩余空间';
					toast(this.draftError);
				});
				return this.draftSaving;
			},
			async refreshTasks() {
				try {
					const result = await loadTasks();
					this.tasks = result.items || [];
					this.taskNotice = result.cached ? `离线任务清单（${new Date(result.savedAt).toLocaleString()}），联网后更新分配与期限。` : '';
					if (!this.tasks.length) this.taskNotice = '请联系管理员分配巡查文物点';
					if (this.site && !this.tasks.some(item => item.id === this.site.id)) {
						this.taskNotice += ' 当前草稿文物点已不在分配范围，请联系管理员；照片仍保留。';
					}
					this.searchSites();
				} catch (error) {
					this.taskNotice = error.message || error.errMsg || '下载巡查任务失败';
					toast(this.taskNotice);
				}
			},
			locate() {
				this.locating = true;
				this.locateError = '';
				return getLocation()
					.then((loc) => {
						this.locationOk = true;
						this.location = { latitude: loc.latitude, longitude: loc.longitude };
						const radians = value => value * Math.PI / 180;
						const nearby = this.tasks.filter(item => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
							.map(item => {
								const lat1 = radians(loc.latitude), lat2 = radians(Number(item.latitude));
								const a = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(radians(Number(item.longitude) - loc.longitude) / 2) ** 2;
								return { ...item, distance: 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) };
							}).sort((a, b) => a.distance - b.distance);
						if (this.currentStep === 0 && !this.photos.length && (!this.site || !this.site.manual) && nearby.length) this.site = { ...nearby[0], manual: false };
						if (!this.site) this.locateError = this.taskNotice || '没有已分配文物点，请联系管理员';
					})
					.catch((err) => {
						if (!this.locationOk) {
							this.locateError = `${(err && err.errMsg) || '定位失败'}，也可手动选择文物点`;
						} else if (!this.site) {
							this.locateError = '查找已分配文物点失败，请重试';
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
				this.sites = this.tasks.filter(item => !this.keyword || [item.name, item.address, item.sip_code].join(' ').includes(this.keyword));
			},
			chooseSite(item) {
				if (this.photos.length && this.site?.id !== item.id) {
					toast('请先删除已拍照片，再切换文物点，避免照片水印与任务不一致');
					return;
				}
				this.site = {
					...item,
					manual: true,
				};
				if (!this.locationOk) {
					this.location = { latitude: Number(item.latitude) || 0, longitude: Number(item.longitude) || 0 };
				}
				this.pickerOpen = false;
			},
			revokePhoto() {
				this.photos.forEach(photo => { if (photo.url.startsWith('blob:')) URL.revokeObjectURL(photo.url); });
				this.photos = [];
			},
			async removePhoto(index) {
				if (this.processing || this.submitting) return;
				const [photo] = this.photos.splice(index, 1);
				if (photo.url.startsWith('blob:')) URL.revokeObjectURL(photo.url);
				if (this.photos.length) await this.persistDraft();
				else {
					this.capturedAt = '';
					try {
						await this.draftSaving;
						await removeCache(this.user.id, 'draft');
					} catch (error) { toast(error.message || '草稿清理失败'); }
				}
			},
			async addPhoto(path) {
				const marked = await addWatermark(path, this.watermarkText());
				if (marked.blob.size > 10 * 1024 * 1024) {
					URL.revokeObjectURL(marked.url);
					throw new Error('照片超过 10 MB，请降低分辨率');
				}
				this.photos.push({ url: marked.url, file: marked.blob });
				if (!this.capturedAt) this.capturedAt = new Date().toISOString();
				await this.persistDraft();
			},
			async pickAlbum() {
				if (!this.site || this.processing || this.submitting) return;
				if (this.photos.length >= 20) { toast('最多添加 20 张照片'); return; }
				this.processing = true;
				try {
					const picked = await Camera.pickImages({ quality: 85, width: 2400, limit: 20 - this.photos.length });
					for (const photo of picked.photos.slice(0, 20 - this.photos.length)) await this.addPhoto(photo.webPath);
				} catch (error) {
					if (!/cancel/i.test(error.message || '')) toast(error.message || '相册照片添加失败，请检查权限');
				} finally {
					this.processing = false;
				}
			},
			async takePhoto() {
				if (this.submitting) return;
				if (!this.site) {
					toast('请先确认文物点', { icon: 'none' });
					return;
				}
				if (this.processing) {
					return;
				}
				if (this.photos.length >= 20) { toast('最多添加 20 张照片'); return; }
				this.processing = true;
				try {
					let picked;
					try {
						picked = await chooseImage({ source: 'camera' });
					} catch (err) {
						if (err && (err.cancelled || /cancel/i.test(String(err.errMsg || err.message || '')))) return;
						toast('无法打开相机，请检查相机权限', { icon: 'none' });
						return;
					}
					await this.addPhoto(picked.webPath);
				} catch (e) {
					toast(e.message || '水印添加失败，请重试', { icon: 'none' });
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
			preview(index) {
				previewImage(this.photos.map(photo => photo.url), index);
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
				if (this.currentStep !== 2) {
					toast('请点击下一步，完成填写情况后再提交', { icon: 'none' });
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
				return this.doSubmit();
			},
			async doSubmit() {
				this.submitting = true;
				showLoading('正在上报');
				try {
					await this.draftSaving;
					const row = await enqueuePatrol({
							site_id: this.site.id,
							site_name: this.site.name,
							latitude: this.location.latitude,
							longitude: this.location.longitude,
							is_normal: this.status === 'normal',
							issue_details: this.status === 'problem' ? this.issueText : '',
							inspect_time: this.capturedAt || new Date().toISOString(),
					}, this.photos.map(photo => photo.file));
					this.success = { site: this.site.name, normal: this.status === 'normal', pending: true, client_id: row.client_id };
					hideLoading();
					vibrateLong();
					syncPatrols().then(async () => {
						const pending = (await pendingPatrols()).some(item => item.key === row.key);
						if (this.success?.client_id === row.client_id) this.success.pending = pending;
					}).catch(error => toast(error.message || '记录已保存，同步失败，请在记录页重试'));
				} catch (e) {
					hideLoading();
					showModal({
						title: this.success ? '同步未完成' : '本地保存失败',
						content: e.message || e.errMsg || '本地存储空间不足或不可用，请保留页面并重试',
						showCancel: false,
						confirmText: '知道了',
					});
				} finally {
					this.submitting = false;
				}
			},
			resetForm() {
				this.currentStep = 0;
				this.success = null;
				this.capturedAt = '';
				this.revokePhoto();
				this.status = '';
				this.chips = [];
				this.issueNote = '';
				this.site = null;
				this.pickerOpen = false;
			},
			again() {
				this.resetForm();
				this.$refs.content?.scrollTo({ top: 0 });
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
/* ========== 巡查上报页面简约设计 ========== */
.steps {
	padding-top: 16px;
	padding-bottom: 32px;
}

/* 步骤卡片 */
.step {
	border: 1px solid #E2E8F0;
	border-radius: 16px;
	margin-bottom: 16px;
	transition: all 150ms ease;
}

.step.finished {
	border-color: #10B981;
	background: #F0FDF4;
}

.step-progress {
	margin-bottom: 16px;
	border-radius: 12px;
}

.step-head {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 16px 16px 12px;
}

.step-no {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: #2563EB;
	color: #FFFFFF;
	font-size: 16px;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.finished .step-no {
	background: #10B981;
}

.step-title {
	font-size: 18px;
	font-weight: 700;
	color: #1E293B;
}

/* 定位状态 */
.locating {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 24px 16px;
	font-size: 15px;
	color: #64748B;
	text-align: center;
}

/* 文物点信息 */
.site {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	padding: 16px;
	margin: 0 16px 16px;
	border-radius: 12px;
	background: #F8FAFC;
}

.site-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.site-name {
	font-size: 18px;
	font-weight: 700;
	color: #1E293B;
	line-height: 1.4;
}

.site-addr {
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
	margin: 4px;
}

.far-tip {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 0 16px 16px;
	padding: 12px;
	border-radius: 12px;
	background: #FEF3C7;
	color: #92400E;
	font-size: 14px;
	font-weight: 500;
}

.row-btns {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 0 16px 16px;
}

/* 拍照区域 */
.shoot {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 32px 16px;
	margin: 0 16px 16px;
	border-radius: 16px;
	border: 2px dashed #CBD5E1;
	background: #F8FAFC;
	transition: all 150ms ease;
}

.shoot:active {
	background: #F1F5F9;
	border-color: #2563EB;
}

.shoot-icon {
	width: 72px;
	height: 72px;
	border-radius: 50%;
	background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.shoot-text {
	margin-top: 12px;
	font-size: 17px;
	font-weight: 600;
	color: #1E293B;
}

.shoot-sub {
	margin-top: 4px;
	font-size: 14px;
	color: #64748B;
}

.photo {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 0 16px 16px;
}

.photo-img {
	display: block;
	width: 100%;
	height: 240px;
	object-fit: cover;
	border-radius: 12px;
	background: #E2E8F0;
}

/* 状态选择 */
.status-row {
	display: flex;
	gap: 12px;
	padding: 0 16px 16px;
}

.status-btn {
	flex: 1;
	height: 100px;
	border-radius: 12px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8px;
	font-size: 17px;
	font-weight: 600;
	border: 2px solid;
	transition: all 150ms ease;
	cursor: pointer;
}

.status-btn.ok {
	color: #10B981;
	border-color: #D1FAE5;
	background: #F0FDF4;
}

.status-btn.bad {
	color: #EF4444;
	border-color: #FEE2E2;
	background: #FEF2F2;
}

.status-btn.ok.active {
	color: #FFFFFF;
	background: #10B981;
	border-color: #10B981;
	box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.status-btn.bad.active {
	color: #FFFFFF;
	background: #EF4444;
	border-color: #EF4444;
	box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.status-btn:active {
	transform: scale(0.97);
}

/* 问题描述 */
.issue {
	padding: 0 16px 16px;
}

.issue-label {
	display: block;
	font-size: 15px;
	font-weight: 600;
	color: #1E293B;
	margin-bottom: 10px;
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.chip {
	padding: 10px 14px;
	border-radius: 20px;
	border: 1px solid #E2E8F0;
	background: #FFFFFF;
	font-size: 14px;
	color: #475569;
	transition: all 150ms ease;
	cursor: pointer;
}

.chip:active {
	transform: scale(0.97);
}

.chip.active {
	border-color: #EF4444;
	background: #FEE2E2;
	color: #DC2626;
	font-weight: 600;
}

.issue-input {
	display: block;
	width: 100%;
	height: 120px;
	margin-top: 12px;
	padding: 12px;
	border-radius: 12px;
	border: 1px solid #E2E8F0;
	background: #F8FAFC;
	font-size: 15px;
	color: #1E293B;
	box-sizing: border-box;
	font-family: inherit;
	resize: none;
	outline: none;
	transition: border-color 150ms ease;
}

.issue-input:focus {
	border-color: #2563EB;
	background: #FFFFFF;
}

.issue-input::placeholder,
.search-input::placeholder {
	color: #94A3B8;
}

/* 提交按钮 */
.step-actions {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	margin-top: 8px;
}

.previous-step {
	flex: 0 0 auto;
}

.next-step,
.submit {
	flex: 1;
	min-width: 0;
	margin: 0;
	height: 56px;
	font-size: 17px;
	font-weight: 600;
	border-radius: 12px;
}

.submit :deep(.van-button__content),
.submit :deep(.van-button__text) {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
}

.step-actions.final-step {
	flex-direction: column;
}

.final-step .submit {
	flex: none;
	width: 100%;
	order: 0;
}

.final-step .previous-step {
	width: 100%;
	order: 1;
}

.submit-hint {
	display: block;
	margin: 8px 16px 16px;
	text-align: center;
	font-size: 14px;
	color: #64748B;
}

/* 弹窗遮罩 */
.sheet-mask,
.success-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1000;
	background: rgba(15, 23, 42, 0.6);
	display: flex;
}

.sheet-mask {
	align-items: flex-end;
}

/* 底部弹窗 */
.sheet {
	width: 100%;
	height: 85vh;
	background: #FFFFFF;
	border-radius: 20px 20px 0 0;
	display: flex;
	flex-direction: column;
	padding: 20px 20px env(safe-area-inset-bottom);
	box-sizing: border-box;
}

.sheet-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.sheet-title {
	font-size: 20px;
	font-weight: 700;
	color: #1E293B;
}

.sheet-close {
	padding: 8px;
	border-radius: 8px;
	transition: background 150ms ease;
}

.sheet-close:active {
	background: #F1F5F9;
}

/* 搜索框 */
.search {
	display: flex;
	align-items: center;
	gap: 10px;
	height: 48px;
	margin: 16px 0 12px;
	padding: 0 14px;
	border-radius: 12px;
	background: #F8FAFC;
	border: 1px solid #E2E8F0;
	transition: all 150ms ease;
}

.search:focus-within {
	background: #FFFFFF;
	border-color: #2563EB;
	box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-input {
	flex: 1;
	height: 100%;
	font-size: 16px;
	border: none;
	outline: none;
	background: transparent;
	color: #1E293B;
}

/* 列表 */
.sheet-list {
	flex: 1;
	height: 0;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
}

.site-option {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 14px 8px;
	border-bottom: 1px solid #F1F5F9;
	transition: background 150ms ease;
	cursor: pointer;
}

.site-option:active {
	background: #F8FAFC;
}

.site-option.active {
	background: #EFF6FF;
}

.site-option-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.site-option-name {
	font-size: 16px;
	font-weight: 600;
	color: #1E293B;
}

.site-option-sub {
	font-size: 13px;
	color: #64748B;
}

/* 成功弹窗 */
.success-mask {
	align-items: center;
	justify-content: center;
	padding: 24px;
}

.success {
	width: 100%;
	max-width: 360px;
	padding: 32px 24px 24px;
	border-radius: 20px;
	background: #FFFFFF;
	display: flex;
	flex-direction: column;
	align-items: center;
	box-sizing: border-box;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.success-icon {
	width: 88px;
	height: 88px;
	border-radius: 50%;
	background: #10B981;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 0 0 12px #D1FAE5;
}

.success-title {
	margin-top: 20px;
	font-size: 22px;
	font-weight: 700;
	color: #10B981;
}

.success-sub {
	margin: 8px 0 24px;
	font-size: 15px;
	color: #64748B;
	text-align: center;
	line-height: 1.5;
}
</style>
