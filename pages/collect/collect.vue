<template>
	<view class="page">

		<!-- ══ 顶部进度步骤条 ══ -->
		<view class="steps-bar">
			<view v-for="(s, i) in steps" :key="i" class="step-item">
				<view :class="['step-dot', step > i ? 'done' : step === i ? 'active' : '']">
					<text v-if="step > i" class="step-check">✓</text>
					<text v-else class="step-num">{{ i + 1 }}</text>
				</view>
				<text :class="['step-label', step === i ? 'step-label-active' : '']">{{ s }}</text>
				<view v-if="i < steps.length - 1" :class="['step-line', step > i ? 'done' : '']"></view>
			</view>
		</view>

		<view class="form-scroll">

			<!-- ══════ 步骤 0：基础信息 ══════ -->
			<view v-if="step === 0" class="section">
				<view class="section-head">
					<view class="section-dot blue"></view>
					<text class="section-title">基础信息</text>
				</view>

				<view class="field">
					<view class="code-label-row">
						<text class="label" style="margin-bottom:0;">普查编号</text>
						<view class="code-toggle-row">
							<view :class="['toggle-btn', surveyCodeAuto ? 'toggle-active' : '']" @click="surveyCodeAuto = true">自动生成</view>
							<view :class="['toggle-btn', !surveyCodeAuto ? 'toggle-active' : '']" @click="surveyCodeAuto = false">手动填写</view>
						</view>
					</view>
					<view v-if="surveyCodeAuto" class="code-auto-hint">
						<text class="code-auto-icon">🔖</text>
						<text class="code-auto-text">提交后由系统自动分配（格式：SS-CJ-YYYY-NNNN）</text>
					</view>
					<input v-if="!surveyCodeAuto" v-model="form.survey_code" class="input" placeholder="如：SS-CJ-2026-0001" maxlength="50" />
					<text v-if="errors.survey_code" class="err">{{ errors.survey_code }}</text>
				</view>

				<view class="field">
					<text class="label required">文物名称</text>
					<input v-model="form.name" class="input" placeholder="请输入文物标准名称" maxlength="200" />
					<text v-if="errors.name" class="err">{{ errors.name }}</text>
				</view>

				<view class="field">
					<text class="label">曾用名 / 别名</text>
					<input v-model="form.former_name" class="input" placeholder="（选填）" maxlength="200" />
				</view>

				<view class="field-row">
					<view class="field half">
						<text class="label required">时代</text>
						<input v-model="form.era" class="input" placeholder="如：汉、唐宋" maxlength="100" />
						<text v-if="errors.era" class="err">{{ errors.era }}</text>
					</view>
					<view class="field half">
						<text class="label required">文物类别</text>
						<picker :range="categoryLabels" :value="categoryIndex" @change="onCategoryChange">
							<view class="picker-view">
								<text :class="form.category ? 'picker-val' : 'picker-ph'">
									{{ form.category ? categoryLabels[categoryIndex] : '请选择' }}
								</text>
								<text class="picker-arrow">›</text>
							</view>
						</picker>
						<text v-if="errors.category" class="err">{{ errors.category }}</text>
					</view>
				</view>

				<view class="field">
					<text class="label">文物简介</text>
					<textarea v-model="form.description" class="textarea" placeholder="对文物的历史背景、形制特征及现状进行描述" maxlength="2000"></textarea>
				</view>

				<button class="btn-next" @click="goStep(1)">下一步：地理位置 →</button>
			</view>

			<!-- ══════ 步骤 1：地理位置 ══════ -->
			<view v-if="step === 1" class="section">
				<view class="section-head">
					<view class="section-dot green"></view>
					<text class="section-title">地理位置</text>
				</view>

				<!-- GPS 卡片 -->
				<view class="gps-card">
					<view class="gps-row">
						<button :class="['btn-gps', locating ? 'loading' : '']" @click="getLocation" :disabled="locating">
							<text class="gps-icon">📍</text>
							<text>{{ locating ? '定位中…' : (form.longitude ? '重新定位' : '获取当前位置') }}</text>
						</button>
						<view :class="['gps-badge', gpsBadgeClass]">{{ gpsBadgeText }}</view>
					</view>
					<text v-if="errors.location" class="err" style="margin-top:4rpx;">{{ errors.location }}</text>

					<view v-if="form.longitude" class="coord-display">
						<view class="coord-item">
							<text class="coord-label">经度</text>
							<text class="coord-val">{{ form.longitude }}</text>
						</view>
						<view class="coord-item">
							<text class="coord-label">纬度</text>
							<text class="coord-val">{{ form.latitude }}</text>
						</view>
						<view class="coord-item" v-if="locationAccuracy">
							<text class="coord-label">精度</text>
							<text class="coord-val">±{{ locationAccuracy }}m</text>
						</view>
						<view class="coord-item" v-if="form.altitude">
							<text class="coord-label">海拔</text>
							<text class="coord-val">{{ form.altitude }}m</text>
						</view>
					</view>
				</view>

				<view class="field">
					<AltitudeCollect
						v-model="form.altitude"
						@collect-done="onAltitudeCollectDone"
					/>
				</view>

				<!-- 行政区划 -->
				<view class="field-row">
					<view class="field third">
						<text class="label">省/自治区</text>
						<input v-model="form.province" class="input" placeholder="省级" />
					</view>
					<view class="field third">
						<text class="label">市/州</text>
						<input v-model="form.city" class="input" placeholder="市级" />
					</view>
					<view class="field third">
						<text class="label">县/区</text>
						<input v-model="form.county" class="input" placeholder="县级" />
					</view>
				</view>
				<view class="field-row">
					<view class="field half">
						<text class="label">乡镇/街道</text>
						<input v-model="form.township" class="input" placeholder="（选填）" />
					</view>
					<view class="field half">
						<text class="label">村/社区</text>
						<input v-model="form.village" class="input" placeholder="（选填）" />
					</view>
				</view>
				<view class="field">
					<text class="label">详细地址</text>
					<input v-model="form.address" class="input" placeholder="精确到自然地标或门牌号" maxlength="500" />
				</view>

				<view class="btn-row">
					<button class="btn-back" @click="step = 0">← 上一步</button>
					<button class="btn-next half" @click="goStep(2)">下一步：状态权属 →</button>
				</view>
			</view>

			<!-- ══════ 步骤 2：状态与权属 ══════ -->
			<view v-if="step === 2" class="section">
				<view class="section-head">
					<view class="section-dot amber"></view>
					<text class="section-title">保存状况与权属</text>
				</view>

				<view class="field-row">
					<view class="field half">
						<text class="label">保存现状</text>
						<picker :range="preservationLabels" :value="preservationIndex" @change="onPreservationChange">
							<view class="picker-view">
								<text class="picker-val">{{ preservationLabels[preservationIndex] }}</text>
								<text class="picker-arrow">›</text>
							</view>
						</picker>
					</view>
					<view class="field half">
						<text class="label">权属</text>
						<picker :range="ownershipLabels" :value="ownershipIndex" @change="onOwnershipChange">
							<view class="picker-view">
								<text class="picker-val">{{ ownershipLabels[ownershipIndex] }}</text>
								<text class="picker-arrow">›</text>
							</view>
						</picker>
					</view>
				</view>

				<view class="field">
					<text class="label">保护级别</text>
					<picker :range="protectionLabels" :value="protectionIndex" @change="onProtectionChange">
						<view class="picker-view">
							<text class="picker-val">{{ protectionLabels[protectionIndex] }}</text>
							<text class="picker-arrow">›</text>
						</view>
					</picker>
				</view>

				<view class="btn-row">
					<button class="btn-back" @click="step = 1">← 上一步</button>
					<button class="btn-next half" @click="goStep(3)">下一步：现场照片 →</button>
				</view>
			</view>

			<!-- ══════ 步骤 3：现场照片 ══════ -->
			<view v-if="step === 3" class="section">
				<view class="section-head">
					<view class="section-dot rose"></view>
					<text class="section-title">现场照片</text>
					<text class="section-hint">最多 10 张，服务端自动加水印</text>
				</view>

				<!-- 照片选择网格 -->
				<view class="photo-grid">
					<view v-for="(p, i) in photos" :key="i" class="photo-thumb">
						<image :src="p.path" mode="aspectFill" class="thumb-img" />
						<view v-if="i === 0" class="cover-badge">封面</view>
						<view class="remove-btn" @click="removePhoto(i)">×</view>
					</view>
					<view v-if="photos.length < 10" class="photo-add" @click="choosePhoto">
						<text class="add-icon">📷</text>
						<text class="add-text">拍照/相册</text>
					</view>
				</view>
				<text class="photo-count">已选 {{ photos.length }} 张</text>

				<view class="tip-box">
					<text class="tip-text">💡 第一张将作为封面图。选择照片后会先在 App 端按巡查上报同款样式合成水印：</text>
					<text class="tip-text">文物名称 · 经纬度(度分秒) · 采集时间 · {{ collectUnit }}</text>
				</view>

				<view class="btn-row">
					<button class="btn-back" @click="step = 2">← 上一步</button>
					<button class="btn-next half" @click="submitAll" :disabled="submitting">
						{{ submitting ? '提交中…' : '提交采集数据 ✓' }}
					</button>
				</view>
			</view>

			<!-- ══════ 步骤 4：提交进度 ══════ -->
			<view v-if="step === 4" class="section">
				<view class="progress-card">
					<view class="progress-icon" :class="submitDone ? 'done' : 'loading'">
						<text v-if="submitDone">✓</text>
						<text v-else class="spin">⟳</text>
					</view>
					<text class="progress-title">{{ submitDone ? '采集成功！' : '正在提交…' }}</text>
					<view v-if="submitDone && generatedSurveyCode" class="survey-code-result">
						<text class="survey-code-label">采集编号</text>
						<text class="survey-code-value">{{ generatedSurveyCode }}</text>
					</view>
					<text class="progress-msg">{{ progressMsg }}</text>

					<!-- 照片上传进度 -->
					<view v-if="photos.length > 0" class="photo-progress">
						<view v-for="(p, i) in photos" :key="i" class="photo-progress-item">
							<view :class="['progress-dot', p.status]"></view>
							<text class="progress-photo-name">照片 {{ i + 1 }}</text>
							<text class="progress-photo-status">{{ photoStatusText(p.status) }}</text>
						</view>
					</view>

					<view v-if="submitDone" class="done-actions">
						<button class="btn-back" @click="resetForm">继续采集</button>
						<button class="btn-next half" @click="goMyRecords">查看我的采集</button>
					</view>
				</view>
			</view>

		</view>

		<!-- 用于水印绘制的离屏 Canvas -->
		<canvas
			canvas-id="watermarkCanvas"
			:width="watermarkCanvas.width"
			:height="watermarkCanvas.height"
			:style="`position:absolute;left:-9999px;top:-9999px;width:${watermarkCanvas.width}px;height:${watermarkCanvas.height}px;pointer-events:none;`"
		></canvas>
	</view>
</template>

<script>
	import config from '../../common/js/config.js';
	import { getToken, getUser } from '../../common/js/auth.js';
	import { addWatermark } from '../../common/js/watermark.js';
	import AltitudeCollect from '../../components/AltitudeCollect.vue';

	const API = config.API_BASE_URL;

	export default {
		components: { AltitudeCollect },
		data() {
			return {
				step: 0,
				steps: ['基础信息', '地理位置', '状态权属', '现场照片'],
				surveyCodeAuto: true,
				submitting: false,
				submitDone: false,
				progressMsg: '',
				generatedSurveyCode: '',
				currentUser: {},

				// 表单数据
				form: {
					survey_code: '',
					name: '',
					former_name: '',
					era: '',
					category: '',
					province: '',
					city: '',
					county: '',
					township: '',
					village: '',
					address: '',
					longitude: '',
					latitude: '',
					altitude: '',
					protection_level: 'DS',
					ownership: 'state',
					preservation_status: '一般',
					description: '',
				},
				errors: {},

				// 定位
				locating: false,
				locationAccuracy: null,

				// 照片列表，每项 { path: String, status: 'pending'|'uploading'|'done'|'error' }
				photos: [],

				// 表单选项（从服务端拉取）
				categoryChoices: [],
				protectionLevelChoices: [],
				ownershipChoices: [],
				preservationStatusChoices: [],
				collectUnit: '文物管理部门',
				watermarkCanvas: {
					width: 1,
					height: 1,
				},
			};
		},

		computed: {
			// ── Picker 选项数组 ──────────────────────────────────
			categoryLabels() {
				return this.categoryChoices.map(c => c.label);
			},
			categoryIndex() {
				const idx = this.categoryChoices.findIndex(c => c.value === this.form.category);
				return idx >= 0 ? idx : 0;
			},

			protectionLabels() {
				return this.protectionLevelChoices.map(c => c.label);
			},
			protectionIndex() {
				const idx = this.protectionLevelChoices.findIndex(c => c.value === this.form.protection_level);
				return idx >= 0 ? idx : 0;
			},

			ownershipLabels() {
				return this.ownershipChoices.map(c => c.label);
			},
			ownershipIndex() {
				const idx = this.ownershipChoices.findIndex(c => c.value === this.form.ownership);
				return idx >= 0 ? idx : 0;
			},

			preservationLabels() {
				return this.preservationStatusChoices.map(c => c.label);
			},
			preservationIndex() {
				const idx = this.preservationStatusChoices.findIndex(c => c.value === this.form.preservation_status);
				return idx >= 0 ? idx : 0;
			},

			// ── GPS 状态 badge ───────────────────────────────────
			gpsBadgeClass() {
				if (this.locating) return 'badge-loading';
				if (this.form.longitude) return 'badge-ok';
				return 'badge-idle';
			},
			gpsBadgeText() {
				if (this.locating) return '定位中…';
				if (this.form.longitude) return `已定位 ±${this.locationAccuracy || '?'}m`;
				return '未定位';
			},
		},

		onLoad() {
			if (!getToken()) {
				uni.reLaunch({ url: '/pages/index/index' });
				return;
			}
			this.currentUser = getUser() || {};
			this.loadFormMeta();
		},

		methods: {
			getWatermarkUserName() {
				return this.currentUser.full_name || this.currentUser.username || '未登录用户';
			},
			buildWatermarkText(time) {
				const collector = this.getWatermarkUserName();
				const name = this.form.name || '未命名文物';
				const longitude = Number(this.form.longitude || 0).toFixed(6);
				const latitude = Number(this.form.latitude || 0).toFixed(6);
				return `采集人: ${collector}\n文物名称: ${name}\n采集时间: ${time}\n坐标: ${longitude}, ${latitude}`;
			},
			cleanText(value) {
				return String(value || '').trim();
			},
			onAltitudeCollectDone(info) {
				if (!info || typeof info !== 'object') return;

				if (info.longitude != null && info.latitude != null) {
					this.form.longitude = Number(info.longitude).toFixed(8);
					this.form.latitude = Number(info.latitude).toFixed(8);
				}
				if (info.accuracy != null) {
					this.locationAccuracy = Math.round(info.accuracy);
				}
			},
			// ── 拉取表单选项 ──────────────────────────────────────
			loadFormMeta() {
				uni.request({
					url: `${API}/api/collect/form-meta`,
					header: { Authorization: `Bearer ${getToken()}` },
					success: (res) => {
						if (res.statusCode === 200) {
							const d = res.data;
							this.categoryChoices = d.category_choices || [];
							this.protectionLevelChoices = d.protection_level_choices || [];
							this.ownershipChoices = d.ownership_choices || [];
							this.preservationStatusChoices = d.preservation_status_choices || [];
							this.collectUnit = d.collect_unit || '文物管理部门';
							// 设置默认值
							if (this.categoryChoices.length) this.form.category = this.categoryChoices[0].value;
							if (this.protectionLevelChoices.length) {
								const ds = this.protectionLevelChoices.find(c => c.value === 'DS');
								if (ds) this.form.protection_level = 'DS';
							}
						}
					},
					fail: () => {
						// 使用内置兜底选项（离线友好）
						this.categoryChoices = [
							{ value: 'GWZ', label: '古文化遗址' },
							{ value: 'GMZ', label: '古墓葬' },
							{ value: 'GJZ', label: '古建筑' },
							{ value: 'SKT', label: '石窟寺及石刻' },
							{ value: 'JDJW', label: '近现代重要史迹及代表性建筑' },
							{ value: 'QT',  label: '其他' },
						];
						this.protectionLevelChoices = [
							{ value: 'GB', label: '全国重点文物保护单位' },
							{ value: 'SB', label: '省（自治区、直辖市）级文物保护单位' },
							{ value: 'XB', label: '市（县）级文物保护单位' },
							{ value: 'DS', label: '尚未定级的不可移动文物' },
						];
						this.ownershipChoices = [
							{ value: 'state', label: '国有' },
							{ value: 'collective', label: '集体' },
							{ value: 'private', label: '私人' },
							{ value: 'other', label: '其他' },
						];
						this.preservationStatusChoices = [
							{ value: '好',   label: '好' },
							{ value: '较好', label: '较好' },
							{ value: '一般', label: '一般' },
							{ value: '较差', label: '较差' },
							{ value: '差',   label: '差' },
						];
					},
				});
			},

			// ── 步骤切换（含验证） ────────────────────────────────
			goStep(target) {
				if (target === 1 && !this.validateStep0()) return;
				if (target === 2 && !this.validateStep1()) return;
				this.step = target;
				// 自动滚动到顶部
				uni.pageScrollTo({ scrollTop: 0, duration: 100 });
			},

			validateStep0() {
				const e = {};
				// 手动模式才校验编号非空
				if (!this.surveyCodeAuto && !this.cleanText(this.form.survey_code)) e.survey_code = '请填写普查编号或切换为自动生成';
				if (!this.cleanText(this.form.name))        e.name = '文物名称不能为空';
				if (!this.cleanText(this.form.era))         e.era = '时代不能为空';
				if (!this.form.category)    e.category = '请选择文物类别';
				this.errors = e;
				return Object.keys(e).length === 0;
			},

			validateStep1() {
				const e = {};
				if (!this.form.longitude || !this.form.latitude) {
					e.location = '请先点击"获取当前位置"以获取经纬度';
				}
				this.errors = e;
				return Object.keys(e).length === 0;
			},

			// ── GPS 定位 ──────────────────────────────────────────
			async getLocation() {
				this.locating = true;
				this.errors = {};
				try {
					const res = await new Promise((resolve, reject) => {
						uni.getLocation({
							type: 'wgs84',
							isHighAccuracy: true,
							highAccuracyExpireTime: 15000,
							success: (data) => resolve(data),
							fail: (err) => reject(err),
						});
					});

					this.form.longitude = Number(res.longitude).toFixed(8);
					this.form.latitude = Number(res.latitude).toFixed(8);
					this.locationAccuracy = res.accuracy != null ? Math.round(res.accuracy) : null;
					uni.showToast({ title: 'GPS 定位成功', icon: 'success', duration: 2000 });
				} catch (err) {
					const errMsg = String(err?.errMsg || '').toLowerCase();
					let hint = '获取位置失败，请重试';
					if (errMsg.includes('auth denied') || errMsg.includes('denied') || errMsg.includes('permission')) {
						hint = '定位权限被拒绝，请在手机设置中开启';
					} else if (errMsg.includes('timeout')) {
						hint = 'GPS 信号超时，请移至开阔区域重试';
					}
					this.errors = { location: hint };
					uni.showToast({ title: hint, icon: 'none', duration: 3000 });
				} finally {
					this.locating = false;
				}
			},

			// ── Picker 事件 ──────────────────────────────────────
			onCategoryChange(e) {
				this.form.category = this.categoryChoices[e.detail.value].value;
			},
			onProtectionChange(e) {
				this.form.protection_level = this.protectionLevelChoices[e.detail.value].value;
			},
			onOwnershipChange(e) {
				this.form.ownership = this.ownershipChoices[e.detail.value].value;
			},
			onPreservationChange(e) {
				this.form.preservation_status = this.preservationStatusChoices[e.detail.value].value;
			},

			// ── 照片选择 ─────────────────────────────────────────
			async choosePhoto() {
				const remaining = 10 - this.photos.length;
				uni.chooseImage({
					count: remaining,
					sizeType: ['compressed'],           // 压缩图（减少流量）
					sourceType: ['camera', 'album'],    // 摄像头优先 + 相册
					success: async (res) => {
						const now = new Date();
						const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
						const watermarkText = this.buildWatermarkText(time);
						for (const path of res.tempFilePaths) {
							try {
								const watermarkedPath = await addWatermark(path, watermarkText, this);
								this.photos.push({ path: watermarkedPath, status: 'pending' });
							} catch (error) {
								this.photos.push({ path, status: 'pending' });
							}
						}
					},
				});
			},

			removePhoto(idx) {
				this.photos.splice(idx, 1);
			},

			photoStatusText(status) {
				return { pending: '待上传', uploading: '上传中…', done: '✓ 完成', error: '✗ 失败' }[status] || '';
			},

			// ── 全流程提交 ───────────────────────────────────────
			async submitAll() {
				this.submitting = true;
				this.step = 4;
				this.progressMsg = '正在创建文物记录…';

				// 步骤 A：创建文字记录
				let heritageId = null;
				try {
					const result = await this.createHeritage();
					heritageId = result.heritage_id;
					// 展示服务端最终分配的采集编号（自动或手动）
					this.generatedSurveyCode = result.survey_code || '';
				} catch (err) {
					this.progressMsg = `记录创建失败：${err}`;
					this.submitting = false;
					return;
				}

				// 步骤 B：逐张上传照片（串行，确保封面是第 0 张）
				let successCount = 0;
				for (let i = 0; i < this.photos.length; i++) {
					this.progressMsg = `正在上传第 ${i + 1} / ${this.photos.length} 张照片…`;
					this.photos[i].status = 'uploading';
					try {
						await this.uploadPhoto(heritageId, this.photos[i].path, i === 0);
						this.photos[i].status = 'done';
						successCount++;
					} catch {
						this.photos[i].status = 'error';
					}
				}

				this.submitDone = true;
				this.submitting = false;
				const photoHint = this.photos.length > 0
					? `，成功上传 ${successCount}/${this.photos.length} 张照片`
					: '';
				this.progressMsg = `文物「${this.form.name}」已登记${photoHint}。`;
			},

			// 创建文物记录 → 返回 heritage_id (Promise)
			// 创建文物记录 → 返回 { heritage_id, survey_code } (Promise)
			createHeritage() {
				return new Promise((resolve, reject) => {
					uni.request({
						url: `${API}/api/collect/create`,
						method: 'POST',
						header: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${getToken()}`,
						},
						data: {
							// 自动模式传空字符串，服务端自动生成；手动模式传用户填写值
							survey_code: this.surveyCodeAuto ? '' : this.cleanText(this.form.survey_code),
							name:                this.cleanText(this.form.name),
							former_name:         this.cleanText(this.form.former_name),
							era:                 this.cleanText(this.form.era),
							category:            this.form.category,
							province:            this.cleanText(this.form.province),
							city:                this.cleanText(this.form.city),
							county:              this.cleanText(this.form.county),
							township:            this.cleanText(this.form.township),
							village:             this.cleanText(this.form.village),
							address:             this.cleanText(this.form.address),
							longitude:           parseFloat(this.form.longitude),
							latitude:            parseFloat(this.form.latitude),
							altitude:            this.form.altitude ? parseFloat(this.form.altitude) : null,
							protection_level:    this.form.protection_level,
							ownership:           this.form.ownership,
							preservation_status: this.form.preservation_status,
							description:         this.cleanText(this.form.description),
						},
						success: (res) => {
							if (res.statusCode === 201) {
								resolve({ heritage_id: res.data.heritage_id, survey_code: res.data.survey_code });
							} else {
								const detail = res.data?.detail || res.data?.message || '未知错误';
								reject(detail);
							}
						},
						fail: (err) => reject(err.errMsg || '网络异常'),
					});
				});
			},

			// 上传单张照片（含水印由服务端处理）→ Promise
			uploadPhoto(heritageId, filePath, isCover) {
				return new Promise((resolve, reject) => {
					uni.uploadFile({
						url: `${API}/api/collect/photos/${heritageId}`,
						filePath,
						name: 'photo',
						formData: {
							photo_type: isCover ? 'overview' : 'detail',
							is_cover:   isCover ? 'true' : 'false',
						},
						header: { Authorization: `Bearer ${getToken()}` },
						success: (res) => {
							// uploadFile 的 data 是字符串，需要 JSON.parse
							try {
								const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
								if (res.statusCode === 201) resolve(data);
								else reject(data?.detail || '上传失败');
							} catch {
								if (res.statusCode === 201) resolve({});
								else reject('响应解析失败');
							}
						},
						fail: (err) => reject(err.errMsg || '网络异常'),
					});
				});
			},

			// ── 重置表单（继续采集） ─────────────────────────────
			resetForm() {
				// 保留行政区划等固定信息，其余清空
				const keep = {
					province: this.form.province,
					city:     this.form.city,
					county:   this.form.county,
					protection_level:    this.form.protection_level,
					ownership:           this.form.ownership,
					preservation_status: this.form.preservation_status,
				};
				this.form = Object.assign({
					survey_code: '', name: '', former_name: '', era: '',
					category: this.categoryChoices[0]?.value || '',
					township: '', village: '', address: '',
					longitude: '', latitude: '', altitude: '',
					description: '',
				}, keep);
				this.photos = [];
				this.errors = {};
				this.step = 0;
				this.submitDone = false;
				this.progressMsg = '';
				this.generatedSurveyCode = '';
				this.locationAccuracy = null;
				this.surveyCodeAuto = true;
			},

			goMyRecords() {
				uni.navigateTo({ url: '/pages/collect/my_records' });
			},
		},
	};
</script>

<style scoped>
/* ── 全页 ── */
.page {
	background: #f0f4f8;
	min-height: 100vh;
	padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
	padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
	box-sizing: border-box;
}
.form-scroll {
	box-sizing: border-box;
	padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
	padding-bottom: calc(32rpx + constant(safe-area-inset-bottom));
}

/* ── 步骤条 ── */
.steps-bar {
	display: flex; align-items: center; justify-content: center;
	gap: 8rpx;
	padding: 20rpx 24rpx 0; background: #fff;
	border-bottom: 1px solid #e2e8f0;
	overflow-x: auto;
	white-space: nowrap;
}
.step-item {
	display: flex;
	align-items: center;
	flex: 1;
	flex-direction: column;
	position: relative;
	min-width: 120rpx;
}
.step-dot {
	width: 48rpx; height: 48rpx; border-radius: 50%; display: flex;
	align-items: center; justify-content: center;
	background: #e2e8f0; color: #94a3b8; font-size: 22rpx; font-weight: 700;
}
.step-dot.active { background: #3b82f6; color: #fff; }
.step-dot.done   { background: #22c55e; color: #fff; }
.step-check, .step-num { font-size: 22rpx; }
.step-label { font-size: 20rpx; color: #94a3b8; margin-top: 6rpx; }
.step-label-active { color: #3b82f6; font-weight: 600; }
.step-line {
	position: absolute; top: 24rpx; left: calc(50% + 24rpx);
	width: calc(100% - 48rpx); height: 2rpx; background: #e2e8f0;
}
.step-line.done { background: #22c55e; }

/* ── 区块 ── */
.section {
	margin: 24rpx;
	background: #fff;
	border-radius: 24rpx;
	padding: 32rpx;
	/* Avoid transformed ancestor on app webview to keep input hit-testing stable. */
	animation: none !important;
	transform: none !important;
}
.section-head { display: flex; align-items: center; margin-bottom: 28rpx; }
.section-dot { width: 8rpx; height: 36rpx; border-radius: 4rpx; margin-right: 16rpx; }
.section-dot.blue  { background: #3b82f6; }
.section-dot.green { background: #22c55e; }
.section-dot.amber { background: #f59e0b; }
.section-dot.rose  { background: #f43f5e; }
.section-title { font-size: 30rpx; font-weight: 700; color: #1e293b; flex: 1; }
.section-hint { font-size: 22rpx; color: #94a3b8; }

/* ── 字段 ── */
.field { margin-bottom: 24rpx; }
.field-row {
	display: flex;
	gap: 16rpx;
	margin-bottom: 24rpx;
	align-items: flex-start;
}
.half { flex: 1; }
.third { flex: 1; }
.half,
.third {
	min-width: 0;
}
.label {
	display: block; font-size: 26rpx; color: #475569;
	margin-bottom: 8rpx; font-weight: 500;
}
.label.required::after { content: ' *'; color: #ef4444; }
.input {
	width: 100%; border: 2rpx solid #e2e8f0; border-radius: 16rpx;
	padding: 18rpx 24rpx; font-size: 28rpx; color: #1e293b;
	background: #f8fafc; box-sizing: border-box;
	min-height: 84rpx;
}
.textarea {
	width: 100%; border: 2rpx solid #e2e8f0; border-radius: 16rpx;
	padding: 18rpx 24rpx; font-size: 28rpx; color: #1e293b;
	background: #f8fafc; min-height: 160rpx; box-sizing: border-box;
}

.field .input,
.field .textarea {
	position: relative;
	z-index: 2;
}
.err { font-size: 22rpx; color: #ef4444; margin-top: 6rpx; }

/* ── Picker ── */
.picker-view {
	display: flex; align-items: center; justify-content: space-between;
	border: 2rpx solid #e2e8f0; border-radius: 16rpx; padding: 18rpx 24rpx;
	background: #f8fafc;
	min-height: 84rpx;
	box-sizing: border-box;
}
.picker-val  { font-size: 28rpx; color: #1e293b; }
.picker-ph   { font-size: 28rpx; color: #94a3b8; }
.picker-arrow { font-size: 36rpx; color: #94a3b8; transform: rotate(90deg); }

/* ── GPS 卡片 ── */
.gps-card { background: #f0fdf4; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.gps-row { display: flex; align-items: center; gap: 20rpx; }
.btn-gps {
	display: flex; align-items: center; gap: 8rpx;
	background: #16a34a; color: #fff; border: none; border-radius: 16rpx;
	padding: 16rpx 28rpx; font-size: 28rpx; font-weight: 500;
}
.btn-gps.loading { background: #86efac; }
.gps-icon { font-size: 32rpx; }
.gps-badge { padding: 6rpx 18rpx; border-radius: 999rpx; font-size: 22rpx; font-weight: 500; }
.badge-idle    { background: #f1f5f9; color: #64748b; }
.badge-loading { background: #fef9c3; color: #854d0e; }
.badge-ok      { background: #dcfce7; color: #166534; }
.coord-display { display: flex; flex-wrap: wrap; gap: 16rpx; margin-top: 20rpx; }
.coord-item { background: #fff; border-radius: 12rpx; padding: 12rpx 20rpx; }
.coord-label { font-size: 22rpx; color: #64748b; display: block; }
.coord-val   { font-size: 26rpx; color: #065f46; font-family: monospace; display: block; margin-top: 2rpx; }

/* ── 照片网格 ── */
.photo-grid { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 16rpx; }
.photo-thumb {
	position: relative;
	width: calc((100% - 32rpx) / 3);
	height: 180rpx;
	border-radius: 16rpx;
	overflow: hidden;
}
.thumb-img   { width: 100%; height: 100%; }
.cover-badge {
	position: absolute; bottom: 0; left: 0; right: 0;
	background: rgba(0,0,0,.45); color: #fff; text-align: center;
	font-size: 20rpx; padding: 4rpx 0;
}
.remove-btn {
	position: absolute; top: 4rpx; right: 4rpx;
	background: rgba(0,0,0,.5); color: #fff; border-radius: 50%;
	width: 40rpx; height: 40rpx; text-align: center; line-height: 40rpx;
	font-size: 28rpx;
}
.photo-add {
	width: calc((100% - 32rpx) / 3); height: 180rpx; border-radius: 16rpx;
	border: 3rpx dashed #cbd5e1; background: #f8fafc;
	display: flex; flex-direction: column; align-items: center; justify-content: center;
	color: #94a3b8; gap: 8rpx;
	box-sizing: border-box;
}
.add-icon { font-size: 48rpx; }
.add-text  { font-size: 24rpx; }
.photo-count { font-size: 24rpx; color: #94a3b8; margin-bottom: 16rpx; }

/* ── 提示框 ── */
.tip-box { background: #eff6ff; border-radius: 12rpx; padding: 20rpx 24rpx; margin-bottom: 16rpx; }
.tip-text { font-size: 24rpx; color: #3b82f6; display: block; line-height: 1.7; }

/* ── 按钮 ── */
.btn-next {
	width: 100%; background: #2563eb; color: #fff; border: none;
	border-radius: 16rpx; padding: 28rpx 0; font-size: 30rpx; font-weight: 600;
	margin-top: 8rpx;
	min-height: 96rpx;
}
.btn-next[disabled], .btn-next:disabled { background: #93c5fd; }
.btn-row { display: flex; gap: 16rpx; margin-top: 8rpx; }
.btn-back {
	flex: 1; background: #f1f5f9; color: #475569; border: none;
	border-radius: 16rpx; padding: 28rpx 0; font-size: 28rpx; font-weight: 500;
	min-height: 96rpx;
}
.btn-next.half { flex: 2; }

/* ── 提交进度 ── */
.progress-card { text-align: center; padding: 40rpx 0; }
.progress-icon {
	width: 120rpx; height: 120rpx; border-radius: 50%; margin: 0 auto 24rpx;
	display: flex; align-items: center; justify-content: center; font-size: 60rpx;
}
.progress-icon.done    { background: #dcfce7; color: #16a34a; }
.progress-icon.loading { background: #dbeafe; color: #2563eb; }
.spin { display: inline-block; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.progress-title { font-size: 36rpx; font-weight: 700; color: #1e293b; margin-bottom: 12rpx; display: block; }
.progress-msg   { font-size: 26rpx; color: #64748b; display: block; margin-bottom: 32rpx; line-height: 1.6; }
.photo-progress { text-align: left; margin: 24rpx 0; }
.photo-progress-item { display: flex; align-items: center; gap: 16rpx; padding: 12rpx 0; border-bottom: 1px solid #f1f5f9; }
.progress-dot { width: 20rpx; height: 20rpx; border-radius: 50%; background: #e2e8f0; }
.progress-dot.pending   { background: #cbd5e1; }
.progress-dot.uploading { background: #fbbf24; }
.progress-dot.done      { background: #22c55e; }
.progress-dot.error     { background: #ef4444; }
.progress-photo-name   { font-size: 26rpx; color: #475569; flex: 1; }
.progress-photo-status { font-size: 24rpx; color: #64748b; }
.done-actions { display: flex; gap: 16rpx; margin-top: 32rpx; }

/* ── 普查编号自动生成控件 ── */
.code-label-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14rpx;
	flex-wrap: wrap;
	gap: 8rpx;
}
.code-toggle-row {
	display: flex;
	border: 2rpx solid #e2e8f0;
	border-radius: 12rpx;
	overflow: hidden;
}
.toggle-btn {
	padding: 8rpx 24rpx;
	font-size: 24rpx;
	color: #64748b;
	background: #f8fafc;
	line-height: 1.6;
}
.toggle-btn.toggle-active {
	background: #2563eb;
	color: #fff;
	font-weight: 600;
}
.code-auto-hint {
	display: flex;
	align-items: flex-start;
	gap: 10rpx;
	background: #eff6ff;
	border-radius: 14rpx;
	padding: 16rpx 20rpx;
}
.code-auto-icon { font-size: 28rpx; flex-shrink: 0; }
.code-auto-text { font-size: 24rpx; color: #3b82f6; flex: 1; line-height: 1.6; }

/* ── 成功页采集编号展示 ── */
.survey-code-result {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16rpx;
	background: #f0fdf4;
	border-radius: 16rpx;
	padding: 20rpx 32rpx;
	margin: 0 0 20rpx;
}
.survey-code-label { font-size: 24rpx; color: #166534; }
.survey-code-value { font-size: 34rpx; font-weight: 700; color: #15803d; font-family: monospace; letter-spacing: 2rpx; }

/* ── 海拔标签提示 ── */
.label-hint { font-size: 20rpx; color: #22c55e; font-weight: 400; margin-left: 8rpx; }
@media screen and (max-width: 430px) {
	.page {
		padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(16rpx + constant(safe-area-inset-bottom));
	}
	.form-scroll {
		padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
	}
	.steps-bar {
		justify-content: flex-start;
		padding: 16rpx 16rpx 0;
	}
	.step-item {
		flex: 0 0 116rpx;
		min-width: 116rpx;
	}
	.step-label {
		font-size: 18rpx;
	}
	.section {
		margin: 16rpx;
		padding: 24rpx;
		border-radius: 20rpx;
	}
	.section-title {
		font-size: 28rpx;
	}
	.section-hint {
		font-size: 20rpx;
	}
	.field-row,
	.btn-row,
	.done-actions {
		flex-direction: column;
		gap: 12rpx;
	}
	.half,
	.third,
	.btn-back,
	.btn-next.half {
		flex: 1 1 auto;
		width: 100%;
	}
	.label {
		font-size: 24rpx;
	}
	.input,
	.textarea,
	.picker-view {
		font-size: 26rpx;
	}
	.textarea {
		min-height: 180rpx;
	}
	.photo-thumb,
	.photo-add {
		width: calc((100% - 16rpx) / 2);
		height: 176rpx;
	}
	.add-icon {
		font-size: 44rpx;
	}
	.photo-count,
	.tip-text,
	.progress-photo-status {
		font-size: 22rpx;
	}
}

@media screen and (max-width: 360px) {
	.step-item {
		flex-basis: 104rpx;
		min-width: 104rpx;
	}
	.step-dot {
		width: 42rpx;
		height: 42rpx;
	}
	.step-line {
		top: 21rpx;
		left: calc(50% + 21rpx);
		width: calc(100% - 42rpx);
	}
	.section {
		padding: 20rpx;
	}
	.photo-thumb,
	.photo-add {
		height: 160rpx;
	}
}
</style>
