<template>
  <view class="collect-page">
    <scroll-view class="scroll-body" scroll-y :show-scrollbar="false" enable-flex>
      <view class="page-inner">
        <view class="page-title-wrap">
          <text class="page-title">不可移动文物现场采集</text>
          <text class="page-subtitle">极简规范化采集表单</text>
        </view>

        <view class="card">
          <view class="card-head">
            <text class="card-title">区块一：基础地理信息</text>
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
            <button class="btn-secondary" @click="handleCalibrateAltitude">硬件高程校准</button>
          </view>
        </view>

        <view class="card">
          <view class="card-head">
            <text class="card-title">区块二：多媒体采集</text>
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
            <text class="row-label">水印相机</text>
            <button class="btn-secondary single-btn" @click="openWatermarkCamera">打开水印拍照</button>
          </view>

          <view class="form-row">
            <text class="row-label">RTK 手簿附件</text>
            <button class="btn-secondary single-btn" @click="attachRtkFile">上传附件</button>
          </view>
          <view v-if="rtkFileName" class="inline-hint">
            <text class="inline-hint-text">已上传：{{ rtkFileName }}</text>
          </view>
        </view>

        <view class="card last-card">
          <view class="card-head">
            <text class="card-title">区块三：审核与备注</text>
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
    </scroll-view>

    <view class="bottom-bar">
      <button class="btn-submit" :disabled="loading" @click="handleSubmit">
        {{ loading ? '提交中...' : '提交采集信息' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { CHINA_REGION_TREE, DEFAULT_REGION } from '../common/js/china_regions.js';

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

const emitting = defineEmits(['submit', 'collect-coordinate', 'calibrate-altitude', 'open-watermark-camera']);
const photos = ref([]);
const rtkFileName = ref('');
const signStatus = ref('');

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
  if (altitudeSource.value === 'dem') return 'DEM对齐';
  if (altitudeSource.value === 'hardware') return '手机硬件';
  return '手动录入';
});

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

function setAltitudeByDem(value) {
  form.altitude = Number(value).toFixed(2);
  altitudeSource.value = 'dem';
}

function setAltitudeByHardware(value) {
  form.altitude = Number(value).toFixed(2);
  altitudeSource.value = 'hardware';
}

function setAltitudeManual(value) {
  form.altitude = value;
  altitudeSource.value = 'manual';
}

function handleCollectCoordinate() {
  emitting('collect-coordinate');
  uni.showToast({ title: '开始采集坐标', icon: 'none' });
}

function handleCalibrateAltitude() {
  emitting('calibrate-altitude');
  uni.showToast({ title: '开始校准海拔', icon: 'none' });
}

function pickPhoto() {
  const remain = 10 - photos.value.length;
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: (res) => {
      const selected = (res.tempFilePaths || []).map((path, index) => ({
        id: `${Date.now()}_${index}`,
        path,
      }));
      photos.value = photos.value.concat(selected).slice(0, 10);
    },
  });
}

function removePhoto(index) {
  photos.value.splice(index, 1);
}

function openWatermarkCamera() {
  emitting('open-watermark-camera');
  uni.showToast({ title: '打开水印相机', icon: 'none' });
}

function attachRtkFile() {
  uni.showActionSheet({
    itemList: ['从文件管理器选择', '拍照上传手簿'],
    success: () => {
      rtkFileName.value = `RTK手簿_${Date.now()}.pdf`;
    },
  });
}

function collectSignature() {
  signStatus.value = '签名已采集';
  uni.showToast({ title: '签名采集成功', icon: 'success' });
}

function isInChoices(value, choices) {
  return Array.isArray(choices) && choices.some((item) => item.value === value);
}

function isInList(value, list) {
  return Array.isArray(list) && list.includes(value);
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
  const msg = validateForm();
  if (msg) {
    uni.showToast({ title: msg, icon: 'none' });
    return;
  }

  emitting('submit', {
    ...form,
    altitude_source: altitudeSource.value,
    photos: photos.value,
    rtk_file_name: rtkFileName.value,
    signature_status: signStatus.value,
  });
}

defineExpose({
  setAltitudeByDem,
  setAltitudeByHardware,
  setAltitudeManual,
  form,
});
</script>

<style scoped lang="scss">
.collect-page {
  min-height: 100vh;
  background: #f5f7fa;
  position: relative;
}

.scroll-body {
  height: 100vh;
  box-sizing: border-box;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
  padding-bottom: calc(140rpx + constant(safe-area-inset-bottom));
}

.page-inner {
  padding: 24rpx;
}

.page-title-wrap {
  margin-bottom: 20rpx;
}

.page-title {
  display: block;
  font-size: 36rpx;
  line-height: 1.4;
  color: #001529;
  font-weight: 700;
}

.page-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #595959;
}

.card {
  background: #ffffff;
  border-radius: 14rpx;
  padding: 20rpx 20rpx 8rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #eef1f5;
}

.last-card {
  margin-bottom: 8rpx;
}

.card-head {
  margin-bottom: 8rpx;
}

.card-title {
  font-size: 30rpx;
  color: #001529;
  font-weight: 700;
  line-height: 1.5;
}

.form-row {
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #f0f0f0;
  padding: 10rpx 0;
  gap: 20rpx;
}

.form-row:last-child {
  border-bottom: 0;
}

.row-label {
  width: 220rpx;
  flex-shrink: 0;
  font-size: 30rpx;
  color: #001529;
  line-height: 1.4;
}

.row-label.required::after {
  content: ' *';
  color: #cf1322;
}

.row-input,
.picker-value {
  flex: 1;
  text-align: right;
  font-size: 30rpx;
  color: #262626;
  min-height: 70rpx;
}

.picker-wrap {
  flex: 1;
}

.row-input::placeholder {
  color: #bfbfbf;
}

.row-altitude {
  align-items: flex-start;
  padding-top: 16rpx;
  padding-bottom: 16rpx;
}

.altitude-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12rpx;
}

.altitude-input {
  min-width: 180rpx;
}

.alt-badge {
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
}

.alt-badge-text {
  font-size: 24rpx;
  line-height: 1.4;
  color: #595959;
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

.mode-switch {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 0;
  border: 1rpx solid #d9e2ec;
  border-radius: 10rpx;
  overflow: hidden;
}

.mode-item {
  min-width: 110rpx;
  text-align: center;
  font-size: 26rpx;
  color: #595959;
  background: #f5f7fa;
  padding: 10rpx 16rpx;
}

.mode-item.active {
  color: #ffffff;
  background: #1677ff;
}

.btn-group-compact {
  padding: 14rpx 0 10rpx;
  display: flex;
  gap: 12rpx;
}

.btn-secondary {
  flex: 1;
  height: 76rpx;
  border-radius: 10rpx;
  border: 1rpx solid #bcdcff;
  background: #e6f7ff;
  color: #003a8c;
  font-size: 28rpx;
  line-height: 76rpx;
  padding: 0 20rpx;
}

.single-btn {
  max-width: 360rpx;
  flex: 0 0 auto;
}

.column-row {
  display: block;
  padding-top: 14rpx;
  padding-bottom: 14rpx;
}

.column-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.column-meta {
  font-size: 24rpx;
  color: #8c8c8c;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
}

.photo-item,
.photo-add {
  position: relative;
  height: 180rpx;
  border-radius: 10rpx;
  overflow: hidden;
}

.photo-item {
  background: #f0f0f0;
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
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-remove-text {
  font-size: 20rpx;
  color: #ffffff;
}

.photo-add {
  border: 1rpx dashed #91caff;
  background: #f9fbff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-add-text {
  font-size: 26rpx;
  color: #0958d9;
}

.inline-hint {
  margin-top: 8rpx;
  margin-bottom: 10rpx;
}

.inline-hint-text {
  font-size: 24rpx;
  color: #595959;
}

.remark-input {
  width: 100%;
  min-height: 180rpx;
  box-sizing: border-box;
  border: 1rpx solid #d9d9d9;
  border-radius: 10rpx;
  padding: 14rpx;
  font-size: 28rpx;
  color: #262626;
  background: #ffffff;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  padding: 10rpx 20rpx calc(10rpx + env(safe-area-inset-bottom));
  padding: 10rpx 20rpx calc(10rpx + constant(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
}

.btn-submit {
  width: 100%;
  height: 96rpx;
  border-radius: 10rpx;
  background: #001529;
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 96rpx;
  border: 0;
}

.btn-submit[disabled] {
  opacity: 0.65;
}

@media screen and (max-width: 430px) {
  .page-inner {
    padding: 16rpx;
  }

  .card {
    padding: 16rpx 16rpx 6rpx;
    border-radius: 12rpx;
  }

  .row-label {
    width: 180rpx;
    font-size: 28rpx;
  }

  .row-input,
  .picker-value {
    font-size: 28rpx;
  }

  .btn-secondary {
    font-size: 26rpx;
  }

  .photo-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
