<template>
	<div class="app-page">
		<AppHeader title="巡查上报" :subtitle="`第 ${currentStep + 1} 步 / 共 3 步 · ${stepTitles[currentStep]}`" />
		<div class="patrol-fixed">
			<div class="u-card mx-4 mt-2" v-if="taskNotice">{{ taskNotice }}</div>
			<div class="u-card mx-4 mt-2 text-danger" v-if="draftError">{{ draftError }}</div>
			<van-steps :active="currentStep" class="step-progress" aria-label="巡查上报进度">
				<van-step v-for="title in stepTitles" :key="title">{{ title }}</van-step>
			</van-steps>
		</div>

		<div ref="content" class="app-content patrol-content">
			<div class="u-page">
				<div class="u-body steps">
					<!-- 第 1 步：文物点 -->
					<div v-if="currentStep === 0" class="u-card step" :class="{ finished: !!site }">
						<div class="step-head">
							<div class="step-no">{{ site ? '✓' : '1' }}</div>
							<span class="step-title">确认文物点</span>
						</div>
						<div v-if="site" class="site">
							<div class="site-main">
								<span class="site-name">{{ site.name }}</span>
								<span v-if="site.sip_code" class="site-code">{{ site.sip_code }}</span>
								<span v-if="site.address" class="site-addr">{{ site.address }}</span>
								<div class="site-tags">
									<span v-if="site.due_at" class="u-badge" :class="site.overdue ? 'warn' : 'ok'">到期：{{ new Date(site.due_at).toLocaleString() }}</span>
									<span v-if="site.manual" class="u-badge info">手动选择</span>
									<span v-else-if="distanceText" class="u-badge" :class="isFar ? 'warn' : 'ok'">距离约 {{ distanceText }}</span>
									<span v-if="!locationOk" class="u-badge warn">未获取到定位</span>
								</div>
							</div>
							<van-button size="small" native-type="button" @click="openPicker">换一个</van-button>
						</div>

						<div v-if="locating && !site" class="locating">
							<AppIcon name="locate" :size="56" color="var(--c-text-4)" />
							<span>正在定位，查找附近文物点…</span>
						</div>

						<div v-else-if="!site" class="locating">
							<AppIcon name="alert" :size="56" color="var(--c-warning)" />
							<span>{{ locateError || '附近没有找到文物点' }}</span>
						</div>

						<div v-if="site && isFar" class="far-tip">
							<div class="far-tip-icon">
								<AppIcon name="alert" :size="40" color="var(--c-warning)" :stroke="2.2" />
							</div>
							<div class="far-tip-copy">
								<strong>定位偏移提醒</strong>
								<span>您离该文物点约 {{ distanceText }}，请确认已到达现场后再提交。</span>
							</div>
						</div>

						<div class="row-btns">
							<van-button type="primary" block v-if="!site" native-type="button" @click="openPicker">
								<AppIcon name="search" :size="44" color="var(--c-on-primary)" />
								<span>选择文物点</span>
							</van-button>
							<van-button block native-type="button" :disabled="locating" @click="locate">
								<AppIcon name="refresh" :size="40" color="var(--c-text-2)" />
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
								<AppIcon name="camera" :size="68" color="var(--c-on-primary)" />
							</div>
							<span class="shoot-text">{{ processing ? '正在处理照片…' : '点这里拍照' }}</span>
							<span class="shoot-sub">照片会自动加上时间、地点水印</span>
						</div>
						<div v-else class="photo">
							<div v-for="(photo, index) in photos" :key="photo.url">
								<img class="photo-img" :src="photo.url" alt="" @click="preview(index)" />
								<van-button size="small" native-type="button" :disabled="processing || submitting" @click="removePhoto(index)">删除这张照片</van-button>
							</div>
							<van-button block native-type="button" :disabled="processing || submitting" @click="takePhoto">
								<AppIcon name="camera" :size="44" color="var(--c-text-2)" />
								<span>继续拍照（{{ photos.length }}/20）</span>
							</van-button>
						</div>
						<van-button block native-type="button" :disabled="processing || !site" @click="pickAlbum">从相册批量添加</van-button>
					</div>

					<!-- 第 3 步：情况 -->
					<div v-else class="u-card step" :class="{ finished: status === 'normal' || (status === 'problem' && issueText) }">
						<div class="step-head">
							<div class="step-no">3</div>
							<span class="step-title">文物点情况</span>
						</div>
						<div class="status-row">
							<div class="status-btn ok" :class="{ active: status === 'normal' }" @click="setStatus('normal')">
								<AppIcon name="check-circle" :size="72" :color="status === 'normal' ? 'var(--c-on-primary)' : 'var(--c-success)'" />
								<span>正常</span>
							</div>
							<div class="status-btn bad" :class="{ active: status === 'problem' }" @click="setStatus('problem')">
								<AppIcon name="alert" :size="72" :color="status === 'problem' ? 'var(--c-on-primary)' : 'var(--c-danger)'" />
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
							<van-field
								v-model="issueNote"
								type="textarea"
								rows="4"
								maxlength="300"
								:border="false"
								class="issue-input"
								placeholder="补充说明（选填）：例如位置、范围、严重程度"
							/>
						</div>
					</div>
				</div>
			</div>

			<!-- 文物点选择 -->
			<div v-if="pickerOpen" class="sheet-mask" @click="pickerOpen = false">
				<div class="sheet" @click.stop>
					<div class="sheet-head">
						<span class="sheet-title">选择文物点</span>
						<div class="sheet-close" @click="pickerOpen = false">
							<AppIcon name="close" :size="48" color="var(--c-text-2)" />
						</div>
					</div>
					<div class="search">
						<AppIcon name="search" :size="44" color="var(--c-text-3)" />
						<van-field
							v-model.trim="keyword"
							class="search-input"
							:border="false"
							placeholder="输入文物点名称搜索"
							enterkeyhint="search"
							@update:model-value="onKeyword"
							@keyup.enter="searchSites"
						/>
					</div>
					<div class="sheet-list">
						<div v-if="searching" class="u-empty">正在搜索…</div>
						<EmptyState v-else-if="!sites.length" message="没有找到文物点" hint="试试其他名称或编号。" />
						<div
							v-for="item in sites"
							:key="item.id"
							class="site-option"
							:class="{ active: site && site.id === item.id }"
							@click="chooseSite(item)"
						>
							<div class="site-option-main">
								<span class="site-option-name">{{ item.name }}</span>
								<span v-if="item.sip_code" class="site-option-code">{{ item.sip_code }}</span>
								<span v-if="item.level" class="level-badge" :class="heritageLevelAccent(item.level)">{{ item.level }}</span>
								<span v-if="item.address" class="site-option-sub">{{ item.address }}</span>
							</div>
							<AppIcon v-if="site && site.id === item.id" name="check" :size="48" color="var(--c-primary)" :stroke="3" />
						</div>
					</div>
				</div>
			</div>

			<!-- 提交成功 -->
			<div v-if="success" class="success-mask">
				<div class="success u-fade-in">
					<div class="success-icon">
						<AppIcon name="check" :size="120" color="var(--c-on-primary)" :stroke="3" />
					</div>
					<span class="success-title">{{ success.pending ? '已保存到本机' : '上报成功' }}</span>
					<span v-if="success.pending" class="success-sub">记录与照片已离线保存，联网后自动上传；可在记录页查看同步状态。</span>
					<span class="success-sub">{{ success.site }} · {{ success.normal ? '情况正常' : '已上报问题' }}</span>
					<van-button type="primary" size="large" block native-type="button" @click="again">继续巡查</van-button>
					<van-button type="primary" plain block native-type="button" style="margin-top: 12px" @click="goRecords">查看我的记录</van-button>
				</div>
			</div>
		</div>

		<!-- 固定底部操作栏：始终可见，无需滚动 -->
		<div class="patrol-footer">
			<span class="submit-hint" role="status">{{ stepHint }}</span>
			<div class="step-actions">
				<van-button v-if="currentStep > 0" native-type="button" size="large" class="previous-step" :disabled="processing || submitting" @click="previousStep">
					上一步
				</van-button>
				<van-button type="primary" size="large" v-if="currentStep < 2" native-type="button" class="next-step" :disabled="!canGoNext" @click="nextStep">
					{{ currentStep === 0 ? '确认并拍照' : '填写巡查情况' }}
				</van-button>
				<van-button type="primary" size="large" v-else native-type="button" class="submit" :disabled="!canSubmit || submitting" @click="submit">
					<AppIcon name="upload" :size="44" color="currentColor" />
					<span>{{ submitting ? '正在上报…' : '提交巡查' }}</span>
				</van-button>
			</div>
		</div>
	</div>
</template>

<script>
	import AppHeader from '@/components/AppHeader.vue';
	import AppIcon from '@/components/AppIcon.vue';
	import EmptyState from '@/components/EmptyState.vue';
	import { heritageLevelAccent } from '@/lib/heritage-level.js';
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
		components: { AppHeader, AppIcon, EmptyState },
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
			heritageLevelAccent,
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
@reference "../theme/tailwind.css";
.patrol-fixed { flex-shrink: 0; }
.patrol-fixed > .u-card { max-height: 2.75rem; overflow: hidden; }
.steps { @apply pt-2 pb-4; }
.step { @apply mb-3  border border-line transition-all duration-150; }
.step.finished { border-color: var(--c-primary); background: var(--c-primary-light); }
.step-progress { @apply mx-4 mt-2 mb-2 border border-line; }
.step-head { @apply flex items-center gap-3 px-4 pb-2.5 pt-3.5; }
.step-no { @apply flex h-7 w-7 shrink-0 items-center justify-center  bg-primary text-sm font-semibold text-on-primary; }
.finished .step-no { @apply bg-primary; }
.step-title { @apply text-base font-semibold text-ink; }
.locating { @apply flex flex-col items-center gap-2.5 px-4 py-5 text-center text-sm text-ink-2; }
.site { @apply mx-4 mb-2 flex items-start gap-3 p-3; background: var(--c-primary-light); }
.site-main { @apply flex min-w-0 flex-1 flex-col gap-1; }
.site-name { @apply text-base font-bold leading-[1.4] text-ink; }
.site-code, .site-option-code { @apply w-fit max-w-full border border-line bg-surface px-2 py-0.5 font-mono text-xs tabular-nums tracking-[0.02em] text-ink-2; overflow-wrap: anywhere; }
.site-addr { @apply block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] leading-5 text-ink-3; }
.site-tags { @apply mt-1.5 flex flex-wrap gap-1.5; }
.site-tags .u-badge { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.change-btn { @apply m-1 shrink-0; }
.far-tip { @apply mx-4 mb-3 flex items-start gap-2.5  border border-l-4 border-warning bg-warning-bg px-3 py-2.5 text-[0.8125rem] leading-6 text-ink; }
.far-tip-icon { @apply flex h-7 w-7 shrink-0 items-center justify-center  bg-warning-bg; }
.far-tip-copy { @apply flex min-w-0 flex-col gap-0.5; }
.far-tip-copy strong { @apply text-sm font-bold text-warning; }
.far-tip-copy span { @apply text-ink-2; }
.row-btns { @apply flex flex-col gap-2.5 px-4 pb-4; }
.shoot { @apply mx-4 mb-3 flex flex-col items-center  border-2 border-dashed border-line bg-fill px-4 py-7 transition-all duration-150; }
.shoot:active { @apply border-primary bg-surface; }
.shoot-icon { @apply flex h-16 w-16 items-center justify-center  bg-gradient-primary; box-shadow: 0 0.1875rem 0.625rem rgb(var(--c-primary-rgb) / 25%); }
.shoot-text { @apply mt-3 text-base font-semibold text-ink; }
.shoot-sub { @apply mt-1 text-[0.8125rem] text-ink-3; }
.photo { @apply flex flex-col gap-3 px-4 pb-4; }
.photo-img { @apply block h-60 w-full  bg-line object-cover; }
.status-row { @apply flex gap-3 px-4 pb-4; }
.status-btn { @apply flex h-[5.5rem] flex-1 cursor-pointer flex-col items-center justify-center gap-1.5  border-2 text-[0.9375rem] font-semibold transition-all duration-150; }
.status-btn.ok { @apply border-success-bg bg-success-bg text-success; }
.status-btn.bad { @apply border-danger-bg bg-danger-bg text-danger; }
.status-btn.ok.active { @apply border-success bg-success text-on-primary shadow-card; }
.status-btn.bad.active { @apply border-danger bg-danger text-on-primary shadow-card; }
.status-btn:active { transform: scale(0.98); }
.issue { @apply px-4 pb-4; }
.issue-label { @apply mb-2.5 block text-sm font-semibold text-ink; }
.chips { @apply flex flex-wrap gap-2; }
.chip { @apply cursor-pointer  border border-line bg-surface px-3.5 py-2 text-[0.8125rem] text-ink-2 transition-all duration-150; }
.chip:active { transform: scale(0.97); }
.chip.active { @apply border-danger bg-danger-bg font-semibold text-danger; }
.issue-input { @apply mt-3 box-border block h-[6.25rem] w-full  border border-line bg-fill p-3 text-sm text-ink; }
.issue-input :deep(.van-field__control) { @apply h-full resize-none bg-transparent font-sans text-sm text-ink outline-none; }
.issue-input :deep(.van-field__control)::placeholder, .search-input :deep(.van-field__control)::placeholder { @apply text-ink-4; }
.issue-input:focus-within { @apply border-primary bg-surface; }
.patrol-footer { @apply shrink-0 border-t border-line bg-surface px-2.5 pb-2.5 pt-2 shadow-card; }
.step-actions { @apply flex w-full min-w-0 items-center gap-2; }
.step-actions :deep(.van-button) {
	width: auto !important;
	min-width: 0;
	max-width: 100%;
	margin: 0;
	padding-inline: clamp(0.5rem, 3vw, 1rem);
}
.previous-step { flex: 0 1 32%; min-width: 4.5rem !important; height: 3rem; }
.next-step, .submit { flex: 1 1 0; height: 3rem; font-size: clamp(0.75rem, 3.8vw, 0.9375rem); font-weight: 600; }
.step-actions :deep(.van-button__content),
.step-actions :deep(.van-button__text) {
	display: flex;
	min-width: 0;
	align-items: center;
	justify-content: center;
	gap: clamp(0.25rem, 1.5vw, 0.5rem);
	white-space: nowrap;
}
.submit :deep(.van-icon),
.submit :deep(svg) { flex-shrink: 0; }
.submit-hint { @apply mb-2 block text-center text-[0.8125rem] text-ink-3; }
.sheet-mask, .success-mask { @apply fixed inset-0 z-[1000] flex; background: var(--c-mask); }
.sheet-mask { @apply items-end; }
.sheet { @apply flex h-[85vh] w-full flex-col  bg-surface p-[1.125rem]; box-sizing: border-box; padding-bottom: env(safe-area-inset-bottom); }
.sheet-head { @apply flex items-center justify-between; }
.sheet-title { @apply text-lg font-semibold text-ink; }
.sheet-close { @apply  p-2 transition-colors duration-150; }
.sheet-close:active { @apply bg-fill; }
.search { @apply my-3 flex h-[2.875rem] items-center gap-2.5  border border-line bg-fill px-3.5 transition-all duration-150; }
.search:focus-within { @apply border-primary bg-surface; box-shadow: 0 0 0 0.125rem rgb(var(--c-primary-rgb) / 12%); }
.search-input { @apply h-full min-w-0 flex-1 bg-transparent p-0 text-[0.9375rem] text-ink; }
.search-input :deep(.van-field__control) { @apply bg-transparent p-0 text-[0.9375rem] text-ink; }
.sheet-list { @apply min-h-0 flex-1 overflow-y-auto; height: 0; -webkit-overflow-scrolling: touch; }
.site-option { @apply flex cursor-pointer items-center gap-3 border-b border-line px-2 py-3.5 transition-colors duration-150; }
.site-option:active { @apply bg-fill; }
.site-option.active { @apply bg-primary-light; }
.site-option-main { @apply flex min-w-0 flex-1 flex-col gap-0.5; }
.site-option-main .level-badge { align-self: flex-start; }
.site-option-name { @apply text-[0.9375rem] font-bold text-ink; }
.site-option-code { @apply mt-0.5 bg-fill text-[0.6875rem]; }
.site-option-sub { @apply text-xs leading-[1.45] text-ink-3; overflow-wrap: anywhere; }
.success-mask { @apply items-center justify-center p-6; }
.success { @apply flex w-full max-w-[22.5rem] flex-col items-center  bg-surface px-6 pb-5 pt-7 shadow-card; box-sizing: border-box; box-shadow: 0 0.75rem 2.5rem rgb(0 0 0 / 12%); }
.success-icon { @apply flex h-20 w-20 items-center justify-center  bg-success; box-shadow: 0 0 0 0.625rem var(--c-success-bg); }
.success-title { @apply mt-[1.125rem] text-xl font-semibold text-success; }
.success-sub { @apply my-2 mb-5 text-center text-sm leading-6 text-ink-2; }
</style>
