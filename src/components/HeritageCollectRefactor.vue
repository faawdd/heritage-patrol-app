<template>
  <div class="wizard-page">
    <div class="wizard-header">
      <div class="stepper-wrap">
        <div v-for="(step, idx) in stepDefs" :key="step.key" class="stepper-item">
          <div class="stepper-node" :class="stepNodeClass(idx)">
            <span class="stepper-node-text">{{ currentStep > idx ? '✓' : idx + 1 }}</span>
          </div>
          <span class="stepper-label" :class="{ active: currentStep === idx }">{{ step.label }}</span>
          <div v-if="idx < stepDefs.length - 1" class="stepper-line" :class="{ done: currentStep > idx }"></div>
        </div>
      </div>
    </div>

    <div class="wizard-content">
      <div v-if="currentStep === 0" class="step-panel">
        <div class="card step-card">
          <div class="card-head">
            <span class="card-title">第一步：基础地理</span>
            <span class="card-tag">信息校核</span>
          </div>

          <div class="strategy-card">
            <div class="strategy-head">
              <span class="strategy-title">全局采集策略</span>
            </div>
            <div class="strategy-group">
              <label class="strategy-item">
                <input type="radio" name="altitude-mode" value="dem" :checked="altitudeMode === 'dem'" @change="onModeChange({ detail: { value: 'dem' } })" />
                <div class="strategy-copy">
                  <span class="strategy-copy-title">DEM 优先模式（推荐）</span>
                  <span class="strategy-copy-desc">优先后端 DEM 反查，弱网时自动降级硬件海拔</span>
                </div>
              </label>
              <label class="strategy-item">
                <input type="radio" name="altitude-mode" value="hardware" :checked="altitudeMode === 'hardware'" @change="onModeChange({ detail: { value: 'hardware' } })" />
                <div class="strategy-copy">
                  <span class="strategy-copy-title">硬件优先模式</span>
                  <span class="strategy-copy-desc">跳过 DEM 请求，直接使用手机硬件高程</span>
                </div>
              </label>
            </div>
          </div>

          <div class="form-row">
            <span class="row-label required">文物名称</span>
            <input class="row-input" v-model="form.name" placeholder="请输入文物名称" maxlength="200" />
          </div>

          <div class="form-row">
            <span class="row-label">曾用名</span>
            <input class="row-input" v-model="form.former_name" placeholder="选填" maxlength="200" />
          </div>

          <div class="form-row">
            <span class="row-label">编号模式</span>
            <div class="mode-switch">
              <div class="mode-item" :class="{ active: form.surveyCodeAuto }" @click="form.surveyCodeAuto = true">自动</div>
              <div class="mode-item" :class="{ active: !form.surveyCodeAuto }" @click="form.surveyCodeAuto = false">手动</div>
            </div>
          </div>

          <div v-if="!form.surveyCodeAuto" class="form-row">
            <span class="row-label required">普查编号</span>
            <input class="row-input" v-model="form.code" placeholder="请输入普查编号" maxlength="50" />
          </div>

          <div class="form-row">
            <span class="row-label required">时代</span>
            <input class="row-input" v-model="form.era" placeholder="如：汉、唐宋" maxlength="100" />
          </div>

          <div class="form-row">
            <span class="row-label required">文物类别</span>
            <div class="picker-wrap">
              <select class="picker-value" :value="categoryIndex" @change="onCategoryChange({ detail: { value: Number($event.target.value) } })">
                <option v-for="(label, i) in categoryLabels" :key="i" :value="i">{{ label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <span class="row-label required">经度</span>
            <input class="row-input" v-model="form.longitude" type="text" inputmode="decimal" placeholder="自动采集或手动填写" />
          </div>

          <div class="form-row">
            <span class="row-label required">纬度</span>
            <input class="row-input" v-model="form.latitude" type="text" inputmode="decimal" placeholder="自动采集或手动填写" />
          </div>

          <div class="form-row row-altitude">
            <span class="row-label required">海拔</span>
            <div class="altitude-cell">
              <input class="row-input altitude-input" v-model="form.altitude" type="text" inputmode="decimal" placeholder="自动采集或手动填写" />
              <div class="alt-badge" :class="badgeClassMap[altitudeSource]">
                <span class="alt-badge-text">{{ altitudeSourceLabel }}</span>
              </div>
            </div>
          </div>

          <div class="form-row">
            <span class="row-label">省/自治区</span>
            <div class="picker-wrap">
              <select class="picker-value" :value="provinceIndex" @change="onProvinceChange({ detail: { value: Number($event.target.value) } })">
                <option v-for="(label, i) in provinceOptions" :key="i" :value="i">{{ label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <span class="row-label">市/州</span>
            <div class="picker-wrap">
              <select class="picker-value" :value="cityIndex" @change="onCityChange({ detail: { value: Number($event.target.value) } })">
                <option v-for="(label, i) in cityOptions" :key="i" :value="i">{{ label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <span class="row-label">县/区</span>
            <div class="picker-wrap">
              <select class="picker-value" :value="countyIndex" @change="onCountyChange({ detail: { value: Number($event.target.value) } })">
                <option v-for="(label, i) in countyOptions" :key="i" :value="i">{{ label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <span class="row-label">乡镇/街道</span>
            <input class="row-input" v-model="form.township" placeholder="选填" maxlength="50" />
          </div>

          <div class="form-row">
            <span class="row-label">村/社区</span>
            <input class="row-input" v-model="form.village" placeholder="选填" maxlength="50" />
          </div>

          <div class="form-row">
            <span class="row-label">详细地址</span>
            <input class="row-input" v-model="form.address" placeholder="选填" maxlength="500" />
          </div>

          <div class="btn-group-compact">
            <van-button native-type="button" class="btn-secondary" @click="handleCollectCoordinate">采集坐标</van-button>
            <van-button native-type="button" class="btn-secondary" @click="handleCollectAltitude">采集海拔</van-button>
          </div>
        </div>
      </div>

      <div v-if="currentStep === 1" class="step-panel">
        <div class="card step-card step2-focus">
          <div class="card-head">
            <span class="card-title">第二步：多点坐标</span>
            <span class="card-tag warm">高频核心操作区</span>
          </div>
          <div class="focus-tip">
            <span class="focus-tip-text">围绕遗址走动采集时，请优先使用“新增定位点”和“实时定位”完成边界点/标志点录入。</span>
          </div>
          <CoordinateCollectCard
            ref="coordRef"
            v-model="coordList"
            :heritage-name="form.name"
            :capture-point-data="capturePointData"
          />
          <div class="step2-meta">
            <span class="step2-meta-text">当前边界点：{{ boundaryPointCount }} 个（至少 3 个）</span>
          </div>
        </div>
      </div>

      <div v-if="currentStep === 2" class="step-panel">
        <div class="card step-card">
          <div class="card-head">
            <span class="card-title">第三步：多媒体/审核</span>
            <span class="card-tag">提交前复核</span>
          </div>

          <div class="form-row column-row">
            <div class="column-head">
              <span class="row-label required">现场照片</span>
              <span class="column-meta">最多 10 张</span>
            </div>
            <div class="photo-grid">
              <div v-for="(item, idx) in photos" :key="item.id" class="photo-item">
                <img :src="item.path" class="photo-img" />
                <div class="photo-remove" @click="removePhoto(idx)">
                  <span class="photo-remove-text">删</span>
                </div>
              </div>
              <div v-if="photos.length < 10" class="photo-add" @click="pickPhoto">
                <span class="photo-add-text">添加照片</span>
              </div>
            </div>
          </div>

          <div class="form-row">
            <span class="row-label">保护级别</span>
            <div class="picker-wrap">
              <select class="picker-value" :value="protectionIndex" @change="onProtectionChange({ detail: { value: Number($event.target.value) } })">
                <option v-for="(label, i) in protectionLabels" :key="i" :value="i">{{ label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <span class="row-label">权属</span>
            <div class="picker-wrap">
              <select class="picker-value" :value="ownershipIndex" @change="onOwnershipChange({ detail: { value: Number($event.target.value) } })">
                <option v-for="(label, i) in ownershipLabels" :key="i" :value="i">{{ label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <span class="row-label">保存现状</span>
            <div class="picker-wrap">
              <select class="picker-value" :value="preservationIndex" @change="onPreservationChange({ detail: { value: Number($event.target.value) } })">
                <option v-for="(label, i) in preservationLabels" :key="i" :value="i">{{ label }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <span class="row-label required">普查员签名</span>
            <van-button native-type="button" class="btn-secondary single-btn" @click="collectSignature">采集签名</van-button>
          </div>
          <div v-if="signStatus" class="inline-hint">
            <span class="inline-hint-text">{{ signStatus }}</span>
          </div>

          <div class="form-row column-row">
            <div class="column-head">
              <span class="row-label">现场备注</span>
              <span class="column-meta">限 2000 字</span>
            </div>
            <textarea
              class="remark-input"
              v-model="form.remark"
              maxlength="2000"
              placeholder="请填写现场情况、病害信息、交通与环境说明"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="wizard-footer">
      <div v-if="currentStep === 0" class="footer-row single">
        <van-button native-type="button" class="btn-flow btn-flow-primary btn-flow-wide" @click="goStep1ToStep2">下一步：采集坐标</van-button>
      </div>

      <div v-if="currentStep === 1" class="footer-row split">
        <van-button native-type="button" class="btn-flow btn-flow-ghost left" @click="goPrevStep">返回上一步</van-button>
        <van-button native-type="button" class="btn-flow btn-flow-primary right" @click="goStep2ToStep3">下一步：多媒体/审核</van-button>
      </div>

      <div v-if="currentStep === 2" class="footer-row split">
        <van-button native-type="button" class="btn-flow btn-flow-ghost left" @click="goPrevStep">返回上一步</van-button>
        <van-button native-type="button" class="btn-flow btn-flow-submit right" :disabled="loading" @click="handleSubmit">
          {{ loading ? '提交中...' : '完成并提交数据' }}
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import config from '@/lib/config.js';
import { CHINA_REGION_TREE, DEFAULT_REGION } from '@/lib/china_regions.js';
import { addWatermark } from '@/lib/watermark.js';
import { getUser } from '@/lib/auth.js';
import { request } from '@/lib/request.js';
import { toast } from '@/lib/ui.js';
import { chooseImage } from '@/lib/native.js';
import { getGpsLocation } from '@/lib/sensors.js';
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
const coordRef = ref(null);
const coordList = ref([]);

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
    toast('边界点不足3个，无法进入下一步', { icon: 'none' });
    return;
  }
  const coordCheck = coordRef.value?.validateBeforeSubmit?.();
  if (coordCheck && !coordCheck.ok) {
    toast(coordCheck.message || '坐标采集校验未通过', { icon: 'none' });
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
  toast('签名采集成功', { icon: 'success' });
}

function setMainAltitude(altitude, sourceTag, sourceKey) {
  if (Number.isFinite(Number(altitude))) {
    form.altitude = Number(altitude).toFixed(2);
  }
  if (sourceKey === 'dem') altitudeSource.value = 'dem';
  else if (sourceKey === 'hardware') altitudeSource.value = 'hardware';
  else if (sourceKey === 'alert') altitudeSource.value = 'alert';
  else altitudeSource.value = 'manual';
  toast(sourceTag, { icon: 'none', duration: 1800 });
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

async function requestDemAltitude(longitude, latitude) {
  const fallbackDirectUrl = `${config.WEB_BASE_URL}/api/dem-elevation-lookup/`;
  const fallbackAppApiUrl = `${config.WEB_BASE_URL}/app-api/api/dem-elevation-lookup/`;
  const fallbackByReplace = `${String(config.API_BASE_URL || '').replace(/\/app-api\/?$/, '')}/api/dem-elevation-lookup/`;
  const urlCandidates = Array.from(new Set([fallbackDirectUrl, fallbackAppApiUrl, fallbackByReplace].filter(Boolean)));

  let lastError = null;
  for (const targetUrl of urlCandidates) {
    let res;
    try {
      res = await request({
        url: targetUrl,
        method: 'POST',
        timeout: DEM_TIMEOUT_MS,
        header: { 'Content-Type': 'application/json' },
        data: { longitude, latitude },
      });
    } catch (_) {
      lastError = new Error('DEM 请求失败');
      continue;
    }
    const data = res?.data && typeof res.data === 'object' ? res.data : {};
    if (res.statusCode !== 200) {
      lastError = new Error(`DEM HTTP ${res.statusCode || 'ERR'}`);
      continue;
    }
    const demOk = data.code === 200 || data.success === true || data.status === 'success';
    const demAltitude = data.altitude ?? data.elevation ?? (data.data && (data.data.altitude ?? data.data.elevation));
    if (!demOk || demAltitude == null || Number.isNaN(Number(demAltitude))) {
      lastError = new Error('DEM 返回无有效高程');
      continue;
    }
    return Number(demAltitude);
  }
  throw lastError || new Error('DEM 请求失败');
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

async function getNativeGpsPosition() {
  const gps = await getGpsLocation({ timeout: GPS_TIMEOUT_MS });
  return {
    longitude: Number(gps.longitude),
    latitude: Number(gps.latitude),
    altitude: gps.altitude != null ? Number(gps.altitude) : null,
    accuracy: gps.accuracy != null ? Number(gps.accuracy) : null,
  };
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
    toast('定位采集失败，请重试', { icon: 'none' });
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
    toast('海拔采集失败，请重试', { icon: 'none' });
  }
}

let photoSeed = 0;

// chooseImage 每次只返回一张图片，用户可重复点击“添加照片”。
async function pickPhoto() {
  if (photos.value.length >= 10) return;

  let picked;
  try {
    picked = await chooseImage({ source: 'prompt' });
  } catch (err) {
    if (err && !err.cancelled && err.errMsg) toast(err.errMsg, { icon: 'none' });
    return;
  }

  photoSeed += 1;
  const id = `${Date.now()}_${photoSeed}`;
  const snapshot = await resolveWatermarkSnapshot();
  const watermarkText = buildWatermarkText(snapshot);

  try {
    const { blob, url } = await addWatermark(picked.webPath, watermarkText);
    photos.value = photos.value.concat([{ id, path: url, blob }]).slice(0, 10);
  } catch (_) {
    photos.value = photos.value.concat([{ id, path: picked.webPath }]).slice(0, 10);
  }
}

function removePhoto(index) {
  const [removed] = photos.value.splice(index, 1);
  if (removed && removed.blob && removed.path) URL.revokeObjectURL(removed.path);
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
    toast(coordCheck.message || '坐标采集校验未通过', { icon: 'none' });
    return;
  }

  const msg = validateForm();
  if (msg) {
    toast(msg, { icon: 'none' });
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
  height: 100%;
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
  border-bottom: 0.5px solid #e6ebf2;
  box-shadow: 0 4px 12px rgba(5, 24, 56, 0.06);
}

.header-top {
  padding: 9px 11px 5px;
}

.page-title {
  display: block;
  font-size: 17px;
  color: #001529;
  font-weight: 700;
}

.page-subtitle {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: #5f6f85;
}

.stepper-wrap {
  padding: 10px 10px 8px;
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
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid #d9d9d9;
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
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 700;
}

.stepper-node.active .stepper-node-text,
.stepper-node.done .stepper-node-text {
  color: #ffffff;
}

.stepper-label {
  margin-top: 4px;
  font-size: 11px;
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
  top: 11px;
  left: 50%;
  width: 100%;
  height: 1px;
  transform: translateX(11px);
  background: #d9d9d9;
}

.stepper-line.done {
  background: #1E5AA8;
}

.wizard-content {
  flex: 1;
  overflow: hidden;
  padding: 7px 8px 0;
}

.step-panel {
  height: 100%;
  overflow-y: auto;
  padding-bottom: 9px;
  box-sizing: border-box;
}

.card {
  border-radius: 7px;
  border: 0.5px solid #e8edf3;
  background: #ffffff;
  box-shadow: 0 3px 9px rgba(14, 35, 78, 0.04);
  padding: 9px;
}

.step-card {
  margin-bottom: 4px;
}

.card-head {
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 15px;
  color: #0b1f3a;
  font-weight: 700;
}

.card-tag {
  font-size: 11px;
  color: #4f6a8b;
  background: #f0f5ff;
  border: 0.5px solid #d6e4ff;
  padding: 3px 5px;
  border-radius: 999px;
}

.card-tag.warm {
  color: #ad6800;
  background: #fffbe6;
  border-color: #ffe58f;
}

.strategy-card {
  background: #f5fafe;
  border: 0.5px solid #d6ecff;
  border-radius: 6px;
  padding: 7px;
  margin-bottom: 6px;
}

.strategy-head {
  margin-bottom: 3px;
}

.strategy-title {
  font-size: 14px;
  color: #113a6b;
  font-weight: 700;
}

.strategy-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.strategy-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 3px 0;

  input[type='radio'] {
    accent-color: #1E5AA8;
    margin-top: 3px;
  }
}

.strategy-copy {
  display: flex;
  flex-direction: column;
}

.strategy-copy-title {
  font-size: 13.5px;
  color: #0f2c4f;
  font-weight: 600;
}

.strategy-copy-desc {
  margin-top: 1px;
  font-size: 11.5px;
  color: #58708e;
}

.form-row {
  min-height: 41px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 0.5px solid #edf1f6;
}

.form-row:last-child {
  border-bottom: none;
}

.row-label {
  width: 105px;
  flex-shrink: 0;
  font-size: 14px;
  color: #173251;
}

.row-label.required::after {
  content: ' *';
  color: #cf1322;
}

.row-input,
.picker-value {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 14px;
  color: #1a2a40;
  min-height: 34px;
  border: none;
  background: transparent;
  outline: none;
  padding: 0;
  font-family: inherit;
}

.picker-value {
  width: 100%;
  text-align-last: right;
  appearance: none;
  -webkit-appearance: none;
}

.picker-wrap {
  flex: 1;
  min-width: 0;
}

.row-input::placeholder {
  color: #b6bfcc;
}

.row-altitude {
  align-items: flex-start;
  padding-top: 5px;
  padding-bottom: 5px;
}

.altitude-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
}

.altitude-input {
  flex: 1;
  min-width: 85px;
}

.alt-badge {
  padding: 3px 5px;
  border-radius: 4px;
}

.alt-badge-text {
  font-size: 11px;
}

.badge-dem {
  background: #f6ffed;
  border: 0.5px solid #b7eb8f;
  .alt-badge-text {
    color: #389e0d;
  }
}

.badge-hardware {
  background: #fffbe6;
  border: 0.5px solid #ffe58f;
  .alt-badge-text {
    color: #d48806;
  }
}

.badge-manual {
  background: #fafafa;
  border: 0.5px solid #d9d9d9;
  .alt-badge-text {
    color: #595959;
  }
}

.badge-alert {
  background: #fff1f0;
  border: 0.5px solid #ffa39e;
  .alt-badge-text {
    color: #cf1322;
  }
}

.mode-switch {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  border: 0.5px solid #d9e2ec;
  border-radius: 5px;
  overflow: hidden;
}

.mode-item {
  min-width: 55px;
  text-align: center;
  font-size: 12px;
  color: #5d7088;
  background: #f5f7fa;
  padding: 4px 7px;
}

.mode-item.active {
  color: #ffffff;
  background: #1E5AA8;
}

.btn-group-compact {
  margin-top: 6px;
  display: flex;
  gap: 5px;
}

.btn-secondary {
  flex: 1;
  height: 36px;
  border-radius: 5px;
  border: 0.5px solid #b8dcff;
  background: #eaf5ff;
  color: #0456a7;
  font-size: 13.5px;
  line-height: 36px;
}

.single-btn {
  max-width: 180px;
  flex: 0 0 auto;
  padding: 0 14px;
}

.step2-focus {
  background: #fffbe6;
  border-color: #ffe58f;
  box-shadow: 0 5px 12px rgba(173, 104, 0, 0.12);
}

.focus-tip {
  margin-bottom: 6px;
  background: #fff7d1;
  border: 0.5px dashed #ffd666;
  border-radius: 5px;
  padding: 5px 6px;
}

.focus-tip-text {
  font-size: 12px;
  color: #8d5a00;
  line-height: 1.6;
}

.step2-meta {
  margin-top: 6px;
}

.step2-meta-text {
  font-size: 12px;
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
  padding-top: 6px;
  padding-bottom: 6px;
}

.column-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.column-meta {
  font-size: 11.5px;
  color: #8093ad;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}

.photo-item,
.photo-add {
  position: relative;
  height: 84px;
  border-radius: 5px;
  overflow: hidden;
}

.photo-item {
  background: #edf1f5;
}

.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-remove {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-remove-text {
  font-size: 10px;
  color: #ffffff;
}

.photo-add {
  border: 0.5px dashed #9ccfff;
  background: #f8fbff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-add-text {
  font-size: 12.5px;
  color: #0958d9;
}

.inline-hint {
  margin: 4px 0 5px;
}

.inline-hint-text {
  font-size: 12px;
  color: #4f657f;
}

.remark-input {
  width: 100%;
  min-height: 85px;
  border-radius: 5px;
  border: 0.5px solid #d7e0eb;
  padding: 7px;
  box-sizing: border-box;
  font-size: 13.5px;
  color: #1f314b;
  background: #ffffff;
  font-family: inherit;
}

.wizard-footer {
  background: #ffffff;
  border-top: 0.5px solid #e7ecf2;
  padding: 5px 8px calc(5px + env(safe-area-inset-bottom));
}

.footer-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.footer-row.single {
  justify-content: center;
}

.footer-row.split .left {
  flex: 0 0 30%;
}

.footer-row.split .right {
  flex: 0 0 calc(70% - 5px);
}

.btn-flow {
  height: 44px;
  border-radius: 5px;
  font-size: 15px;
  font-weight: 700;
  line-height: 44px;
  border: 0.5px solid transparent;
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
    width: 88px;
    font-size: 13px;
  }

  .row-input,
  .picker-value {
    font-size: 13px;
  }

  .stepper-label {
    font-size: 10px;
  }

  .btn-flow {
    font-size: 14px;
  }

  .photo-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
