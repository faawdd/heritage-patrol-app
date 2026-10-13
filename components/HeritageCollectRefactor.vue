<template>
  <view class="wizard-page">
    <view class="wizard-header">
      <view class="header-top">
        <text class="page-title">不可移动文物现场数据采集</text>
        <text class="page-subtitle">横向流程式录入</text>
      </view>
      <view class="stepper-wrap">
        <view v-for="(step, idx) in stepDefs" :key="step.key" class="stepper-item">
          <view class="stepper-node" :class="stepNodeClass(idx)">
            <text class="stepper-node-text">{{ currentStep > idx ? '✓' : idx + 1 }}</text>
          </view>
          <text class="stepper-label" :class="{ active: currentStep === idx }">{{ step.label }}</text>
          <view v-if="idx < stepDefs.length - 1" class="stepper-line" :class="{ done: currentStep > idx }"></view>
        </view>
      </view>
    </view>

    <view class="wizard-content">
      <view v-if="currentStep === 0" class="step-panel">
        <view class="card step-card">
          <view class="card-head">
            <text class="card-title">第一步：基础地理</text>
            <text class="card-tag">信息校核</text>
          </view>

          <view class="strategy-card">
            <view class="strategy-head">
              <text class="strategy-title">全局采集策略</text>
            </view>
            <radio-group class="strategy-group" @change="onModeChange">
              <label class="strategy-item">
                <radio value="dem" :checked="altitudeMode === 'dem'" color="#1E5AA8" />
                <view class="strategy-copy">
                  <text class="strategy-copy-title">DEM 优先模式（推荐）</text>
                  <text class="strategy-copy-desc">优先后端 DEM 反查，弱网时自动降级硬件海拔</text>
                </view>
              </label>
              <label class="strategy-item">
                <radio value="hardware" :checked="altitudeMode === 'hardware'" color="#1E5AA8" />
                <view class="strategy-copy">
                  <text class="strategy-copy-title">硬件优先模式</text>
                  <text class="strategy-copy-desc">跳过 DEM 请求，直接使用手机硬件高程</text>
                </view>
              </label>
            </radio-group>
          </view>

          <view class="form-row">
            <text class="row-label required">文物名称</text>
            <input class="row-input" v-model="form.name" placeholder="请输入文物名称" maxlength="200" />
          </view>

          <view class="form-row">
            <text class="row-label">曾用名</text>
            <input class="row-input" v-model="form.former_name" placeholder="选填" maxlength="200" />
          </view>

          <view class="form-row">
            <text class="row-label">编号模式</text>
            <view class="mode-switch">
              <view class="mode-item" :class="{ active: form.surveyCodeAuto }" @click="form.surveyCodeAuto = true">自动</view>
              <view class="mode-item" :class="{ active: !form.surveyCodeAuto }" @click="form.surveyCodeAuto = false">手动</view>
            </view>
          </view>

          <view v-if="!form.surveyCodeAuto" class="form-row">
            <text class="row-label required">普查编号</text>
            <input class="row-input" v-model="form.code" placeholder="请输入普查编号" maxlength="50" />
          </view>

          <view class="form-row">
            <text class="row-label required">时代</text>
            <input class="row-input" v-model="form.era" placeholder="如：汉、唐宋" maxlength="100" />
          </view>

          <view class="form-row">
            <text class="row-label required">文物类别</text>
            <picker class="picker-wrap" :range="categoryLabels" :value="categoryIndex" @change="onCategoryChange">
              <view class="picker-value">{{ categoryText }}</view>
            </picker>
          </view>

          <view class="form-row">
            <text class="row-label required">经度</text>
            <input class="row-input" v-model="form.longitude" type="digit" placeholder="自动采集或手动填写" />
          </view>

          <view class="form-row">
            <text class="row-label required">纬度</text>
            <input class="row-input" v-model="form.latitude" type="digit" placeholder="自动采集或手动填写" />
          </view>

          <view class="form-row row-altitude">
            <text class="row-label required">海拔</text>
            <view class="altitude-cell">
              <input class="row-input altitude-input" v-model="form.altitude" type="digit" placeholder="自动采集或手动填写" />
              <view class="alt-badge" :class="badgeClassMap[altitudeSource]">
                <text class="alt-badge-text">{{ altitudeSourceLabel }}</text>
              </view>
            </view>
          </view>

          <view class="form-row">
            <text class="row-label">省/自治区</text>
            <picker class="picker-wrap" :range="provinceOptions" :value="provinceIndex" @change="onProvinceChange">
              <view class="picker-value">{{ form.province || '请选择' }}</view>
            </picker>
          </view>

          <view class="form-row">
            <text class="row-label">市/州</text>
            <picker class="picker-wrap" :range="cityOptions" :value="cityIndex" @change="onCityChange">
              <view class="picker-value">{{ form.city || '请选择' }}</view>
            </picker>
          </view>

          <view class="form-row">
            <text class="row-label">县/区</text>
            <picker class="picker-wrap" :range="countyOptions" :value="countyIndex" @change="onCountyChange">
              <view class="picker-value">{{ form.county || '请选择' }}</view>
            </picker>
          </view>

          <view class="form-row">
            <text class="row-label">乡镇/街道</text>
            <input class="row-input" v-model="form.township" placeholder="选填" maxlength="50" />
          </view>

          <view class="form-row">
            <text class="row-label">村/社区</text>
            <input class="row-input" v-model="form.village" placeholder="选填" maxlength="50" />
          </view>

          <view class="form-row">
            <text class="row-label">详细地址</text>
            <input class="row-input" v-model="form.address" placeholder="选填" maxlength="500" />
          </view>

          <view class="btn-group-compact">
            <button class="btn-secondary" @click="handleCollectCoordinate">采集坐标</button>
            <button class="btn-secondary" @click="handleCollectAltitude">采集海拔</button>
          </view>
        </view>
      </view>

      <view v-if="currentStep === 1" class="step-panel">
        <view class="card step-card step2-focus">
          <view class="card-head">
            <text class="card-title">第二步：多点坐标</text>
            <text class="card-tag warm">高频核心操作区</text>
          </view>
          <view class="focus-tip">
            <text class="focus-tip-text">围绕遗址走动采集时，请优先使用“新增定位点”和“实时定位”完成边界点/标志点录入。</text>
          </view>
          <CoordinateCollectCard
            ref="coordRef"
            v-model="coordList"
            :heritage-name="form.name"
            :capture-point-data="capturePointData"
          />
          <view class="step2-meta">
            <text class="step2-meta-text">当前边界点：{{ boundaryPointCount }} 个（至少 3 个）</text>
          </view>
        </view>
      </view>

      <view v-if="currentStep === 2" class="step-panel">
        <view class="card step-card">
          <view class="card-head">
            <text class="card-title">第三步：多媒体/审核</text>
            <text class="card-tag">提交前复核</text>
          </view>

          <view class="form-row column-row">
            <view class="column-head">
              <text class="row-label required">现场照片</text>
              <text class="column-meta">最多 10 张</text>
            </view>
            <view class="photo-grid">
              <view v-for="(item, idx) in photos" :key="item.id" class="photo-item">
                <image :src="item.path" class="photo-img" mode="aspectFill" />
                <view class="photo-remove" @click="removePhoto(idx)">
                  <text class="photo-remove-text">删</text>
                </view>
              </view>
              <view v-if="photos.length < 10" class="photo-add" @click="pickPhoto">
                <text class="photo-add-text">添加照片</text>
              </view>
            </view>
          </view>

          <view class="form-row">
            <text class="row-label">保护级别</text>
            <picker class="picker-wrap" :range="protectionLabels" :value="protectionIndex" @change="onProtectionChange">
              <view class="picker-value">{{ protectionText }}</view>
            </picker>
          </view>

          <view class="form-row">
            <text class="row-label">权属</text>
            <picker class="picker-wrap" :range="ownershipLabels" :value="ownershipIndex" @change="onOwnershipChange">
              <view class="picker-value">{{ ownershipText }}</view>
            </picker>
          </view>

          <view class="form-row">
            <text class="row-label">保存现状</text>
            <picker class="picker-wrap" :range="preservationLabels" :value="preservationIndex" @change="onPreservationChange">
              <view class="picker-value">{{ preservationText }}</view>
            </picker>
          </view>

          <view class="form-row">
            <text class="row-label required">普查员签名</text>
            <button class="btn-secondary single-btn" @click="collectSignature">采集签名</button>
          </view>
          <view v-if="signStatus" class="inline-hint">
            <text class="inline-hint-text">{{ signStatus }}</text>
          </view>

          <view class="form-row column-row">
            <view class="column-head">
              <text class="row-label">现场备注</text>
              <text class="column-meta">限 2000 字</text>
            </view>
            <textarea
              class="remark-input"
              v-model="form.remark"
              maxlength="2000"
              placeholder="请填写现场情况、病害信息、交通与环境说明"
            />
          </view>
        </view>
      </view>
    </view>

    <view class="wizard-footer">
      <view v-if="currentStep === 0" class="footer-row single">
        <button class="btn-flow btn-flow-primary btn-flow-wide" @click="goStep1ToStep2">下一步：采集坐标</button>
      </view>

      <view v-if="currentStep === 1" class="footer-row split">
        <button class="btn-flow btn-flow-ghost left" @click="goPrevStep">返回上一步</button>
        <button class="btn-flow btn-flow-primary right" @click="goStep2ToStep3">下一步：多媒体/审核</button>
      </view>

      <view v-if="currentStep === 2" class="footer-row split">
        <button class="btn-flow btn-flow-ghost left" @click="goPrevStep">返回上一步</button>
        <button class="btn-flow btn-flow-submit right" :disabled="loading" @click="handleSubmit">
          {{ loading ? '提交中...' : '完成并提交数据' }}
        </button>
      </view>
    </view>

    <canvas
      canvas-id="watermarkCanvas"
      :width="watermarkCanvas.width"
      :height="watermarkCanvas.height"
      :style="`position:absolute;left:-9999px;top:-9999px;width:${watermarkCanvas.width}px;height:${watermarkCanvas.height}px;pointer-events:none;`"
    ></canvas>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, reactive, ref, watch } from 'vue';
import config from '../common/js/config.js';
import { CHINA_REGION_TREE, DEFAULT_REGION } from '../common/js/china_regions.js';
import { addWatermark } from '../common/js/watermark.js';
import { getUser } from '../common/js/auth.js';
import CoordinateCollectCard from './CoordinateCollectCard.vue';

const DEM_TIMEOUT_MS = 15000;
const ALTITUDE_MIN_M = -500;
const ALTITUDE_MAX_M = 9000;
const ALTITUDE_ZERO_EPS = 0.01;
const GPS_TIMEOUT_MS = 12000;

const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  meta: {
    type: Object,
    default: () => ({
      categoryChoices: [],
      protectionLevelChoices: [],
      ownershipChoices: [],
      preservationStatusChoices: [],
    }),
  },
});

const emitting = defineEmits(['submit']);
const currentStep = ref(0);

const stepDefs = [
  { key: 'step1', label: '第一步：基础地理' },
  { key: 'step2', label: '第二步：多点坐标' },
  { key: 'step3', label: '第三步：多媒体/审核' },
];

function stepNodeClass(idx) {
  if (currentStep.value === idx) return 'active';
  if (currentStep.value > idx) return 'done';
  return 'pending';
}
const altitudeMode = ref('dem');
const photos = ref([]);
const signStatus = ref('');
const watermarkCanvas = reactive({ width: 1, height: 1 });
const coordRef = ref(null);
const coordList = ref([]);
const instance = getCurrentInstance();
if (instance && instance.proxy) {
  instance.proxy.watermarkCanvas = watermarkCanvas;
}

const form = reactive({
  surveyCodeAuto: true,
  name: '',
  former_name: '',
  code: '',
  era: '',
  category: '',
  longitude: '',
  latitude: '',
  altitude: '',
  province: '',
  city: '',
  county: '',
  township: '',
  village: '',
  address: '',
  protection_level: '',
  ownership: '',
  preservation_status: '',
  remark: '',
});

watch(
  () => props.meta,
  (meta) => {
    const c = meta?.categoryChoices || [];
    const p = meta?.protectionLevelChoices || [];
    const o = meta?.ownershipChoices || [];
    const s = meta?.preservationStatusChoices || [];

    if (!form.category && c.length) form.category = c[0].value;
    if (!form.protection_level && p.length) {
      const ds = p.find((item) => item.value === 'DS');
      form.protection_level = ds ? ds.value : p[0].value;
    }
    if (!form.ownership && o.length) form.ownership = o[0].value;
    if (!form.preservation_status && s.length) form.preservation_status = s[0].value;
  },
  { immediate: true, deep: true }
);

const altitudeSource = ref('manual');
const badgeClassMap = {
  dem: 'badge-dem',
  hardware: 'badge-hardware',
  manual: 'badge-manual',
  alert: 'badge-alert',
};

const categoryLabels = computed(() => (props.meta?.categoryChoices || []).map((item) => item.label));
const protectionLabels = computed(() => (props.meta?.protectionLevelChoices || []).map((item) => item.label));
const ownershipLabels = computed(() => (props.meta?.ownershipChoices || []).map((item) => item.label));
const preservationLabels = computed(() => (props.meta?.preservationStatusChoices || []).map((item) => item.label));

const categoryIndex = computed(() => {
  const idx = (props.meta?.categoryChoices || []).findIndex((item) => item.value === form.category);
  return idx >= 0 ? idx : 0;
});
const protectionIndex = computed(() => {
  const idx = (props.meta?.protectionLevelChoices || []).findIndex((item) => item.value === form.protection_level);
  return idx >= 0 ? idx : 0;
});
const ownershipIndex = computed(() => {
  const idx = (props.meta?.ownershipChoices || []).findIndex((item) => item.value === form.ownership);
  return idx >= 0 ? idx : 0;
});
const preservationIndex = computed(() => {
  const idx = (props.meta?.preservationStatusChoices || []).findIndex((item) => item.value === form.preservation_status);
  return idx >= 0 ? idx : 0;
});

const categoryText = computed(() => categoryLabels.value[categoryIndex.value] || '请选择');
const protectionText = computed(() => protectionLabels.value[protectionIndex.value] || '请选择');
const ownershipText = computed(() => ownershipLabels.value[ownershipIndex.value] || '请选择');
const preservationText = computed(() => preservationLabels.value[preservationIndex.value] || '请选择');

const provinceOptions = computed(() => CHINA_REGION_TREE.map((item) => item.name));
const cityOptions = computed(() => {
  const province = CHINA_REGION_TREE.find((item) => item.name === form.province);
  return province ? province.cities.map((item) => item.name) : [];
});
const countyOptions = computed(() => {
  const province = CHINA_REGION_TREE.find((item) => item.name === form.province);
  if (!province) return [];
  const city = province.cities.find((item) => item.name === form.city);
  return city ? city.counties : [];
});

const provinceIndex = computed(() => {
  const idx = provinceOptions.value.findIndex((item) => item === form.province);
  return idx >= 0 ? idx : 0;
});
const cityIndex = computed(() => {
  const idx = cityOptions.value.findIndex((item) => item === form.city);
  return idx >= 0 ? idx : 0;
});
const countyIndex = computed(() => {
  const idx = countyOptions.value.findIndex((item) => item === form.county);
  return idx >= 0 ? idx : 0;
});

const altitudeSourceLabel = computed(() => {
  if (altitudeSource.value === 'dem') return '🟢 DEM国家高程校准';
  if (altitudeSource.value === 'hardware') return '🟢 手机硬件直出';
  if (altitudeSource.value === 'manual') return '灰色 手动录入';
  return '🔴 信号断绝，请手动录入';
});

const boundaryPointCount = computed(() => {
  return (coordList.value || []).filter((item) => item?.type === 'boundary').length;
});

function goPrevStep() {
  currentStep.value = Math.max(0, currentStep.value - 1);
}

function goStep1ToStep2() {
  currentStep.value = 1;
}

function goStep2ToStep3() {
  if (boundaryPointCount.value < 3) {
    uni.showToast({ title: '边界点不足3个，无法进入下一步', icon: 'none' });
    return;
  }
  const coordCheck = coordRef.value?.validateBeforeSubmit?.();
  if (coordCheck && !coordCheck.ok) {
    uni.showToast({ title: coordCheck.message || '坐标采集校验未通过', icon: 'none' });
    return;
  }
  currentStep.value = 2;
}

function onModeChange(e) {
  const v = e?.detail?.value;
  altitudeMode.value = v === 'hardware' ? 'hardware' : 'dem';
}

function onCategoryChange(e) {
  const idx = Number(e?.detail?.value || 0);
  const target = props.meta?.categoryChoices?.[idx];
  if (target) form.category = target.value;
}
function onProtectionChange(e) {
  const idx = Number(e?.detail?.value || 0);
  const target = props.meta?.protectionLevelChoices?.[idx];
  if (target) form.protection_level = target.value;
}
function onOwnershipChange(e) {
  const idx = Number(e?.detail?.value || 0);
  const target = props.meta?.ownershipChoices?.[idx];
  if (target) form.ownership = target.value;
}
function onPreservationChange(e) {
  const idx = Number(e?.detail?.value || 0);
  const target = props.meta?.preservationStatusChoices?.[idx];
  if (target) form.preservation_status = target.value;
}

function ensureRegionChain() {
  const province = CHINA_REGION_TREE.find((item) => item.name === form.province) || CHINA_REGION_TREE[0];
  if (!province) return;
  form.province = province.name;

  const city = province.cities.find((item) => item.name === form.city) || province.cities[0];
  if (!city) return;
  form.city = city.name;

  const county = city.counties.find((item) => item === form.county) || city.counties[0] || '';
  form.county = county;
}

function applyDefaultRegion() {
  form.province = DEFAULT_REGION.province;
  form.city = DEFAULT_REGION.city;
  form.county = DEFAULT_REGION.county;
  ensureRegionChain();
}

function onProvinceChange(e) {
  const idx = Number(e?.detail?.value || 0);
  form.province = provinceOptions.value[idx] || provinceOptions.value[0] || '';
  ensureRegionChain();
}

function onCityChange(e) {
  const idx = Number(e?.detail?.value || 0);
  form.city = cityOptions.value[idx] || cityOptions.value[0] || '';
  ensureRegionChain();
}

function onCountyChange(e) {
  const idx = Number(e?.detail?.value || 0);
  form.county = countyOptions.value[idx] || countyOptions.value[0] || '';
}

applyDefaultRegion();

function isInChoices(value, choices) {
  return Array.isArray(choices) && choices.some((item) => item.value === value);
}
function isInList(value, list) {
  return Array.isArray(list) && list.includes(value);
}

function collectSignature() {
  signStatus.value = '签名已采集';
  uni.showToast({ title: '签名采集成功', icon: 'success' });
}

function setMainAltitude(altitude, sourceTag, sourceKey) {
  if (Number.isFinite(Number(altitude))) {
    form.altitude = Number(altitude).toFixed(2);
  }
  if (sourceKey === 'dem') altitudeSource.value = 'dem';
  else if (sourceKey === 'hardware') altitudeSource.value = 'hardware';
  else if (sourceKey === 'alert') altitudeSource.value = 'alert';
  else altitudeSource.value = 'manual';
  uni.showToast({ title: sourceTag, icon: 'none', duration: 1800 });
}

function getWatermarkUserName() {
  const user = getUser() || {};
  return user.full_name || user.username || '未登录用户';
}

function getSelectedSiteName() {
  return form.name || '未命名文物';
}

function formatCoordinateForWatermark(value, fallback = '--') {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(6) : fallback;
}

function buildWatermarkText(snapshot) {
  const longitude = formatCoordinateForWatermark(snapshot.longitude);
  const latitude = formatCoordinateForWatermark(snapshot.latitude);

  return `用户: ${getWatermarkUserName()}\n文物点: ${getSelectedSiteName()}\n时间: ${snapshot.time}\n经纬度: ${longitude}, ${latitude}`;
}

async function resolveWatermarkSnapshot() {
  const now = new Date();
  const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  try {
    const gps = await getNativeGpsPosition();
    if (Number.isFinite(Number(gps.longitude)) && Number.isFinite(Number(gps.latitude))) {
      return {
        time,
        longitude: Number(gps.longitude),
        latitude: Number(gps.latitude),
      };
    }
  } catch (_) {
    // GPS 获取失败时回退到表单中的最新经纬度，保证拍照流程不中断。
  }

  return {
    time,
    longitude: Number(form.longitude),
    latitude: Number(form.latitude),
  };
}

function normalizeHardwareAltitude(rawAltitude) {
  const altitude = Number(rawAltitude);
  if (!Number.isFinite(altitude)) return null;
  if (Math.abs(altitude) < ALTITUDE_ZERO_EPS) return null;
  if (altitude < ALTITUDE_MIN_M || altitude > ALTITUDE_MAX_M) return null;
  return altitude;
}

function requestDemAltitude(longitude, latitude) {
  return new Promise((resolve, reject) => {
    const fallbackDirectUrl = `${config.WEB_BASE_URL}/api/dem-elevation-lookup/`;
    const fallbackAppApiUrl = `${config.WEB_BASE_URL}/app-api/api/dem-elevation-lookup/`;
    const fallbackByReplace = `${String(config.API_BASE_URL || '').replace(/\/app-api\/?$/, '')}/api/dem-elevation-lookup/`;
    const urlCandidates = Array.from(new Set([fallbackDirectUrl, fallbackAppApiUrl, fallbackByReplace].filter(Boolean)));
    let attemptIndex = 0;

    const tryNext = (lastError) => {
      if (attemptIndex >= urlCandidates.length) {
        reject(lastError || new Error('DEM 请求失败'));
        return;
      }
      const targetUrl = urlCandidates[attemptIndex++];
      uni.request({
        url: targetUrl,
        method: 'POST',
        timeout: DEM_TIMEOUT_MS,
        sslVerify: false,
        header: { 'Content-Type': 'application/json' },
        data: { longitude, latitude },
        success: (res) => {
          const data = res?.data || {};
          if (res.statusCode !== 200) {
            tryNext(new Error(`DEM HTTP ${res.statusCode || 'ERR'}`));
            return;
          }
          const demOk = data.code === 200 || data.success === true || data.status === 'success';
          const demAltitude = data.altitude ?? data.elevation ?? (data.data && (data.data.altitude ?? data.data.elevation));
          if (!demOk || demAltitude == null || Number.isNaN(Number(demAltitude))) {
            tryNext(new Error('DEM 返回无有效高程'));
            return;
          }
          resolve(Number(demAltitude));
        },
        fail: () => tryNext(new Error('DEM 请求失败')),
      });
    };

    tryNext();
  });
}

async function resolveAltitude(lon, lat, gpsHardwareAlt) {
  const hardware = normalizeHardwareAltitude(gpsHardwareAlt);

  if (altitudeMode.value === 'hardware') {
    if (hardware != null) {
      return { altitude: hardware, sourceTag: '🟢 手机硬件直出', sourceKey: 'hardware' };
    }
    return { altitude: null, sourceTag: '🔴 硬件海拔无效，请手动录入', sourceKey: 'alert' };
  }

  try {
    const demAltitude = await requestDemAltitude(lon, lat);
    return { altitude: demAltitude, sourceTag: '🟢 DEM国家高程校准', sourceKey: 'dem' };
  } catch (_) {
    if (hardware != null) {
      return { altitude: hardware, sourceTag: '🟡 手机硬件(无网保底)', sourceKey: 'hardware' };
    }
    return { altitude: null, sourceTag: '🔴 DEM不可用且硬件海拔无效，请手动录入', sourceKey: 'alert' };
  }
}

function getNativeGpsPosition() {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    const resolveByPlusGeolocation = () => {
      plus.geolocation.getCurrentPosition(
        (position) => {
          const coords = position && position.coords ? position.coords : {};
          resolve({
            longitude: Number(coords.longitude),
            latitude: Number(coords.latitude),
            altitude: coords.altitude != null ? Number(coords.altitude) : null,
            accuracy: coords.accuracy != null ? Number(coords.accuracy) : null,
          });
        },
        (err) => {
          reject(err || new Error('gps failed'));
        },
        {
          provider: 'gps',
          enableHighAccuracy: true,
          coordsType: 'wgs84',
          timeout: GPS_TIMEOUT_MS,
          maximumAge: 0,
          geocode: false,
        }
      );
    };

    try {
      const isAndroid = typeof plus !== 'undefined' && plus.os && String(plus.os.name || '').toLowerCase() === 'android';
      if (!isAndroid || !plus.android) {
        resolveByPlusGeolocation();
        return;
      }

      plus.android.importClass('android.location.LocationManager');
      const activity = plus.android.runtimeMainActivity();
      const locationManager = plus.android.invoke(activity, 'getSystemService', 'location');
      if (!locationManager) {
        resolveByPlusGeolocation();
        return;
      }

      const provider = 'gps';
      const providerEnabled = plus.android.invoke(locationManager, 'isProviderEnabled', provider);
      if (!providerEnabled) {
        resolveByPlusGeolocation();
        return;
      }

      let done = false;
      let timeoutTimer = null;
      let listener = null;

      const parseLocation = (loc) => {
        if (!loc) return null;
        const longitude = Number(plus.android.invoke(loc, 'getLongitude'));
        const latitude = Number(plus.android.invoke(loc, 'getLatitude'));
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
        const hasAltitude = !!plus.android.invoke(loc, 'hasAltitude');
        const hasAccuracy = !!plus.android.invoke(loc, 'hasAccuracy');
        const altitude = hasAltitude ? Number(plus.android.invoke(loc, 'getAltitude')) : null;
        const accuracy = hasAccuracy ? Number(plus.android.invoke(loc, 'getAccuracy')) : null;
        return {
          longitude,
          latitude,
          altitude: Number.isFinite(altitude) ? altitude : null,
          accuracy: Number.isFinite(accuracy) ? accuracy : null,
        };
      };

      const finish = (payload, err) => {
        if (done) return;
        done = true;
        if (timeoutTimer) clearTimeout(timeoutTimer);
        try {
          if (listener) plus.android.invoke(locationManager, 'removeUpdates', listener);
        } catch (_) {}

        if (err) {
          resolveByPlusGeolocation();
          return;
        }
        resolve(payload);
      };

      listener = plus.android.implements('android.location.LocationListener', {
        onLocationChanged: (location) => {
          const parsed = parseLocation(location);
          if (parsed) finish(parsed, null);
        },
        onStatusChanged: () => {},
        onProviderEnabled: () => {},
        onProviderDisabled: () => {},
      });

      const lastKnown = plus.android.invoke(locationManager, 'getLastKnownLocation', provider);
      const parsedLastKnown = parseLocation(lastKnown);
      if (parsedLastKnown) {
        finish(parsedLastKnown, null);
        return;
      }

      plus.android.invoke(locationManager, 'requestLocationUpdates', provider, 0, 0, listener);
      timeoutTimer = setTimeout(() => {
        finish(null, new Error('android gps timeout'));
      }, GPS_TIMEOUT_MS);
    } catch (_) {
      resolveByPlusGeolocation();
    }
    // #endif

    // #ifndef APP-PLUS
    uni.getLocation({
      type: 'wgs84',
      altitude: true,
      isHighAccuracy: true,
      highAccuracyExpireTime: 12000,
      success: (res) => {
        resolve({
          longitude: Number(res.longitude),
          latitude: Number(res.latitude),
          altitude: res.altitude != null ? Number(res.altitude) : null,
          accuracy: res.accuracy != null ? Number(res.accuracy) : null,
        });
      },
      fail: (err) => reject(err),
    });
    // #endif
  });
}

async function capturePointData() {
  const gps = await getNativeGpsPosition();
  const lon = Number(gps.longitude);
  const lat = Number(gps.latitude);
  const hardwareAlt = Number.isFinite(Number(gps.altitude)) ? Number(gps.altitude) : null;
  const result = await resolveAltitude(lon, lat, hardwareAlt);
  return {
    longitude: lon,
    latitude: lat,
    altitude: result.altitude,
    sourceTag: result.sourceTag,
  };
}

async function handleCollectCoordinate() {
  try {
    const r = await capturePointData();
    form.longitude = Number(r.longitude).toFixed(8);
    form.latitude = Number(r.latitude).toFixed(8);
    setMainAltitude(r.altitude, r.sourceTag, r.sourceTag.includes('DEM') ? 'dem' : r.sourceTag.includes('硬件') ? 'hardware' : 'alert');
  } catch (_) {
    uni.showToast({ title: '定位采集失败，请重试', icon: 'none' });
  }
}

async function handleCollectAltitude() {
  try {
    const r = await capturePointData();
    if (Number.isFinite(Number(r.longitude)) && Number.isFinite(Number(r.latitude))) {
      form.longitude = Number(r.longitude).toFixed(8);
      form.latitude = Number(r.latitude).toFixed(8);
    }
    setMainAltitude(r.altitude, r.sourceTag, r.sourceTag.includes('DEM') ? 'dem' : r.sourceTag.includes('硬件') ? 'hardware' : 'alert');
  } catch (_) {
    uni.showToast({ title: '海拔采集失败，请重试', icon: 'none' });
  }
}

function pickPhoto() {
  const remain = 10 - photos.value.length;

  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: async (res) => {
      const tempFilePaths = res.tempFilePaths || [];
      const selected = [];

      for (let index = 0; index < tempFilePaths.length; index += 1) {
        const path = tempFilePaths[index];
        const snapshot = await resolveWatermarkSnapshot();
        const watermarkText = buildWatermarkText(snapshot);

        try {
          await nextTick();
          const watermarkedPath = await addWatermark(path, watermarkText, instance.proxy);
          selected.push({ id: `${Date.now()}_${index}`, path: watermarkedPath });
        } catch (_) {
          selected.push({ id: `${Date.now()}_${index}`, path });
        }
      }

      photos.value = photos.value.concat(selected).slice(0, 10);
    },
  });
}

function removePhoto(index) {
  photos.value.splice(index, 1);
}

function validateForm() {
  if (!form.name.trim()) return '请填写文物名称';
  if (!form.surveyCodeAuto) {
    const code = form.code.trim();
    if (!code) return '手动模式下请填写普查编号';
    if (!/^SS-CJ-\d{4}-\d{4}$/.test(code)) return '普查编号格式应为 SS-CJ-YYYY-NNNN';
  }
  if (!form.era.trim()) return '请填写时代';
  if (!form.category) return '请选择文物类别';
  if (!isInChoices(form.category, props.meta?.categoryChoices || [])) return '文物类别无效，请重新选择';

  if (!form.longitude.trim() || !form.latitude.trim()) return '请采集经纬度';
  const lon = Number(form.longitude);
  const lat = Number(form.latitude);
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return '经度须在 -180 到 180 之间';
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return '纬度须在 -90 到 90 之间';

  if (form.altitude.trim()) {
    const alt = Number(form.altitude);
    if (!Number.isFinite(alt)) return '海拔必须为数字';
  }

  if (!form.province.trim()) return '请填写省/自治区';
  if (!isInList(form.province, provinceOptions.value)) return '省份选择无效，请重新选择';
  if (!isInList(form.city, cityOptions.value)) return '城市选择无效，请重新选择';
  if (!isInList(form.county, countyOptions.value)) return '区县选择无效，请重新选择';
  if (!form.address.trim()) return '请填写详细地址';

  if (!form.protection_level || !isInChoices(form.protection_level, props.meta?.protectionLevelChoices || [])) {
    return '保护级别无效，请重新选择';
  }
  if (!form.ownership || !isInChoices(form.ownership, props.meta?.ownershipChoices || [])) {
    return '权属无效，请重新选择';
  }
  if (!form.preservation_status || !isInChoices(form.preservation_status, props.meta?.preservationStatusChoices || [])) {
    return '保存现状无效，请重新选择';
  }

  if (!signStatus.value) return '请先完成普查员签名';
  return '';
}

function handleSubmit() {
  if (props.loading) return;

  const coordCheck = coordRef.value?.validateBeforeSubmit?.();
  if (coordCheck && !coordCheck.ok) {
    uni.showToast({ title: coordCheck.message || '坐标采集校验未通过', icon: 'none' });
    return;
  }

  const msg = validateForm();
  if (msg) {
    uni.showToast({ title: msg, icon: 'none' });
    return;
  }

  emitting('submit', {
    ...form,
    coord_list: coordList.value,
    altitude_mode: altitudeMode.value,
    altitude_source: altitudeSource.value,
    photos: photos.value,
    signature_status: signStatus.value,
  });
}

defineExpose({
  form,
  altitudeMode,
  resolveAltitude,
  capturePointData,
});
</script>

<style scoped lang="scss">
.wizard-page {
  height: 100vh;
  background: #eef2f7;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wizard-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #ffffff;
  border-bottom: 1rpx solid #e6ebf2;
  box-shadow: 0 8rpx 24rpx rgba(5, 24, 56, 0.06);
}

.header-top {
  padding: 18rpx 22rpx 10rpx;
}

.page-title {
  display: block;
  font-size: 34rpx;
  color: #001529;
  font-weight: 700;
}

.page-subtitle {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #5f6f85;
}

.stepper-wrap {
  padding: 8rpx 20rpx 16rpx;
  display: flex;
}

.stepper-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stepper-node {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 2rpx solid #d9d9d9;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stepper-node.pending {
  border-color: #d9d9d9;
}

.stepper-node.active,
.stepper-node.done {
  border-color: #1E5AA8;
  background: #1E5AA8;
}

.stepper-node-text {
  font-size: 24rpx;
  color: #8c8c8c;
  font-weight: 700;
}

.stepper-node.active .stepper-node-text,
.stepper-node.done .stepper-node-text {
  color: #ffffff;
}

.stepper-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8c8c8c;
  text-align: center;
  line-height: 1.35;
}

.stepper-label.active {
  color: #004da8;
  font-weight: 700;
}

.stepper-line {
  position: absolute;
  top: 22rpx;
  left: 50%;
  width: 100%;
  height: 2rpx;
  transform: translateX(22rpx);
  background: #d9d9d9;
}

.stepper-line.done {
  background: #1E5AA8;
}

.wizard-content {
  flex: 1;
  overflow: hidden;
  padding: 14rpx 16rpx 0;
}

.step-panel {
  height: 100%;
  overflow-y: auto;
  padding-bottom: 18rpx;
  box-sizing: border-box;
}

.card {
  border-radius: 14rpx;
  border: 1rpx solid #e8edf3;
  background: #ffffff;
  box-shadow: 0 6rpx 18rpx rgba(14, 35, 78, 0.04);
  padding: 18rpx;
}

.step-card {
  margin-bottom: 8rpx;
}

.card-head {
  margin-bottom: 8rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 30rpx;
  color: #0b1f3a;
  font-weight: 700;
}

.card-tag {
  font-size: 22rpx;
  color: #4f6a8b;
  background: #f0f5ff;
  border: 1rpx solid #d6e4ff;
  padding: 6rpx 10rpx;
  border-radius: 999rpx;
}

.card-tag.warm {
  color: #ad6800;
  background: #fffbe6;
  border-color: #ffe58f;
}

.strategy-card {
  background: #f5fafe;
  border: 1rpx solid #d6ecff;
  border-radius: 12rpx;
  padding: 14rpx;
  margin-bottom: 12rpx;
}

.strategy-head {
  margin-bottom: 6rpx;
}

.strategy-title {
  font-size: 28rpx;
  color: #113a6b;
  font-weight: 700;
}

.strategy-group {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.strategy-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 6rpx 0;
}

.strategy-copy {
  display: flex;
  flex-direction: column;
}

.strategy-copy-title {
  font-size: 27rpx;
  color: #0f2c4f;
  font-weight: 600;
}

.strategy-copy-desc {
  margin-top: 2rpx;
  font-size: 23rpx;
  color: #58708e;
}

.form-row {
  min-height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  border-bottom: 1rpx solid #edf1f6;
}

.form-row:last-child {
  border-bottom: none;
}

.row-label {
  width: 210rpx;
  flex-shrink: 0;
  font-size: 28rpx;
  color: #173251;
}

.row-label.required::after {
  content: ' *';
  color: #cf1322;
}

.row-input,
.picker-value {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #1a2a40;
  min-height: 68rpx;
}

.picker-wrap {
  flex: 1;
}

.row-input::placeholder {
  color: #b6bfcc;
}

.row-altitude {
  align-items: flex-start;
  padding-top: 10rpx;
  padding-bottom: 10rpx;
}

.altitude-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10rpx;
}

.altitude-input {
  min-width: 170rpx;
}

.alt-badge {
  padding: 6rpx 10rpx;
  border-radius: 8rpx;
}

.alt-badge-text {
  font-size: 22rpx;
}

.badge-dem {
  background: #f6ffed;
  border: 1rpx solid #b7eb8f;
  .alt-badge-text {
    color: #389e0d;
  }
}

.badge-hardware {
  background: #fffbe6;
  border: 1rpx solid #ffe58f;
  .alt-badge-text {
    color: #d48806;
  }
}

.badge-manual {
  background: #fafafa;
  border: 1rpx solid #d9d9d9;
  .alt-badge-text {
    color: #595959;
  }
}

.badge-alert {
  background: #fff1f0;
  border: 1rpx solid #ffa39e;
  .alt-badge-text {
    color: #cf1322;
  }
}

.mode-switch {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  border: 1rpx solid #d9e2ec;
  border-radius: 10rpx;
  overflow: hidden;
}

.mode-item {
  min-width: 110rpx;
  text-align: center;
  font-size: 24rpx;
  color: #5d7088;
  background: #f5f7fa;
  padding: 8rpx 14rpx;
}

.mode-item.active {
  color: #ffffff;
  background: #1E5AA8;
}

.btn-group-compact {
  margin-top: 12rpx;
  display: flex;
  gap: 10rpx;
}

.btn-secondary {
  flex: 1;
  height: 72rpx;
  border-radius: 10rpx;
  border: 1rpx solid #b8dcff;
  background: #eaf5ff;
  color: #0456a7;
  font-size: 27rpx;
  line-height: 72rpx;
}

.single-btn {
  max-width: 360rpx;
  flex: 0 0 auto;
}

.step2-focus {
  background: #fffbe6;
  border-color: #ffe58f;
  box-shadow: 0 10rpx 24rpx rgba(173, 104, 0, 0.12);
}

.focus-tip {
  margin-bottom: 12rpx;
  background: #fff7d1;
  border: 1rpx dashed #ffd666;
  border-radius: 10rpx;
  padding: 10rpx 12rpx;
}

.focus-tip-text {
  font-size: 24rpx;
  color: #8d5a00;
  line-height: 1.6;
}

.step2-meta {
  margin-top: 12rpx;
}

.step2-meta-text {
  font-size: 24rpx;
  color: #ad6800;
  font-weight: 600;
}

.step2-focus :deep(.coord-card) {
  background: #fffdf2;
  border-color: #ffd666;
}

.step2-focus :deep(.btn-add),
.step2-focus :deep(.btn-grab) {
  background: #fff7e6;
  border-color: #faad14;
  color: #ad6800;
  font-weight: 700;
}

.column-row {
  display: block;
  padding-top: 12rpx;
  padding-bottom: 12rpx;
}

.column-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8rpx;
}

.column-meta {
  font-size: 23rpx;
  color: #8093ad;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
}

.photo-item,
.photo-add {
  position: relative;
  height: 168rpx;
  border-radius: 10rpx;
  overflow: hidden;
}

.photo-item {
  background: #edf1f5;
}

.photo-img {
  width: 100%;
  height: 100%;
}

.photo-remove {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-remove-text {
  font-size: 20rpx;
  color: #ffffff;
}

.photo-add {
  border: 1rpx dashed #9ccfff;
  background: #f8fbff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-add-text {
  font-size: 25rpx;
  color: #0958d9;
}

.inline-hint {
  margin: 8rpx 0 10rpx;
}

.inline-hint-text {
  font-size: 24rpx;
  color: #4f657f;
}

.remark-input {
  width: 100%;
  min-height: 170rpx;
  border-radius: 10rpx;
  border: 1rpx solid #d7e0eb;
  padding: 14rpx;
  box-sizing: border-box;
  font-size: 27rpx;
  color: #1f314b;
  background: #ffffff;
}

.wizard-footer {
  background: #ffffff;
  border-top: 1rpx solid #e7ecf2;
  padding: 10rpx 16rpx calc(10rpx + env(safe-area-inset-bottom));
  padding: 10rpx 16rpx calc(10rpx + constant(safe-area-inset-bottom));
}

.footer-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.footer-row.single {
  justify-content: center;
}

.footer-row.split .left {
  flex: 0 0 30%;
}

.footer-row.split .right {
  flex: 0 0 calc(70% - 10rpx);
}

.btn-flow {
  height: 88rpx;
  border-radius: 10rpx;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 88rpx;
  border: 1rpx solid transparent;
}

.btn-flow-wide {
  width: 80%;
}

.btn-flow-primary {
  background: #1E5AA8;
  color: #ffffff;
}

.btn-flow-ghost {
  background: #ffffff;
  color: #5c6f86;
  border-color: #cfd8e5;
}

.btn-flow-submit {
  background: #1f9d55;
  color: #ffffff;
}

.btn-flow-submit[disabled] {
  opacity: 0.65;
}

@media screen and (max-width: 430px) {
  .row-label {
    width: 176rpx;
    font-size: 26rpx;
  }

  .row-input,
  .picker-value {
    font-size: 26rpx;
  }

  .stepper-label {
    font-size: 20rpx;
  }

  .btn-flow {
    font-size: 28rpx;
  }

  .photo-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
