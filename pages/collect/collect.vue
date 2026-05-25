<template>
  <view class="page-wrap">
    <HeritageCollectRefactor
      ref="collectRef"
      :loading="submitting"
      :meta="formMeta"
      @collect-coordinate="handleCollectCoordinate"
      @calibrate-altitude="handleCalibrateAltitude"
      @open-watermark-camera="handleOpenWatermarkCamera"
      @submit="handleSubmit"
    />

    <view class="hidden-altitude-collector" aria-hidden="true">
      <AltitudeCollect
        ref="altitudeRef"
        v-model="shadowAltitude"
        @collect-done="handleAltitudeCollected"
      />
    </view>
  </view>
</template>

<script setup>
import { onLoad } from '@dcloudio/uni-app';
import { reactive, ref } from 'vue';
import config from '../../common/js/config.js';
import { getToken } from '../../common/js/auth.js';
import AltitudeCollect from '../../components/AltitudeCollect.vue';
import HeritageCollectRefactor from '../../components/HeritageCollectRefactor.vue';

const API = config.API_BASE_URL;

const collectRef = ref(null);
const altitudeRef = ref(null);
const shadowAltitude = ref('');
const submitting = ref(false);
const formMeta = reactive({
  categoryChoices: [],
  protectionLevelChoices: [],
  ownershipChoices: [],
  preservationStatusChoices: [],
});

onLoad(() => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/index/index' });
    return;
  }
  loadFormMetaDefaults();
});

function cleanText(value) {
  return String(value || '').trim();
}

function applyCoordinateToForm(longitude, latitude) {
  const form = collectRef.value?.form;
  if (!form) return;
  form.longitude = Number(longitude).toFixed(8);
  form.latitude = Number(latitude).toFixed(8);
}

function applyAltitudeToForm(altitudeValue, source) {
  if (!collectRef.value) return;
  if (!Number.isFinite(Number(altitudeValue))) return;

  if (source && source.includes('DEM')) {
    collectRef.value.setAltitudeByDem(Number(altitudeValue));
    return;
  }

  if (source && (source.includes('硬件') || source.includes('GPS') || source.includes('气压'))) {
    collectRef.value.setAltitudeByHardware(Number(altitudeValue));
    return;
  }

  collectRef.value.setAltitudeManual(String(Number(altitudeValue).toFixed(2)));
}

function handleAltitudeCollected(info) {
  if (!info || typeof info !== 'object') return;
  if (info.longitude != null && info.latitude != null) {
    applyCoordinateToForm(info.longitude, info.latitude);
  }
  if (info.altitude != null) {
    applyAltitudeToForm(info.altitude, info.source || '');
  }
}

function handleCollectCoordinate() {
  uni.getLocation({
    type: 'wgs84',
    isHighAccuracy: true,
    highAccuracyExpireTime: 15000,
    success: (res) => {
      applyCoordinateToForm(res.longitude, res.latitude);
      uni.showToast({ title: '坐标采集成功', icon: 'success' });
    },
    fail: (err) => {
      const msg = String(err?.errMsg || '').toLowerCase();
      const hint = msg.includes('denied') || msg.includes('permission')
        ? '定位权限被拒绝，请在系统设置开启定位'
        : msg.includes('timeout')
        ? '定位超时，请移至开阔区域重试'
        : '坐标采集失败，请重试';
      uni.showToast({ title: hint, icon: 'none' });
    },
  });
}

function handleCalibrateAltitude() {
  if (!altitudeRef.value || typeof altitudeRef.value.startCollect !== 'function') {
    uni.showToast({ title: '海拔采集组件未就绪', icon: 'none' });
    return;
  }
  altitudeRef.value.startCollect();
}

function handleOpenWatermarkCamera() {
  uni.showToast({ title: '请使用添加照片入口拍摄，系统将自动加水印', icon: 'none' });
}

function loadFormMetaDefaults() {
  uni.request({
    url: `${API}/api/collect/form-meta`,
    header: { Authorization: `Bearer ${getToken()}` },
    success: (res) => {
      if (res.statusCode !== 200 || !res.data) return;
      const d = res.data;
      formMeta.categoryChoices = d.category_choices || [];
      formMeta.protectionLevelChoices = d.protection_level_choices || [];
      formMeta.ownershipChoices = d.ownership_choices || [];
      formMeta.preservationStatusChoices = d.preservation_status_choices || [];
    },
    fail: () => {
      formMeta.categoryChoices = [
        { value: 'GWZ', label: '古文化遗址' },
        { value: 'GMZ', label: '古墓葬' },
        { value: 'GJZ', label: '古建筑' },
        { value: 'SKT', label: '石窟寺及石刻' },
        { value: 'JDJW', label: '近现代重要史迹及代表性建筑' },
        { value: 'QT', label: '其他' },
      ];
      formMeta.protectionLevelChoices = [
        { value: 'GB', label: '全国重点文物保护单位' },
        { value: 'SB', label: '省（自治区、直辖市）级文物保护单位' },
        { value: 'XB', label: '市（县）级文物保护单位' },
        { value: 'DS', label: '尚未定级的不可移动文物' },
      ];
      formMeta.ownershipChoices = [
        { value: 'state', label: '国有' },
        { value: 'collective', label: '集体' },
        { value: 'private', label: '私人' },
        { value: 'other', label: '其他' },
      ];
      formMeta.preservationStatusChoices = [
        { value: '好', label: '好' },
        { value: '较好', label: '较好' },
        { value: '一般', label: '一般' },
        { value: '较差', label: '较差' },
        { value: '差', label: '差' },
      ];
    },
  });
}

function createHeritage(payload) {
  const longitude = Number(payload.longitude);
  const latitude = Number(payload.latitude);
  const altitude = payload.altitude !== '' && payload.altitude != null ? Number(payload.altitude) : null;
  const resolvedCategory = cleanText(payload.category);
  const resolvedProtection = cleanText(payload.protection_level);
  const resolvedOwnership = cleanText(payload.ownership);
  const resolvedPreservation = cleanText(payload.preservation_status);

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API}/api/collect/create`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      data: {
        survey_code: payload.surveyCodeAuto ? '' : cleanText(payload.code),
        name: cleanText(payload.name),
        former_name: cleanText(payload.former_name),
        era: cleanText(payload.era),
        category: resolvedCategory,
        province: cleanText(payload.province),
        city: cleanText(payload.city),
        county: cleanText(payload.county),
        township: cleanText(payload.township),
        village: cleanText(payload.village),
        address: cleanText(payload.address),
        longitude: Number.isFinite(longitude) ? longitude : null,
        latitude: Number.isFinite(latitude) ? latitude : null,
        altitude: Number.isFinite(altitude) ? altitude : null,
        protection_level: resolvedProtection,
        ownership: resolvedOwnership,
        preservation_status: resolvedPreservation,
        description: cleanText(payload.remark),
      },
      success: (res) => {
        if (res.statusCode === 201) {
          resolve({
            heritage_id: res.data?.heritage_id,
            survey_code: res.data?.survey_code || '',
          });
          return;
        }
        reject(res.data?.detail || res.data?.message || '创建失败');
      },
      fail: (err) => reject(err?.errMsg || '网络异常'),
    });
  });
}

function uploadPhoto(heritageId, filePath, isCover) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${API}/api/collect/photos/${heritageId}`,
      filePath,
      name: 'photo',
      formData: {
        photo_type: isCover ? 'overview' : 'detail',
        is_cover: isCover ? 'true' : 'false',
      },
      header: { Authorization: `Bearer ${getToken()}` },
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          if (res.statusCode === 201) resolve(data || {});
          else reject(data?.detail || '上传失败');
        } catch (_) {
          if (res.statusCode === 201) resolve({});
          else reject('上传响应解析失败');
        }
      },
      fail: (err) => reject(err?.errMsg || '网络异常'),
    });
  });
}

async function handleSubmit(payload) {
  if (submitting.value) return;
  submitting.value = true;

  try {
    const created = await createHeritage(payload);
    const photos = Array.isArray(payload.photos) ? payload.photos : [];

    let successCount = 0;
    for (let i = 0; i < photos.length; i += 1) {
      const path = photos[i]?.path;
      if (!path) continue;
      try {
        await uploadPhoto(created.heritage_id, path, i === 0);
        successCount += 1;
      } catch (_) {
        // 单张失败不阻断整个流程
      }
    }

    const suffix = photos.length > 0 ? `，照片 ${successCount}/${photos.length}` : '';
    uni.showModal({
      title: '采集提交成功',
      content: `编号：${created.survey_code || '已生成'}${suffix}`,
      showCancel: false,
    });
  } catch (err) {
    uni.showToast({
      title: `提交失败：${String(err || '未知错误')}`,
      icon: 'none',
      duration: 3000,
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.page-wrap {
  min-height: 100vh;
}

.hidden-altitude-collector {
  position: absolute;
  left: -9999px;
  top: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
