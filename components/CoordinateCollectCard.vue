<template>
  <view class="coord-card">
    <view class="card-head">
      <text class="card-title">区块2：坐标采集</text>
      <text class="card-subtitle">边界点至少 3 个；标志点/其他为可选</text>
    </view>

    <view class="head-actions">
      <button class="btn-add" @click="addPoint">新增定位点</button>
    </view>

    <view v-if="coordList.length === 0" class="empty-wrap">
      <text class="empty-text">暂无坐标点，请点击“新增定位点”</text>
    </view>

    <view v-for="(item, index) in coordList" :key="item.id" class="point-brief" :style="pointThemeStyle(index)">
      <view class="brief-head">
        <text class="brief-title">定位点 {{ index + 1 }}</text>
        <text class="brief-type">{{ typeLabelByValue[item.type] }}</text>
      </view>
      <view class="brief-body">
        <text class="brief-row">经度：{{ item.longitude || '未填' }}</text>
        <text class="brief-row">纬度：{{ item.latitude || '未填' }}</text>
        <text class="brief-row">海拔：{{ item.altitude || '未填' }}</text>
      </view>
      <view class="brief-actions">
        <button class="btn-open" @click="openPointWindow(item.id)">打开坐标窗口</button>
        <button class="btn-delete" @click="removePoint(index)">删除</button>
      </view>
    </view>

    <view v-if="pointWindowVisible && activePoint" class="point-overlay" @click.self="closePointWindow">
      <view class="point-window" :style="pointThemeStyle(activePointIndex)">
        <view class="window-head">
          <text class="window-title">定位点 {{ activePointIndex + 1 }} 坐标窗口</text>
          <button class="btn-close" @click="closePointWindow">关闭</button>
        </view>

        <view class="form-row">
          <text class="row-label required">坐标类型</text>
          <picker class="row-right" :range="typeLabelList" :value="getTypePickerIndex(activePoint.type)" @change="onTypeChange($event, activePoint)">
            <view class="picker-value">{{ typeLabelByValue[activePoint.type] }}</view>
          </picker>
        </view>

        <view class="form-row">
          <text class="row-label required">经度</text>
          <view class="row-right">
            <input class="row-input" type="digit" :value="activePoint.longitude" placeholder="自动抓取或手动填写" @input="onFieldInput($event, activePoint, 'longitude')" />
          </view>
        </view>

        <view class="form-row">
          <text class="row-label required">纬度</text>
          <view class="row-right">
            <input class="row-input" type="digit" :value="activePoint.latitude" placeholder="自动抓取或手动填写" @input="onFieldInput($event, activePoint, 'latitude')" />
          </view>
        </view>

        <view class="form-row">
          <text class="row-label required">海拔(米)</text>
          <view class="row-right">
            <input class="row-input" type="digit" :value="activePoint.altitude" placeholder="自动抓取或手动填写" @input="onFieldInput($event, activePoint, 'altitude')" />
          </view>
        </view>

        <view v-if="activePoint.sourceTag" class="form-row">
          <text class="row-label">高程来源</text>
          <view class="row-right source-tag-wrap">
            <text class="source-tag-text">{{ activePoint.sourceTag }}</text>
          </view>
        </view>

        <view class="form-row">
          <text class="row-label required">点位说明</text>
          <input class="row-right row-input" :value="activePoint.description" maxlength="200" placeholder="请输入坐标点说明" @input="onDescriptionInput($event, activePoint)" />
        </view>

        <view class="form-row">
          <text class="row-label">备注</text>
          <input class="row-right row-input" :value="activePoint.remark" maxlength="200" placeholder="选填" @input="onFieldInput($event, activePoint, 'remark')" />
        </view>

        <view class="window-actions">
          <button class="btn-grab" :disabled="isPointLoading(activePoint.id)" @click="grabPoint(activePoint)">
            {{ isPointLoading(activePoint.id) ? '定位中' : '实时定位' }}
          </button>
          <button class="btn-finish" @click="closePointWindow">完成当前点位</button>
        </view>
      </view>
    </view>

    <view class="footer-tip">
      <text class="tip-text">边界点数量：{{ boundaryCount }} 个</text>
      <text v-if="boundaryCount < 3" class="tip-warn">提交前至少补齐 3 个边界点</text>
    </view>
  </view>
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
  item[fieldName] = event?.detail?.value ?? '';
  emitModel();
}

function onDescriptionInput(event, item) {
  item.description = event?.detail?.value ?? '';
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
    uni.showToast({ title: '未配置定位抓取逻辑', icon: 'none' });
    return;
  }

  try {
    setLoading(item.id, 'all', true);
    const result = await props.capturePointData(item);
    if (!result || typeof result !== 'object') {
      uni.showToast({ title: '抓取失败，请重试', icon: 'none' });
      return;
    }

    // 任一抓取按钮均刷新当前点的经纬高，确保同一时刻采集数据一致。
    if (Number.isFinite(Number(result.longitude))) {
      item.longitude = Number(result.longitude).toFixed(6);
    }
    if (Number.isFinite(Number(result.latitude))) {
      item.latitude = Number(result.latitude).toFixed(6);
    }
    if (Number.isFinite(Number(result.altitude))) {
      item.altitude = Number(result.altitude).toFixed(2);
    }
    if (result.sourceTag != null) {
      item.sourceTag = String(result.sourceTag);
    }

    emitModel();
    uni.showToast({ title: '当前点位抓取成功', icon: 'none' });
  } catch (error) {
    uni.showToast({ title: '定位抓取失败', icon: 'none' });
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
  border-radius: 14rpx;
  padding: 20rpx 20rpx 10rpx;
  border: 1rpx solid #eef1f5;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.card-title {
  font-size: 30rpx;
  color: #595959;
  font-weight: 700;
}

.card-subtitle {
  font-size: 22rpx;
  color: #8c8c8c;
}

.head-actions {
  margin-bottom: 10rpx;
}

.btn-add {
  min-height: 70rpx;
  line-height: 70rpx;
  border-radius: 10rpx;
  border: 1rpx solid #c6e6ff;
  background: #f5fbff;
  color: #003a8c;
  font-size: 26rpx;
  padding: 0 20rpx;
  font-weight: 700;
}

.empty-wrap {
  padding: 20rpx 0 12rpx;
}

.empty-text {
  font-size: 24rpx;
  color: #8c8c8c;
}

.point-brief {
  margin-bottom: 10rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 12rpx;
  padding: 12rpx;
}

.brief-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brief-title {
  font-size: 28rpx;
  color: #1f1f1f;
  font-weight: 700;
}

.brief-type {
  font-size: 22rpx;
  color: #8c8c8c;
}

.brief-body {
  margin-top: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.brief-row {
  font-size: 24rpx;
  color: #434343;
}

.brief-actions {
  margin-top: 10rpx;
  display: flex;
  gap: 8rpx;
}

.btn-open,
.btn-delete {
  flex: 1;
  min-height: 60rpx;
  line-height: 60rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.btn-open {
  border: 1rpx solid #91d5ff;
  background: #e6f7ff;
  color: #0958d9;
}

.btn-delete {
  border: 1rpx solid #ffa39e;
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
  padding: 0 0 16rpx;
}

.point-window {
  width: calc(100% - 24rpx);
  border: 2rpx solid #d9d9d9;
  border-radius: 16rpx;
  padding: 16rpx;
  max-height: 82vh;
  overflow-y: auto;
}

.window-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.window-title {
  font-size: 30rpx;
  color: #262626;
  font-weight: 700;
}

.btn-close {
  min-width: 96rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 8rpx;
  border: 1rpx solid #d9d9d9;
  background: #ffffff;
  color: #595959;
  font-size: 24rpx;
}

.form-row {
  min-height: 78rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.row-label {
  width: 200rpx;
  flex-shrink: 0;
  font-size: 30rpx;
  color: #001529;
  line-height: 1.4;
}

.row-label.required::after {
  content: ' *';
  color: #cf1322;
}

.row-right {
  flex: 1;
}

.row-input,
.picker-value {
  flex: 1;
  min-height: 64rpx;
  line-height: 64rpx;
  border: 1rpx solid #d9d9d9;
  border-radius: 10rpx;
  background: #ffffff;
  box-sizing: border-box;
  padding: 0 16rpx;
  text-align: right;
  font-size: 28rpx;
  color: #262626;
}

.btn-grab {
  flex-shrink: 0;
  min-width: 180rpx;
  min-height: 64rpx;
  line-height: 64rpx;
  border-radius: 10rpx;
  border: 1rpx solid #bcdcff;
  background: #e6f7ff;
  color: #003a8c;
  font-size: 24rpx;
  font-weight: 700;
  padding: 0 12rpx;
}

.btn-grab[disabled] {
  opacity: 0.7;
}

.window-actions {
  margin-top: 12rpx;
  display: flex;
  gap: 10rpx;
}

.btn-finish {
  flex: 1;
  min-height: 64rpx;
  line-height: 64rpx;
  border-radius: 10rpx;
  border: 1rpx solid #95de64;
  background: #f6ffed;
  color: #237804;
  font-size: 24rpx;
  font-weight: 700;
}

.source-tag-wrap {
  display: flex;
  justify-content: flex-end;
}

.source-tag-text {
  font-size: 24rpx;
  color: #595959;
  background: #f5f7fa;
  border: 1rpx solid #d9d9d9;
  border-radius: 8rpx;
  padding: 6rpx 12rpx;
}

.footer-tip {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #595959;
}

.tip-warn {
  font-size: 24rpx;
  color: #cf1322;
}

@media screen and (max-width: 430px) {
  .coord-card {
    padding: 16rpx 16rpx 8rpx;
  }

  .row-label {
    width: 166rpx;
    font-size: 28rpx;
  }

  .row-input,
  .picker-value {
    font-size: 26rpx;
  }

  .btn-grab {
    min-width: 150rpx;
    font-size: 22rpx;
  }
}
</style>
