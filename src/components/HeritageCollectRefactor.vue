<template>
  <div class="flex h-full flex-col overflow-hidden bg-fill">
    <div class="sticky top-0 z-20 border-b border-line bg-surface shadow-card">
      <div class="flex px-2.5 pb-2 pt-2.5">
        <div v-for="(step, idx) in stepDefs" :key="step.key" class="relative flex flex-1 flex-col items-center">
          <div
            class="flex size-[1.375rem] items-center justify-center border"
            :class="currentStep >= idx ? 'border-primary bg-primary' : 'border-ink-4 bg-surface'"
          >
            <span class="text-xs font-bold" :class="currentStep >= idx ? 'text-on-primary' : 'text-ink-3'">{{ currentStep > idx ? '✓' : idx + 1 }}</span>
          </div>
          <span
            class="mt-1 text-center text-[0.625rem] leading-snug min-[431px]:text-[0.6875rem]"
            :class="currentStep === idx ? 'font-bold text-primary' : 'text-ink-3'"
          >{{ step.label }}</span>
          <div
            v-if="idx < stepDefs.length - 1"
            class="absolute left-1/2 top-[0.6875rem] h-px w-full translate-x-[0.6875rem]"
            :class="currentStep > idx ? 'bg-primary' : 'bg-ink-4'"
          ></div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-hidden px-2 pt-2">
      <div v-if="currentStep === 0" class="h-full overflow-y-auto pb-2">
        <div class="mb-1 border border-line bg-surface p-3 shadow-card">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-[0.9375rem] font-bold text-ink">第一步：基础地理</span>
            <span class="border border-primary/35 bg-primary-light px-2 py-0.5 text-[0.6875rem] text-ink-2">信息校核</span>
          </div>

          <div class="mb-2 border border-primary/35 bg-primary-light p-2.5">
            <div class="mb-1">
              <span class="text-sm font-bold text-ink">海拔采集</span>
            </div>
            <span class="text-xs text-ink-2">按“我的 → 软件设置”中的来源和处理方式自动多次采样。气压海拔为估算值。</span>
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink after:text-danger after:content-['_*'] min-[431px]:w-[6.5rem] min-[431px]:text-sm">文物名称</span>
            <van-field v-model="form.name" class="min-h-11 min-w-0 flex-1 bg-transparent! p-0! text-sm" input-align="right" placeholder="请输入文物名称" maxlength="200" :border="false" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">曾用名</span>
            <van-field v-model="form.former_name" class="min-h-11 min-w-0 flex-1 bg-transparent! p-0! text-sm" input-align="right" placeholder="选填" maxlength="200" :border="false" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">编号模式</span>
            <div class="flex flex-1 justify-end">
              <div class="flex overflow-hidden border border-line">
                <div
                  class="flex min-h-11 min-w-14 items-center justify-center px-2 text-center text-xs"
                  :class="form.surveyCodeAuto ? 'bg-primary text-on-primary' : 'bg-fill text-ink-2'"
                  @click="form.surveyCodeAuto = true"
                >自动</div>
                <div
                  class="flex min-h-11 min-w-14 items-center justify-center px-2 text-center text-xs"
                  :class="!form.surveyCodeAuto ? 'bg-primary text-on-primary' : 'bg-fill text-ink-2'"
                  @click="form.surveyCodeAuto = false"
                >手动</div>
              </div>
            </div>
          </div>

          <div v-if="!form.surveyCodeAuto" class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink after:text-danger after:content-['_*'] min-[431px]:w-[6.5rem] min-[431px]:text-sm">普查编号</span>
            <van-field v-model="form.code" class="min-h-11 min-w-0 flex-1 bg-transparent! p-0! text-sm" input-align="right" placeholder="请输入普查编号" maxlength="50" :border="false" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink after:text-danger after:content-['_*'] min-[431px]:w-[6.5rem] min-[431px]:text-sm">时代</span>
            <van-field v-model="form.era" class="min-h-11 min-w-0 flex-1 bg-transparent! p-0! text-sm" input-align="right" placeholder="如：汉、唐宋" maxlength="100" :border="false" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink after:text-danger after:content-['_*'] min-[431px]:w-[6.5rem] min-[431px]:text-sm">文物类别</span>
            <AppSelect class="row-select" :options="categoryLabels" :model-value="categoryIndex" title="文物类别" @change="onCategoryChange" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink after:text-danger after:content-['_*'] min-[431px]:w-[6.5rem] min-[431px]:text-sm">经度</span>
            <van-field v-model="form.longitude" class="min-h-11 min-w-0 flex-1 bg-transparent! p-0! text-sm" input-align="right" type="text" inputmode="decimal" placeholder="自动采集或手动填写" :border="false" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink after:text-danger after:content-['_*'] min-[431px]:w-[6.5rem] min-[431px]:text-sm">纬度</span>
            <van-field v-model="form.latitude" class="min-h-11 min-w-0 flex-1 bg-transparent! p-0! text-sm" input-align="right" type="text" inputmode="decimal" placeholder="自动采集或手动填写" :border="false" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill py-1">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink after:text-danger after:content-['_*'] min-[431px]:w-[6.5rem] min-[431px]:text-sm">海拔</span>
            <div class="flex flex-1 items-center justify-end gap-1">
              <van-field v-model="form.altitude" class="min-h-11 min-w-[5.3rem] flex-1 bg-transparent! p-0! text-sm" input-align="right" type="text" inputmode="decimal" placeholder="自动采集或手动填写" :border="false" @update:model-value="onManualAltitude" />
              <div class="border px-1.5 py-0.5" :class="badgeClassMap[altitudeSource]">
                <span class="text-[0.6875rem]">{{ altitudeSourceLabel }}</span>
              </div>
              <div v-if="altitudeDetail" class="break-words py-1 text-right text-xs text-ink-2">{{ altitudeDetail }}</div>
            </div>
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">省/自治区</span>
            <AppSelect class="row-select" :options="provinceOptions" :model-value="provinceIndex" title="省/自治区" @change="onProvinceChange" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">市/州</span>
            <AppSelect class="row-select" :options="cityOptions" :model-value="cityIndex" title="市/州" @change="onCityChange" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">县/区</span>
            <AppSelect class="row-select" :options="countyOptions" :model-value="countyIndex" title="县/区" @change="onCountyChange" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">乡镇/街道</span>
            <van-field v-model="form.township" class="min-h-11 min-w-0 flex-1 bg-transparent! p-0! text-sm" input-align="right" placeholder="选填" maxlength="50" :border="false" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">村/社区</span>
            <van-field v-model="form.village" class="min-h-11 min-w-0 flex-1 bg-transparent! p-0! text-sm" input-align="right" placeholder="选填" maxlength="50" :border="false" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">详细地址</span>
            <van-field v-model="form.address" class="min-h-11 min-w-0 flex-1 bg-transparent! p-0! text-sm" input-align="right" placeholder="选填" maxlength="500" :border="false" />
          </div>

          <div class="mt-2 flex gap-1.5">
            <van-button type="primary" plain native-type="button" class="flex-1" :disabled="collectingLocation" @click="handleCollectCoordinate">采集坐标</van-button>
            <van-button type="primary" plain native-type="button" class="flex-1" :disabled="collectingLocation" @click="handleCollectAltitude">{{ collectingLocation ? '采集中…' : '采集海拔' }}</van-button>
          </div>
        </div>
      </div>

      <div v-if="currentStep === 1" class="h-full overflow-y-auto pb-2">
        <div class="step2-focus mb-1 border border-warning/45 bg-warning-bg p-3 shadow-card">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-[0.9375rem] font-bold text-ink">第二步：多点坐标</span>
            <span class="border border-warning/45 bg-warning-bg px-2 py-0.5 text-[0.6875rem] text-warning">高频核心操作区</span>
          </div>
          <div class="mb-2 border border-dashed border-warning/45 bg-warning-bg px-2 py-1.5">
            <span class="text-xs leading-relaxed text-warning">围绕遗址走动采集时，请优先使用“新增定位点”和“实时定位”完成边界点/标志点录入。</span>
          </div>
          <CoordinateCollectCard
            ref="coordRef"
            v-model="coordList"
            :heritage-name="form.name"
            :capture-point-data="capturePointData"
          />
          <div class="mt-2">
            <span class="text-xs font-semibold text-warning">当前边界点：{{ boundaryPointCount }} 个（至少 3 个）</span>
          </div>
        </div>
      </div>

      <div v-if="currentStep === 2" class="h-full overflow-y-auto pb-2">
        <div class="mb-1 border border-line bg-surface p-3 shadow-card">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-[0.9375rem] font-bold text-ink">第三步：多媒体/审核</span>
            <span class="border border-primary/35 bg-primary-light px-2 py-0.5 text-[0.6875rem] text-ink-2">提交前复核</span>
          </div>

          <div class="border-b border-fill py-2">
            <div class="mb-1 flex items-baseline justify-between">
              <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink after:text-danger after:content-['_*'] min-[431px]:w-[6.5rem] min-[431px]:text-sm">现场照片</span>
              <span class="text-[0.7188rem] text-ink-3">最多 10 张</span>
            </div>
            <div class="grid grid-cols-2 gap-1.5 min-[431px]:grid-cols-3">
              <div v-for="(item, idx) in photos" :key="item.id" class="relative h-[5.25rem] overflow-hidden bg-fill">
                <img :src="item.path" class="block size-full object-cover" />
                <div class="absolute right-0.5 top-0.5 flex size-11 items-start justify-end" @click="removePhoto(idx)">
                  <span class="flex size-[1.125rem] items-center justify-center bg-black/50 text-[0.625rem] text-white">删</span>
                </div>
              </div>
              <div
                v-if="photos.length < 10"
                class="relative flex h-[5.25rem] items-center justify-center overflow-hidden border border-dashed border-primary/35 bg-primary-light"
                @click="pickPhoto"
              >
                <span class="text-[0.7813rem] text-primary">添加照片</span>
              </div>
            </div>
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">保护级别</span>
            <AppSelect class="row-select" :options="protectionLabels" :model-value="protectionIndex" title="保护级别" @change="onProtectionChange" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">权属</span>
            <AppSelect class="row-select" :options="ownershipLabels" :model-value="ownershipIndex" title="权属" @change="onOwnershipChange" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">保存现状</span>
            <AppSelect class="row-select" :options="preservationLabels" :model-value="preservationIndex" title="保存现状" @change="onPreservationChange" />
          </div>

          <div class="flex min-h-11 items-center justify-between gap-2 border-b border-fill">
            <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink after:text-danger after:content-['_*'] min-[431px]:w-[6.5rem] min-[431px]:text-sm">普查员签名</span>
            <van-button type="primary" plain native-type="button" class="max-w-[11.25rem] flex-1" @click="collectSignature">采集签名</van-button>
          </div>
          <div v-if="signStatus" class="mb-1 mt-1">
            <span class="text-xs text-ink-2">{{ signStatus }}</span>
          </div>

          <div class="py-2">
            <div class="mb-1 flex items-baseline justify-between">
              <span class="w-[5.5rem] shrink-0 text-[0.8125rem] text-ink min-[431px]:w-[6.5rem] min-[431px]:text-sm">现场备注</span>
              <span class="text-[0.7188rem] text-ink-3">限 2000 字</span>
            </div>
            <van-field
              v-model="form.remark"
              class="border border-line bg-surface! p-2! text-[0.8438rem]"
              type="textarea"
              rows="4"
              autosize
              maxlength="2000"
              placeholder="请填写现场情况、病害信息、交通与环境说明"
              :border="false"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-line bg-surface px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
      <div v-if="currentStep === 0" class="flex items-center justify-center gap-1.5">
        <van-button type="primary" native-type="button" class="w-4/5" @click="goStep1ToStep2">下一步：采集坐标</van-button>
      </div>

      <div v-if="currentStep === 1" class="flex items-center gap-1.5">
        <van-button native-type="button" class="flex-[0_0_30%]" @click="goPrevStep">返回上一步</van-button>
        <van-button type="primary" native-type="button" class="flex-[0_0_calc(70%-0.3125rem)]" @click="goStep2ToStep3">下一步：多媒体/审核</van-button>
      </div>

      <div v-if="currentStep === 2" class="flex items-center gap-1.5">
        <van-button native-type="button" class="flex-[0_0_30%]" @click="goPrevStep">返回上一步</van-button>
        <van-button type="success" native-type="button" class="flex-[0_0_calc(70%-0.3125rem)]" :disabled="loading" @click="handleSubmit">
          {{ loading ? '提交中...' : '完成并提交数据' }}
        </van-button>
      </div>
    </div>
  </div>
</template>


<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { CHINA_REGION_TREE, DEFAULT_REGION } from '@/lib/china_regions.js';
import { addWatermark } from '@/lib/watermark.js';
import { getUser } from '@/lib/auth.js';
import { toast } from '@/lib/ui.js';
import { chooseImage } from '@/lib/native.js';
import { getGpsLocation, getPressure } from '@/lib/sensors.js';
import { loadAltitudeSettings } from '@/lib/altitude-settings.js';
import { collectHardwareAltitude } from '@/lib/altitude.js';
import CoordinateCollectCard from './CoordinateCollectCard.vue';
import AppSelect from './AppSelect.vue';

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

const collectingLocation = ref(false);
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
const altitudeDetail = ref('');
const badgeClassMap = {
  dem: 'border-success/45 bg-success-bg text-success',
  hardware: 'border-warning/45 bg-warning-bg text-warning',
  manual: 'border-line bg-fill text-ink-2',
  alert: 'border-danger/45 bg-danger-bg text-danger',
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
  if (altitudeSource.value === 'hardware') return '🟢 手机硬件采集';
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
  form.altitude = altitude != null && Number.isFinite(Number(altitude)) ? Number(altitude).toFixed(2) : '';
  altitudeDetail.value = sourceTag;
  if (sourceKey === 'hardware') altitudeSource.value = 'hardware';
  else if (sourceKey === 'alert') altitudeSource.value = 'alert';
  else altitudeSource.value = 'manual';
  toast(sourceTag, { icon: 'none', duration: 1800 });
}

function onManualAltitude() {
  altitudeSource.value = 'manual';
  altitudeDetail.value = '';
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
  return collectHardwareAltitude(loadAltitudeSettings(), { getGpsLocation, getPressure });
}

async function handleCollectCoordinate() {
  if (collectingLocation.value) return;
  collectingLocation.value = true;
  try {
    const r = await capturePointData();
    form.longitude = Number(r.longitude).toFixed(8);
    form.latitude = Number(r.latitude).toFixed(8);
    setMainAltitude(r.altitude, r.sourceTag, r.sourceKey);
  } catch (error) {
    toast(error?.errMsg || error?.message || '定位采集失败，请重试', { icon: 'none' });
  } finally {
    collectingLocation.value = false;
  }
}

async function handleCollectAltitude() {
  if (collectingLocation.value) return;
  collectingLocation.value = true;
  try {
    const r = await capturePointData();
    if (Number.isFinite(Number(r.longitude)) && Number.isFinite(Number(r.latitude))) {
      form.longitude = Number(r.longitude).toFixed(8);
      form.latitude = Number(r.latitude).toFixed(8);
    }
    setMainAltitude(r.altitude, r.sourceTag, r.sourceKey);
  } catch (error) {
    toast(error?.errMsg || error?.message || '海拔采集失败，请重试', { icon: 'none' });
  } finally {
    collectingLocation.value = false;
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
    altitude_mode: 'hardware',
    altitude_source: altitudeSource.value,
    photos: photos.value,
    signature_status: signStatus.value,
  });
}

defineExpose({
  form,
  capturePointData,
});
</script>

<style scoped>
/* AppSelect 内部按钮文字右对齐，与 van-field 右对齐一致 */
.row-select :deep(button) {
  min-height: 2.75rem;
  text-align: right;
}

.step2-focus :deep(.coord-card) {
  background: var(--c-warning-bg);
  border-color: rgba(var(--c-warning-rgb), 0.45);
}

.step2-focus :deep(.btn-add),
.step2-focus :deep(.btn-grab) {
  background: var(--c-warning-bg);
  border-color: var(--c-warning);
  color: var(--c-warning);
  font-weight: 700;
}

:deep(.van-radio__icon) {
  margin-top: 0.125rem;
}

:deep(.van-field__control::placeholder) {
  color: var(--c-text-4);
}
</style>
