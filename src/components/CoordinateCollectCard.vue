<template>
  <div class="border border-line bg-surface p-3">
    <div class="mb-1 flex flex-wrap items-baseline justify-between gap-2">
      <span class="text-[0.9375rem] font-bold text-ink-2">区块2：坐标采集</span>
      <span class="text-[0.6875rem] text-ink-3">边界点至少 3 个；标志点/其他为可选</span>
    </div>

    <div class="mb-1">
      <van-button type="primary" plain native-type="button" @click="addPoint">新增定位点</van-button>
    </div>

    <div v-if="coordList.length === 0" class="py-2.5 pb-1.5">
      <span class="text-xs text-ink-3">暂无坐标点，请点击“新增定位点”</span>
    </div>

    <div v-for="(item, index) in coordList" :key="item.id" class="mb-1 border p-1.5" :style="pointThemeStyle(index)">
      <div class="flex items-center justify-between">
        <span class="text-sm font-bold text-ink">定位点 {{ index + 1 }}</span>
        <span class="text-[0.6875rem] text-ink-3">{{ typeLabelByValue[item.type] }}</span>
      </div>
      <div class="mt-1 flex flex-col gap-px text-xs text-ink-2">
        <span>经度：{{ item.longitude || '未填' }}</span>
        <span>纬度：{{ item.latitude || '未填' }}</span>
        <span>海拔：{{ item.altitude || '未填' }}</span>
      </div>
      <div class="mt-1 flex gap-1">
        <van-button type="primary" plain native-type="button" class="flex-1" @click="openPointWindow(item.id)">打开坐标窗口</van-button>
        <van-button type="danger" plain native-type="button" class="flex-1" @click="removePoint(index)">删除</van-button>
      </div>
    </div>

    <div v-if="pointWindowVisible && activePoint" class="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 px-0 pb-2" @click.self="closePointWindow">
      <div class="max-h-[82vh] w-[calc(100%-0.75rem)] overflow-y-auto border border-line bg-surface p-2" :style="pointThemeStyle(activePointIndex)">
        <div class="mb-1 flex items-center justify-between">
          <span class="text-[0.9375rem] font-bold text-ink">定位点 {{ activePointIndex + 1 }} 坐标窗口</span>
          <van-button native-type="button" @click="closePointWindow">关闭</van-button>
        </div>

        <div class="mb-1 flex min-h-11 items-center justify-between gap-2">
          <span class="w-[6.25rem] shrink-0 text-[0.9375rem] leading-[1.4] text-ink">坐标类型<span class="text-danger"> *</span></span>
          <AppSelect class="min-w-0 flex-1" :options="typeLabelList" :model-value="getTypePickerIndex(activePoint.type)" @change="onTypeChange($event, activePoint)" />
        </div>

        <div class="mb-1 flex min-h-11 items-center justify-between gap-2">
          <span class="w-[6.25rem] shrink-0 text-[0.9375rem] leading-[1.4] text-ink">经度<span class="text-danger"> *</span></span>
          <van-field class="min-h-11 min-w-0 flex-1 !border !border-line !bg-surface !px-2 !py-0 text-right text-sm text-ink" type="number" inputmode="decimal" step="any" :model-value="activePoint.longitude" placeholder="自动抓取或手动填写" input-align="right" :border="false" @update:model-value="onFieldInput($event, activePoint, 'longitude')" />
        </div>

        <div class="mb-1 flex min-h-11 items-center justify-between gap-2">
          <span class="w-[6.25rem] shrink-0 text-[0.9375rem] leading-[1.4] text-ink">纬度<span class="text-danger"> *</span></span>
          <van-field class="min-h-11 min-w-0 flex-1 !border !border-line !bg-surface !px-2 !py-0 text-right text-sm text-ink" type="number" inputmode="decimal" step="any" :model-value="activePoint.latitude" placeholder="自动抓取或手动填写" input-align="right" :border="false" @update:model-value="onFieldInput($event, activePoint, 'latitude')" />
        </div>

        <div class="mb-1 flex min-h-11 items-center justify-between gap-2">
          <span class="w-[6.25rem] shrink-0 text-[0.9375rem] leading-[1.4] text-ink">海拔(米)<span class="text-danger"> *</span></span>
          <van-field class="min-h-11 min-w-0 flex-1 !border !border-line !bg-surface !px-2 !py-0 text-right text-sm text-ink" type="number" inputmode="decimal" step="any" :model-value="activePoint.altitude" placeholder="自动抓取或手动填写" input-align="right" :border="false" @update:model-value="onFieldInput($event, activePoint, 'altitude')" />
        </div>

        <div v-if="activePoint.sourceTag" class="mb-1 flex min-h-11 items-center justify-between gap-2">
          <span class="w-[6.25rem] shrink-0 text-[0.9375rem] leading-[1.4] text-ink">高程来源</span>
          <div class="flex min-w-0 flex-1 justify-end">
            <span class="border border-line bg-fill px-1.5 py-[0.1875rem] text-xs text-ink-2">{{ activePoint.sourceTag }}</span>
          </div>
        </div>

        <div class="mb-1 flex min-h-11 items-center justify-between gap-2">
          <span class="w-[6.25rem] shrink-0 text-[0.9375rem] leading-[1.4] text-ink">点位说明<span class="text-danger"> *</span></span>
          <van-field class="min-h-11 min-w-0 flex-1 !border !border-line !bg-surface !px-2 !py-0 text-right text-sm text-ink" :model-value="activePoint.description" maxlength="200" placeholder="请输入坐标点说明" input-align="right" :border="false" @update:model-value="onDescriptionInput($event, activePoint)" />
        </div>

        <div class="mb-1 flex min-h-11 items-center justify-between gap-2">
          <span class="w-[6.25rem] shrink-0 text-[0.9375rem] leading-[1.4] text-ink">备注</span>
          <van-field class="min-h-11 min-w-0 flex-1 !border !border-line !bg-surface !px-2 !py-0 text-right text-sm text-ink" :model-value="activePoint.remark" maxlength="200" placeholder="选填" input-align="right" :border="false" @update:model-value="onFieldInput($event, activePoint, 'remark')" />
        </div>

        <div class="mt-1.5 flex gap-1">
          <van-button type="primary" plain native-type="button" class="!shrink-0" :disabled="isPointLoading(activePoint.id) || loadingMap[activePoint.id]?.sampling" @click="grabPoint(activePoint)">
            {{ isPointLoading(activePoint.id) ? '定位中' : '实时定位' }}
          </van-button>
          <van-button native-type="button" class="flex-1" @click="closePointWindow">完成当前点位</van-button>
        </div>
        <HighAccuracyCapture ref="surveyRef" :key="activePoint.id" :disabled="isPointLoading(activePoint.id)" @collecting="setLoading(activePoint.id, 'sampling', $event)" @captured="applySurveyPoint(activePoint, $event)" />
      </div>
    </div>

    <div class="mt-1 flex items-center gap-2">
      <span class="text-xs text-ink-2">边界点数量：{{ boundaryCount }} 个</span>
      <span v-if="boundaryCount < 3" class="text-xs text-danger">提交前至少补齐 3 个边界点</span>
    </div>
  </div>
</template>

<script setup>
/**
 * 区块2：坐标采集（四普现场采集）
 * ------------------------------------------------------------
 * 组件能力：
 * 1. 动态增删坐标点（边界点 / 标志点 / 其他）
 * 2. 单点经纬高“抓取”并回填（仅写入当前点）
 * 3. 类型切换时智能生成“点位说明”默认文本（可手工改）
 * 4. 暴露 validateBeforeSubmit() 供父页面“硬拦截提交”
 *
 * 依赖约定（父组件需传入 capturePointData）：
 * - capturePointData: async () => ({ longitude, latitude, altitude })
 *   建议父页面内部复用现有 DEM 优先 + 硬件兜底逻辑。
 */
import { computed, reactive, ref, watch } from 'vue';
import { toast } from '@/lib/ui.js';
import HighAccuracyCapture from './HighAccuracyCapture.vue';
import AppSelect from './AppSelect.vue';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  heritageName: {
    type: String,
    default: '',
  },
  capturePointData: {
    type: Function,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue']);

const typeLabelByValue = {
  boundary: '边界点',
  marker: '标志点',
  other: '其他',
};

const typeValueByLabel = {
  边界点: 'boundary',
  标志点: 'marker',
  其他: 'other',
};

const typeLabelList = ['边界点', '标志点', '其他'];

const coordList = reactive([]);
const loadingMap = reactive({});
const pointWindowVisible = ref(false);
const activePointId = ref('');
const surveyRef = ref(null);

const pointThemes = [
  { bg: 'var(--c-warning-bg)', border: 'rgba(var(--c-warning-rgb), 0.45)' },
  { bg: 'var(--c-success-bg)', border: 'rgba(var(--c-success-rgb), 0.45)' },
  { bg: 'var(--c-info-bg)', border: 'rgba(var(--c-info-rgb), 0.45)' },
  { bg: 'var(--c-primary-light)', border: 'rgba(var(--c-primary-rgb), 0.45)' },
  { bg: 'var(--c-danger-bg)', border: 'rgba(var(--c-danger-rgb), 0.45)' },
];
let uidSeed = 0;

function nextId() {
  uidSeed += 1;
  return `coord_${Date.now()}_${uidSeed}`;
}

function buildBoundaryDefaultDescription() {
  const name = String(props.heritageName || '').trim();
  if (name) return `${name}边界点`;
  return '该文物点边界点';
}

function normalizePoint(raw) {
  const type = raw?.type && typeLabelByValue[raw.type] ? raw.type : 'boundary';
  return {
    id: raw?.id || nextId(),
    type,
    longitude: raw?.longitude != null ? String(raw.longitude) : '',
    latitude: raw?.latitude != null ? String(raw.latitude) : '',
    altitude: raw?.altitude != null ? String(raw.altitude) : '',
    sourceTag: raw?.sourceTag != null ? String(raw.sourceTag) : '',
    survey: raw?.survey ?? null,
    description: raw?.description || (type === 'boundary' ? buildBoundaryDefaultDescription() : ''),
    remark: raw?.remark || '',
    // 内部标记：description 是否由系统自动填充，便于切换类型时安全覆盖。
    _descriptionAuto: raw?._descriptionAuto !== undefined ? !!raw._descriptionAuto : type === 'boundary',
  };
}

function syncFromModelValue() {
  // v-model 只输出业务字段；回写时保留本机点位 id，避免当前窗口失去选中点或采样被卸载。
  const next = (props.modelValue || []).map((item, index) => normalizePoint({ ...item, id: item?.id || coordList[index]?.id }));
  coordList.splice(0, coordList.length, ...next);
}

watch(
  () => props.modelValue,
  () => {
    syncFromModelValue();
  },
  { immediate: true, deep: true }
);

watch(
  () => props.heritageName,
  () => {
    // 文物名称改变后，仅更新仍保持“自动描述”状态的边界点，避免覆盖人工编辑。
    coordList.forEach((item) => {
      if (item.type === 'boundary' && item._descriptionAuto) {
        item.description = buildBoundaryDefaultDescription();
      }
    });
    emitModel();
  }
);

function emitModel() {
  // 对外只输出业务字段，内部字段（id/_descriptionAuto）不透出。
  const payload = coordList.map((item) => ({
    type: item.type,
    longitude: item.longitude,
    latitude: item.latitude,
    altitude: item.altitude,
    sourceTag: item.sourceTag,
    survey: item.survey,
    description: item.description,
    remark: item.remark,
  }));
  emit('update:modelValue', payload);
}

function pointThemeStyle(index) {
  const theme = getPointTheme(index);
  return {
    background: theme.bg,
    borderColor: theme.border,
  };
}

function getPointTheme(index) {
  return pointThemes[index % pointThemes.length];
}
const activePointIndex = computed(() => {
  return coordList.findIndex((item) => item.id === activePointId.value);
});

const activePoint = computed(() => {
  if (activePointIndex.value < 0) return null;
  return coordList[activePointIndex.value] || null;
});

function openPointWindow(pointId) {
  activePointId.value = pointId;
  pointWindowVisible.value = true;
}

function closePointWindow() {
  surveyRef.value?.cancel();
  if (activePointId.value) setLoading(activePointId.value, 'sampling', false);
  pointWindowVisible.value = false;
}

function addPoint() {
  const point = normalizePoint({
    type: 'boundary',
    description: buildBoundaryDefaultDescription(),
    _descriptionAuto: true,
  });

  coordList.push(point);
  emitModel();
  openPointWindow(point.id);
}

function removePoint(index) {
  const removed = coordList[index];
  coordList.splice(index, 1);
  if (removed && removed.id === activePointId.value) {
    closePointWindow();
    activePointId.value = '';
  }
  emitModel();
}

function onTypeChange(event, item) {
  const idx = Number(event?.detail?.value || 0);
  const label = typeLabelList[idx] || '边界点';
  const newType = typeValueByLabel[label] || 'boundary';
  const oldType = item.type;

  item.type = newType;

  // 智能联动：切到边界点时，若当前说明为空或仍是自动文本，则自动刷新说明。
  if (newType === 'boundary') {
    const current = String(item.description || '').trim();
    const oldAutoText = buildBoundaryDefaultDescription();
    if (!current || item._descriptionAuto || oldType !== 'boundary' || current === oldAutoText) {
      item.description = buildBoundaryDefaultDescription();
      item._descriptionAuto = true;
    }
  } else if (item._descriptionAuto) {
    // 从边界点切出时，如果说明还是自动文本，则清空为手工可写的空值。
    item.description = '';
    item._descriptionAuto = false;
  }

  emitModel();
}

function onFieldInput(value, item, fieldName) {
  if (['longitude', 'latitude', 'altitude'].includes(fieldName)) surveyRef.value?.cancel();
  item[fieldName] = value == null ? '' : String(value);
  if (fieldName === 'altitude') item.sourceTag = '手动录入';
  if (['longitude', 'latitude', 'altitude'].includes(fieldName)) {
    if (item.survey) item.sourceTag = '手动录入（原采样精度已失效）';
    item.survey = null;
  }
  emitModel();
}

function applySurveyPoint(item, point) {
  item.longitude = point.longitude.toFixed(8);
  item.latitude = point.latitude.toFixed(8);
  item.altitude = point.altitude == null ? '' : point.altitude.toFixed(2);
  item.sourceTag = 'GPS静止多点平均（未作高程校准）';
  item.survey = point;
  emitModel();
}

function onDescriptionInput(value, item) {
  item.description = value == null ? '' : String(value);
  // 说明一旦人工输入，关闭自动覆盖。
  item._descriptionAuto = false;
  emitModel();
}

function getTypePickerIndex(typeValue) {
  const label = typeLabelByValue[typeValue] || '边界点';
  const idx = typeLabelList.findIndex((x) => x === label);
  return idx >= 0 ? idx : 0;
}

function setLoading(pointId, field, loading) {
  if (!loadingMap[pointId]) loadingMap[pointId] = {};
  loadingMap[pointId][field] = loading;
}

function isPointLoading(pointId) {
  return !!loadingMap[pointId]?.all;
}

async function grabPoint(item) {
  if (typeof props.capturePointData !== 'function') {
    toast('未配置定位抓取逻辑', { icon: 'none' });
    return;
  }

  try {
    setLoading(item.id, 'all', true);
    const result = await props.capturePointData(item);
    if (!result || typeof result !== 'object') {
      toast('抓取失败，请重试', { icon: 'none' });
      return;
    }
    item.survey = null;

    // 任一抓取按钮均刷新当前点的经纬高，确保同一时刻采集数据一致。
    if (Number.isFinite(Number(result.longitude))) {
      item.longitude = Number(result.longitude).toFixed(6);
    }
    if (Number.isFinite(Number(result.latitude))) {
      item.latitude = Number(result.latitude).toFixed(6);
    }
    item.altitude = result.altitude != null && Number.isFinite(Number(result.altitude))
      ? Number(result.altitude).toFixed(2) : '';
    if (result.sourceTag != null) {
      item.sourceTag = String(result.sourceTag);
    }

    emitModel();
    toast(result.sourceTag || '当前点位抓取成功', { icon: 'none', duration: 3000 });
  } catch (error) {
    toast(error?.errMsg || error?.message || '定位抓取失败', { icon: 'none' });
  } finally {
    setLoading(item.id, 'all', false);
  }
}

const boundaryCount = computed(() => coordList.filter((item) => item.type === 'boundary').length);

/**
 * 供父页面提交前调用：边界点至少 3 个，否则拦截。
 */
function validateBeforeSubmit() {
  if (boundaryCount.value < 3) {
    return {
      ok: false,
      message: '边界点至少需要 3 个，无法提交。',
    };
  }
  return { ok: true, message: '' };
}

/**
 * 可选：父页面直接获取当前坐标数据（业务字段）。
 */
function getCoordPayload() {
  return coordList.map((item) => ({
    type: item.type,
    longitude: item.longitude,
    latitude: item.latitude,
    altitude: item.altitude,
    sourceTag: item.sourceTag,
    description: item.description,
    remark: item.remark,
  }));
}

defineExpose({
  validateBeforeSubmit,
  getCoordPayload,
  addPoint,
  coordList,
});
</script>

<style scoped>
:deep(.min-h-10) { min-height: 2.75rem !important; }
</style>
