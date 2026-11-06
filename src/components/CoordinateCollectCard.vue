<template>
  <div class="coord-card">
    <div class="card-head">
      <span class="card-title">区块2：坐标采集</span>
      <span class="card-subtitle">边界点至少 3 个；标志点/其他为可选</span>
    </div>

    <div class="head-actions">
      <button type="button" class="btn-add" @click="addPoint">新增定位点</button>
    </div>

    <div v-if="coordList.length === 0" class="empty-wrap">
      <span class="empty-text">暂无坐标点，请点击“新增定位点”</span>
    </div>

    <div v-for="(item, index) in coordList" :key="item.id" class="point-brief" :style="pointThemeStyle(index)">
      <div class="brief-head">
        <span class="brief-title">定位点 {{ index + 1 }}</span>
        <span class="brief-type">{{ typeLabelByValue[item.type] }}</span>
      </div>
      <div class="brief-body">
        <span class="brief-row">经度：{{ item.longitude || '未填' }}</span>
        <span class="brief-row">纬度：{{ item.latitude || '未填' }}</span>
        <span class="brief-row">海拔：{{ item.altitude || '未填' }}</span>
      </div>
      <div class="brief-actions">
        <button type="button" class="btn-open" @click="openPointWindow(item.id)">打开坐标窗口</button>
        <button type="button" class="btn-delete" @click="removePoint(index)">删除</button>
      </div>
    </div>

    <div v-if="pointWindowVisible && activePoint" class="point-overlay" @click.self="closePointWindow">
      <div class="point-window" :style="pointThemeStyle(activePointIndex)">
        <div class="window-head">
          <span class="window-title">定位点 {{ activePointIndex + 1 }} 坐标窗口</span>
          <button type="button" class="btn-close" @click="closePointWindow">关闭</button>
        </div>

        <div class="form-row">
          <span class="row-label required">坐标类型</span>
          <div class="row-right">
            <select class="picker-value" :value="getTypePickerIndex(activePoint.type)" @change="onTypeChange({ detail: { value: Number($event.target.value) } }, activePoint)">
              <option v-for="(label, i) in typeLabelList" :key="label" :value="i">{{ label }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <span class="row-label required">经度</span>
          <div class="row-right">
            <input class="row-input" type="number" inputmode="decimal" step="any" :value="activePoint.longitude" placeholder="自动抓取或手动填写" @input="onFieldInput($event, activePoint, 'longitude')" />
          </div>
        </div>

        <div class="form-row">
          <span class="row-label required">纬度</span>
          <div class="row-right">
            <input class="row-input" type="number" inputmode="decimal" step="any" :value="activePoint.latitude" placeholder="自动抓取或手动填写" @input="onFieldInput($event, activePoint, 'latitude')" />
          </div>
        </div>

        <div class="form-row">
          <span class="row-label required">海拔(米)</span>
          <div class="row-right">
            <input class="row-input" type="number" inputmode="decimal" step="any" :value="activePoint.altitude" placeholder="自动抓取或手动填写" @input="onFieldInput($event, activePoint, 'altitude')" />
          </div>
        </div>

        <div v-if="activePoint.sourceTag" class="form-row">
          <span class="row-label">高程来源</span>
          <div class="row-right source-tag-wrap">
            <span class="source-tag-text">{{ activePoint.sourceTag }}</span>
          </div>
        </div>

        <div class="form-row">
          <span class="row-label required">点位说明</span>
          <input class="row-right row-input" :value="activePoint.description" maxlength="200" placeholder="请输入坐标点说明" @input="onDescriptionInput($event, activePoint)" />
        </div>

        <div class="form-row">
          <span class="row-label">备注</span>
          <input class="row-right row-input" :value="activePoint.remark" maxlength="200" placeholder="选填" @input="onFieldInput($event, activePoint, 'remark')" />
        </div>

        <div class="window-actions">
          <button type="button" class="btn-grab" :disabled="isPointLoading(activePoint.id)" @click="grabPoint(activePoint)">
            {{ isPointLoading(activePoint.id) ? '定位中' : '实时定位' }}
          </button>
          <button type="button" class="btn-finish" @click="closePointWindow">完成当前点位</button>
        </div>
      </div>
    </div>

    <div class="footer-tip">
      <span class="tip-text">边界点数量：{{ boundaryCount }} 个</span>
      <span v-if="boundaryCount < 3" class="tip-warn">提交前至少补齐 3 个边界点</span>
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

const pointThemes = [
  { bg: '#FFFBE6', border: '#FFE58F' },
  { bg: '#F6FFED', border: '#B7EB8F' },
  { bg: '#E6F7FF', border: '#91D5FF' },
  { bg: '#F9F0FF', border: '#D3ADF7' },
  { bg: '#FFF1F0', border: '#FFA39E' },
  { bg: '#FCFFE6', border: '#D3F261' },
  { bg: '#E6FFFB', border: '#87E8DE' },
  { bg: '#F0F5FF', border: '#ADC6FF' },
  { bg: '#FFF7E6', border: '#FFD591' },
  { bg: '#F4FFB8', border: '#D3F261' },
  { bg: '#FFF0F6', border: '#FFADD2' },
  { bg: '#E6F4FF', border: '#69B1FF' },
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
    description: raw?.description || (type === 'boundary' ? buildBoundaryDefaultDescription() : ''),
    remark: raw?.remark || '',
    // 内部标记：description 是否由系统自动填充，便于切换类型时安全覆盖。
    _descriptionAuto: raw?._descriptionAuto !== undefined ? !!raw._descriptionAuto : type === 'boundary',
  };
}

function syncFromModelValue() {
  coordList.splice(0, coordList.length, ...(props.modelValue || []).map((item) => normalizePoint(item)));
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
  if (index < pointThemes.length) return pointThemes[index];

  // 超出预置色后，按黄金角生成色相，减少相邻点位重复感。
  const generatedIndex = index - pointThemes.length;
  const hue = Math.round((generatedIndex * 137.508) % 360);
  const saturation = 70 + (generatedIndex % 3) * 4;
  const bgLightness = 95 - (generatedIndex % 2) * 2;
  const borderLightness = 78 - (generatedIndex % 3) * 3;
  return {
    bg: `hsl(${hue}, ${saturation}%, ${bgLightness}%)`,
    border: `hsl(${hue}, ${Math.min(90, saturation + 2)}%, ${borderLightness}%)`,
  };
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

function onFieldInput(event, item, fieldName) {
  item[fieldName] = event?.target?.value ?? '';
  if (fieldName === 'altitude') item.sourceTag = '手动录入';
  emitModel();
}

function onDescriptionInput(event, item) {
  item.description = event?.target?.value ?? '';
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

    // 任一抓取按钮均刷新当前点的经纬高，确保同一时刻采集数据一致。
    if (Number.isFinite(Number(result.longitude))) {
      item.longitude = Number(result.longitude).toFixed(6);
    }
    if (Number.isFinite(Number(result.latitude))) {
      item.latitude = Number(result.latitude).toFixed(6);
    }
    item.altitude = result.altitude != null && Number.isFinite(Number(result.altitude))
      ? Number(result.altitude).toFixed(2)
      : '';
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
.coord-card {
  background: #ffffff;
  border-radius: 7px;
  padding: 10px 10px 5px;
  border: 0.5px solid #eef1f5;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.card-title {
  font-size: 15px;
  color: #595959;
  font-weight: 700;
}

.card-subtitle {
  font-size: 11px;
  color: #8c8c8c;
}

.head-actions {
  margin-bottom: 5px;
}

.btn-add {
  min-height: 35px;
  line-height: 35px;
  border-radius: 5px;
  border: 0.5px solid #c6e6ff;
  background: #f5fbff;
  color: #003a8c;
  font-size: 13px;
  padding: 0 10px;
  font-weight: 700;
}

.empty-wrap {
  padding: 10px 0 6px;
}

.empty-text {
  font-size: 12px;
  color: #8c8c8c;
}

.point-brief {
  margin-bottom: 5px;
  border: 0.5px solid #d9d9d9;
  border-radius: 6px;
  padding: 6px;
}

.brief-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brief-title {
  font-size: 14px;
  color: #1f1f1f;
  font-weight: 700;
}

.brief-type {
  font-size: 11px;
  color: #8c8c8c;
}

.brief-body {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.brief-row {
  font-size: 12px;
  color: #434343;
}

.brief-actions {
  margin-top: 5px;
  display: flex;
  gap: 4px;
}

.btn-open,
.btn-delete {
  flex: 1;
  min-height: 30px;
  line-height: 30px;
  border-radius: 4px;
  font-size: 12px;
}

.btn-open {
  border: 0.5px solid #91d5ff;
  background: #e6f7ff;
  color: #0958d9;
}

.btn-delete {
  border: 0.5px solid #ffa39e;
  background: #fff1f0;
  color: #cf1322;
}

.point-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.38);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 0 8px;
}

.point-window {
  width: calc(100% - 12px);
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 8px;
  max-height: 82vh;
  overflow-y: auto;
}

.window-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.window-title {
  font-size: 15px;
  color: #262626;
  font-weight: 700;
}

.btn-close {
  min-width: 48px;
  height: 29px;
  line-height: 29px;
  border-radius: 4px;
  border: 0.5px solid #d9d9d9;
  background: #ffffff;
  color: #595959;
  font-size: 12px;
}

.form-row {
  min-height: 39px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.row-label {
  width: 100px;
  flex-shrink: 0;
  font-size: 15px;
  color: #001529;
  line-height: 1.4;
}

.row-label.required::after {
  content: ' *';
  color: #cf1322;
}

.row-right {
  flex: 1;
  min-width: 0;
}

.row-input,
.picker-value {
  width: 100%;
  min-height: 32px;
  line-height: 32px;
  border: 0.5px solid #d9d9d9;
  border-radius: 5px;
  background: #ffffff;
  box-sizing: border-box;
  padding: 0 8px;
  text-align: right;
  font-size: 14px;
  color: #262626;
  outline: none;
}

.picker-value {
  text-align-last: right;
}

.btn-grab {
  flex-shrink: 0;
  min-width: 90px;
  min-height: 32px;
  line-height: 32px;
  border-radius: 5px;
  border: 0.5px solid #bcdcff;
  background: #e6f7ff;
  color: #003a8c;
  font-size: 12px;
  font-weight: 700;
  padding: 0 6px;
}

.btn-grab[disabled] {
  opacity: 0.7;
}

.window-actions {
  margin-top: 6px;
  display: flex;
  gap: 5px;
}

.btn-finish {
  flex: 1;
  min-height: 32px;
  line-height: 32px;
  border-radius: 5px;
  border: 0.5px solid #95de64;
  background: #f6ffed;
  color: #237804;
  font-size: 12px;
  font-weight: 700;
}

.source-tag-wrap {
  display: flex;
  justify-content: flex-end;
}

.source-tag-text {
  font-size: 12px;
  color: #595959;
  background: #f5f7fa;
  border: 0.5px solid #d9d9d9;
  border-radius: 4px;
  padding: 3px 6px;
}

.footer-tip {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tip-text {
  font-size: 12px;
  color: #595959;
}

.tip-warn {
  font-size: 12px;
  color: #cf1322;
}

@media screen and (max-width: 430px) {
  .coord-card {
    padding: 8px 8px 4px;
  }

  .row-label {
    width: 83px;
    font-size: 14px;
  }

  .row-input,
  .picker-value {
    font-size: 13px;
  }

  .btn-grab {
    min-width: 75px;
    font-size: 11px;
  }
}
</style>
