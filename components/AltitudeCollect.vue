<template>
	<!--
	╔════════════════════════════════════════════════════════════╗
	║  AltitudeCollect.vue — 高精度海拔采集组件                  ║
	║  用法：<AltitudeCollect v-model="form.altitude" />        ║
	╚════════════════════════════════════════════════════════════╝
	-->
	<view class="alt-widget">

		<!-- ── ① 标签行（含数据来源徽标）─────────────────────────── -->
		<view class="alt-header">
			<text class="alt-label">海拔高程（米）</text>
			<view v-if="sourceLabel" :class="['alt-badge', sourceBadgeClass]">
				<text class="alt-badge-text">{{ sourceLabel }}</text>
			</view>
		</view>

		<!-- ── ② 输入框 + 自动采集按钮 ─────────────────────────────
		     ⚠ 输入框严禁设为 readonly/disabled，
		       普查员随时可手动录入专业 RTK 读数覆盖自动值！ -->
		<view class="alt-row">
			<input
				:value="altitude"
				type="digit"
				class="alt-input"
				placeholder="自动采集 或 手动填写"
				@input="onManualInput"
			/>
			<button
				:class="['alt-btn', collecting ? 'alt-btn--loading' : '']"
				:disabled="collecting"
				hover-class="alt-btn--press"
				@click="startCollect"
			>
				<text v-if="!collecting">📡 自动采集</text>
				<text v-else class="alt-pulse">采集中…</text>
			</button>
		</view>

		<!-- ── ③ 状态提示行 ──────────────────────────────────────── -->
		<view v-if="statusMsg" :class="['alt-status', statusClass]">
			<text class="alt-status-text">{{ statusMsg }}</text>
		</view>

		<!-- ── ④ 技术详情（供专业人员核查，可不显示） ────────────── -->
		<view v-if="detailText" class="alt-detail">
			<text class="alt-detail-text">{{ detailText }}</text>
		</view>

	</view>
</template>

<script setup>
/**
 * AltitudeCollect.vue — 高精度海拔（高程）采集组件
 * =====================================================
 * 采集优先级：
 *   GPS（isHighAccuracy）+ 气压计融合  >  仅 GPS  >  提示手动录入
 *
 * 气压计获取策略（仅 #ifdef APP-PLUS 环境编译，H5 / 小程序自动跳过）：
 *   策略 ①  plus.sensors.startBarometer   ── HTML5+ 标准气压接口
 *   策略 ②  plus.android + SensorManager  ── Android TYPE_PRESSURE=6 原生接口
 *   策略 ③  plus.ios + CMAltimeter        ── iOS 相对气压接口（实验性）
 *   兜底     resolve(null)                 ── 任何策略失败均不抛错、不崩溃
 *
 * GPS 融合算法：
 *   以 GPS 绝对高程反推"当前海平面参考气压"（消除天气漂移），
 *   再将校准后的气压高程与 GPS 高程做加权平均。
 *   GPS 水平精度（accuracy）越小，GPS 权重越高。
 *
 * Props / Emits（标准 v-model 双向绑定）：
 *   props.modelValue  String|Number  — 父组件传入的高程值
 *   emit update:modelValue           — 高程变化时通知父组件
 *   emit collect-done(info: Object)  — 采集完成，携带来源/精度/原始值等详情
 *
 * ⚠  本组件需要 uni-app Vue 3 项目；
 *    Vue 2 / Options API 项目请将 <script setup> 改写为 export default {} 形式。
 */

import { ref, watch } from 'vue';

// ═══════════════════════════════════════════════════════════════
// 常量
// ═══════════════════════════════════════════════════════════════

/** 国际标准大气 — 标准海平面气压（hPa） */
const STD_PRESSURE_HPA = 1013.25;

/**
 * 气压计读取最大等待时间（ms）。
 * 超时后强制 resolve(null)，降级为仅 GPS，不阻塞主流程。
 */
const BARO_TIMEOUT_MS = 3000;

/** GPS 高精度定位最大等待时间（ms） */
const GPS_TIMEOUT_MS = 10000;

// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

/**
 * 国际标准大气公式：气压（hPa）→ 高程（m）
 *   h = 44330 × [1 − (P / P₀)^(1/5.255)]
 *
 * @param {number} pressureHpa    当前实测气压（hPa）
 * @param {number} refPressureHpa 校准后的海平面参考气压（hPa）
 * @returns {number} 估算高程（m）
 */
function pressureToAltitude(pressureHpa, refPressureHpa = STD_PRESSURE_HPA) {
	return 44330 * (1 - Math.pow(pressureHpa / refPressureHpa, 1 / 5.255));
}

/**
 * GPS × 气压计 加权高程融合
 *
 * 原理：
 *   气压计对短距离相对高程变化极其敏感（分辨率 ≈ 0.1 m），
 *   但绝对高程受天气（海平面气压变化）漂移影响大；
 *   GPS 提供绝对高程基准，但单次读数噪声较大。
 *   先以 GPS 高程校准气压计参考气压，再做加权平均。
 *   GPS 水平精度（accuracy）越小代表信号越好，GPS 权重越高。
 *
 * @param {number} gpsAlt    GPS 高程（m）
 * @param {number} baroAlt   气压计高程（已 GPS 校准，m）
 * @param {number} accuracy  GPS 水平精度（m），缺失时取 999
 * @returns {number} 融合高程（m）
 */
function fuseAltitude(gpsAlt, baroAlt, accuracy = 999) {
	// GPS 精度优秀（≤5m）时给 55% 权重；信号差时降至 25%
	const gpsW = accuracy <= 5  ? 0.55
	           : accuracy <= 15 ? 0.45
	           : accuracy <= 50 ? 0.35
	           :                  0.25;
	return gpsAlt * gpsW + baroAlt * (1 - gpsW);
}

/** 判断值是否可视为 0（用于剔除明显异常海拔） */
function isZeroAltitude(v) {
	return Number.isFinite(v) && Math.abs(v) < 1e-6;
}

// ═══════════════════════════════════════════════════════════════
// Props / Emits
// ═══════════════════════════════════════════════════════════════

const props = defineProps({
	/**
	 * v-model 绑定的高程值（父组件传入）。
	 * 类型允许 String 或 Number，内部统一以字符串处理。
	 */
	modelValue: {
		type: [String, Number],
		default: '',
	},
});

const emit = defineEmits([
	'update:modelValue', // v-model 更新事件
	'collect-done',      // 采集完成，携带完整采集信息 Object
]);

// ═══════════════════════════════════════════════════════════════
// 响应式状态
// ═══════════════════════════════════════════════════════════════

/** 输入框绑定的高程字符串 */
const altitude         = ref(props.modelValue != null ? String(props.modelValue) : '');
/** 是否正在采集（控制按钮 loading 状态） */
const collecting       = ref(false);
/** 状态提示文字（成功 / 警告 / 失败） */
const statusMsg        = ref('');
/** 状态行样式类：alt-status--info / success / error */
const statusClass      = ref('');
/** 采集详情（供专业人员核查，如 GPS 原始值 / 气压原始值） */
const detailText       = ref('');
/** 数据来源标签：'GPS + 气压计' / '仅 GPS' / '手动录入' */
const sourceLabel      = ref('');
/** 来源徽标样式：badge--fused / badge--gps / badge--manual */
const sourceBadgeClass = ref('');

// 父组件重置表单时同步内部值
watch(() => props.modelValue, (v) => {
	if (v != null && v !== '') altitude.value = String(v);
});

// ═══════════════════════════════════════════════════════════════
// 交互方法
// ═══════════════════════════════════════════════════════════════

/**
 * 用户手动编辑输入框时触发。
 * 重置来源标签为"手动录入"，并向父组件同步最新值。
 */
function onManualInput(e) {
	altitude.value         = e.detail.value;
	sourceLabel.value      = '手动录入';
	sourceBadgeClass.value = 'badge--manual';
	statusMsg.value        = '';
	detailText.value       = '';
	emit('update:modelValue', altitude.value);
}

// ═══════════════════════════════════════════════════════════════
// 主入口：自动采集
// ═══════════════════════════════════════════════════════════════

/**
 * 点击【自动采集】时执行：
 *   1. 并发发起 GPS + 气压计采集
 *   2. 融合数据（或降级）
 *   3. 写入输入框并通知父组件
 */
async function startCollect() {
	if (collecting.value) return;

	collecting.value       = true;
	statusMsg.value        = '正在高精度定位，请稍候…';
	statusClass.value      = 'alt-status--info';
	detailText.value       = '';
	sourceLabel.value      = '';
	sourceBadgeClass.value = '';

	try {
		const r = await _doCollect();

		// ── 写入结果 ───────────────────────────────────────────────
		altitude.value         = r.altitude.toFixed(2);
		sourceLabel.value      = r.source;
		sourceBadgeClass.value = r.source.includes('气压') ? 'badge--fused' : 'badge--gps';
		detailText.value       = r.detail;
		statusMsg.value        = r.accuracy != null
			? `采集成功，精度 ±${Math.round(r.accuracy)} m`
			: '采集成功';
		statusClass.value      = 'alt-status--success';

		emit('update:modelValue', altitude.value);
		emit('collect-done', r);

		uni.showToast({ title: `海拔 ${altitude.value} m`, icon: 'success', duration: 2000 });

	} catch (err) {
		statusMsg.value   = err.userMsg || '定位失败，请手动输入';
		statusClass.value = 'alt-status--error';
		sourceLabel.value = '';
		uni.showToast({ title: statusMsg.value, icon: 'none', duration: 3000 });
	} finally {
		collecting.value = false;
	}
}

// ═══════════════════════════════════════════════════════════════
// 核心：并发采集 + 融合
// ═══════════════════════════════════════════════════════════════

/**
 * 并发执行 GPS + 气压计采集，融合后返回结果对象。
 *
 * 返回值结构：
 * {
 *   altitude : number,   融合/原始高程（m）
 *   source   : string,   数据来源标签
 *   accuracy : number?,  GPS 水平精度（m）
 *   longitude: number?,  经度（WGS-84）
 *   latitude : number?,  纬度（WGS-84）
 *   rawGps   : number?,  GPS 原始高程（m）
 *   rawBaro  : number?,  气压计推算高程（m，仅融合时存在）
 *   pressure : number?,  实测气压（hPa，仅融合时存在）
 *   detail   : string,   技术详情字符串
 * }
 *
 * @throws {Error} GPS 定位失败时抛出（err.userMsg 为中文提示）
 */
async function _doCollect() {
	/*
	 * Promise.allSettled 并发两路采集：
	 *   GPS 失败  → 整体抛错（无法获取位置）
	 *   气压计失败 → 仅降级为"仅 GPS"，不影响主流程
	 */
	const [gpsResult, baroResult] = await Promise.allSettled([
		_getGpsAltitude(),
		_getBaroPressure(), // 始终 resolve(hPa | null)，不 reject
	]);

	// GPS 失败 → 向上抛出
	if (gpsResult.status === 'rejected') {
		throw gpsResult.reason;
	}

	const gps  = gpsResult.value;                                        // { altitude, accuracy, longitude, latitude }
	const baro = baroResult.status === 'fulfilled' ? baroResult.value : null; // hPa | null

	// ── Case A：GPS 有效 + 气压计有效 → 融合 ──────────────────────────
	if (gps.altitude != null && baro != null) {
		/*
		 * 以 GPS 高程反推当前海平面参考气压，消除天气造成的绝对漂移：
		 *   P_ref = P₀ × (1 − h_gps / 44330)^5.255
		 * 然后以校准后的 P_ref 计算气压高程并与 GPS 融合。
		 */
		const refPressure = STD_PRESSURE_HPA * Math.pow(1 - gps.altitude / 44330, 5.255);
		const baroAlt     = pressureToAltitude(baro, refPressure);
		const gpsIsZero   = isZeroAltitude(gps.altitude);
		const baroIsZero  = isZeroAltitude(baroAlt);

		// 同时拿到两路高程时：若任一方为 0，则剔除该源，避免把 0 参与融合。
		if (gpsIsZero && !baroIsZero) {
			return {
				altitude : baroAlt,
				source   : '仅气压计',
				accuracy : gps.accuracy,
				longitude: gps.longitude,
				latitude : gps.latitude,
				rawGps   : gps.altitude,
				rawBaro  : baroAlt,
				pressure : baro,
				detail   : `GPS ${gps.altitude.toFixed(1)}m（已忽略：值为0） ｜ 气压 ${baro.toFixed(1)} hPa → ${baroAlt.toFixed(1)}m`,
			};
		}

		if (!gpsIsZero && baroIsZero) {
			return {
				altitude : gps.altitude,
				source   : '仅 GPS',
				accuracy : gps.accuracy,
				longitude: gps.longitude,
				latitude : gps.latitude,
				rawGps   : gps.altitude,
				rawBaro  : baroAlt,
				pressure : baro,
				detail   : `GPS ${gps.altitude.toFixed(1)}m ｜ 气压推算 ${baroAlt.toFixed(1)}m（已忽略：值为0）`,
			};
		}

		if (gpsIsZero && baroIsZero) {
			const e   = new Error('GPS and barometer altitude are both zero');
			e.userMsg = '高程采集异常（GPS与气压计均为0），请移至开阔区域重试或手动录入';
			throw e;
		}

		const fused = fuseAltitude(gps.altitude, baroAlt, gps.accuracy);

		return {
			altitude : fused,
			source   : 'GPS + 气压计',
			accuracy : gps.accuracy,
			longitude: gps.longitude,
			latitude : gps.latitude,
			rawGps   : gps.altitude,
			rawBaro  : baroAlt,
			pressure : baro,
			detail   : `GPS ${gps.altitude.toFixed(1)}m ｜ 气压 ${baro.toFixed(1)} hPa → ${baroAlt.toFixed(1)}m ｜ 融合 ${fused.toFixed(2)}m`,
		};
	}

	// ── Case B：GPS 有效，气压计无效 → 仅 GPS ─────────────────────────
	if (gps.altitude != null) {
		if (isZeroAltitude(gps.altitude)) {
			const e   = new Error('GPS altitude is zero');
			e.userMsg = 'GPS 海拔为0，建议点击自动采集使用气压计融合或手动录入';
			throw e;
		}

		const noBaroNote = baro === null ? '（设备无气压计或读取超时）' : '';
		return {
			altitude : gps.altitude,
			source   : '仅 GPS',
			accuracy : gps.accuracy,
			longitude: gps.longitude,
			latitude : gps.latitude,
			rawGps   : gps.altitude,
			detail   : `GPS 高程 ${gps.altitude.toFixed(2)}m，精度 ±${gps.accuracy != null ? Math.round(gps.accuracy) : '?'}m ${noBaroNote}`,
		};
	}

	// ── Case C：GPS 高程为 null（室内、信号遮蔽、卫星不足）────────────
	const e      = new Error('GPS altitude is null');
	e.userMsg    = '卫星信号弱，无法获取高程数据，请移至开阔区域或手动录入';
	throw e;
}

// ═══════════════════════════════════════════════════════════════
// GPS 高精度定位
// ═══════════════════════════════════════════════════════════════

/**
 * GPS 高程获取：
 *   1) Android APP 优先走 HTML5+ + 原生 LocationManager.GPS_PROVIDER（强制卫星）
 *   2) 其余场景降级到 uni.getLocation
 * @returns {Promise<{ altitude, accuracy, longitude, latitude }>}
 */
function _getGpsAltitude() {
	return new Promise((resolve, reject) => {
		const mapGpsError = (err) => {
			const msg = String((err && err.errMsg) || err || '').toLowerCase();
			const e   = new Error((err && err.errMsg) || 'gps error');
			e.userMsg = msg.includes('auth') || msg.includes('denied') || msg.includes('security') || msg.includes('permission')
				? '定位权限被拒绝，请在手机【设置 → 应用 → 权限 → 定位】中开启'
				: msg.includes('provider disabled') || msg.includes('provider off')
				? 'GPS 开关未开启，请先开启系统定位并切换到高精度模式'
				: msg.includes('timeout')
				? 'GPS 超时，请前往遮蔽物少的开阔区域后重试'
				: '获取 GPS 定位失败，请重试';
			return e;
		};

		const requestGps = (expireMs) => {
			return new Promise((resolveOnce, rejectOnce) => {
				uni.getLocation({
					type                 : 'wgs84',      // WGS-84 坐标系，符合文物普查规范
					altitude             : true,          // iOS 必须加此参数才返回 altitude 字段
					isHighAccuracy       : true,          // 强制调用 GPS 芯片（耗电高，精度高）
					highAccuracyExpireTime: expireMs,
					success(res) {
						resolveOnce({
							altitude  : res.altitude  != null ? Number(res.altitude) : null,
							accuracy  : res.accuracy  != null ? res.accuracy  : null,
							longitude : res.longitude,
							latitude  : res.latitude,
						});
					},
					fail(err) {
						rejectOnce(err);
					},
				});
			});
		};

		const requestAndroidNativeGpsProvider = () => {
			return new Promise((resolveNative, rejectNative) => {
				// #ifdef APP-PLUS
				try {
					if (typeof plus === 'undefined' || !plus.android || !plus.os || String(plus.os.name || '').toLowerCase() !== 'android') {
						resolveNative(null);
						return;
					}

					plus.android.importClass('android.location.LocationManager');
					const activity = plus.android.runtimeMainActivity();
					const locationManager = plus.android.invoke(activity, 'getSystemService', 'location');
					const provider = 'gps'; // 强制使用 GPS_PROVIDER

					if (!locationManager) {
						rejectNative({ errMsg: 'location manager unavailable' });
						return;
					}

					const isProviderEnabled = plus.android.invoke(locationManager, 'isProviderEnabled', provider);
					if (!isProviderEnabled) {
						rejectNative({ errMsg: 'provider disabled' });
						return;
					}

					let done = false;
					let timer = null;
					let listener = null;

					const parseLocation = (loc) => {
						if (!loc) return null;
						const longitude = Number(plus.android.invoke(loc, 'getLongitude'));
						const latitude  = Number(plus.android.invoke(loc, 'getLatitude'));
						if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

						const hasAltitude = !!plus.android.invoke(loc, 'hasAltitude');
						const hasAccuracy = !!plus.android.invoke(loc, 'hasAccuracy');
						const altitudeRaw = hasAltitude ? Number(plus.android.invoke(loc, 'getAltitude')) : null;
						const accuracyRaw = hasAccuracy ? Number(plus.android.invoke(loc, 'getAccuracy')) : null;

						return {
							altitude  : Number.isFinite(altitudeRaw) ? altitudeRaw : null,
							accuracy  : Number.isFinite(accuracyRaw) ? accuracyRaw : null,
							longitude,
							latitude,
						};
					};

					const finish = (payload, err) => {
						if (done) return;
						done = true;
						if (timer) clearTimeout(timer);
						try {
							if (listener) plus.android.invoke(locationManager, 'removeUpdates', listener);
						} catch (_) {}

						if (err) rejectNative(err);
						else resolveNative(payload);
					};

					listener = plus.android.implements('android.location.LocationListener', {
						onLocationChanged: (location) => {
							const parsed = parseLocation(location);
							if (!parsed) return;
							finish(parsed, null);
						},
						onStatusChanged: () => {},
						onProviderEnabled: () => {},
						onProviderDisabled: () => {},
					});

					// 先尝试读取最近一次 GPS_PROVIDER 缓存。
					const lastKnown = plus.android.invoke(locationManager, 'getLastKnownLocation', provider);
					const lastParsed = parseLocation(lastKnown);
					if (lastParsed && lastParsed.altitude != null && !isZeroAltitude(lastParsed.altitude)) {
						finish(lastParsed, null);
						return;
					}

					plus.android.invoke(locationManager, 'requestLocationUpdates', provider, 0, 0, listener);
					timer = setTimeout(() => finish(null, { errMsg: 'timeout' }), GPS_TIMEOUT_MS + 8000);
				} catch (e) {
					rejectNative({ errMsg: String((e && e.message) || e || 'native gps error') });
				}
				// #endif

				// #ifndef APP-PLUS
				resolveNative(null);
				// #endif
			});
		};

		(async () => {
			try {
				const nativeGps = await requestAndroidNativeGpsProvider();
				if (nativeGps && nativeGps.altitude != null && !isZeroAltitude(nativeGps.altitude)) {
					resolve(nativeGps);
					return;
				}

				const first = await requestGps(GPS_TIMEOUT_MS);
				if (first.altitude != null && !isZeroAltitude(first.altitude)) {
					resolve(first);
					return;
				}

				// 首次海拔为 null 或 0 时重试一次，尽量等待 GNSS 高程稳定。
				const second = await requestGps(GPS_TIMEOUT_MS + 8000);
				resolve(second);
			} catch (err) {
				reject(mapGpsError(err));
			}
		})();
	});
}

// ═══════════════════════════════════════════════════════════════
// 气压计读数（仅 APP-PLUS；H5 / 小程序直接返回 null）
// ═══════════════════════════════════════════════════════════════

/**
 * 尝试读取设备气压传感器，返回气压值（hPa）或 null。
 *
 * 三级降级策略（均在 #ifdef APP-PLUS 块内）：
 *   策略 ①  plus.sensors.startBarometer   — HTML5+ 标准接口，最简单
 *   策略 ②  plus.android + SensorManager  — Android 原生，兼容性最好
 *   策略 ③  plus.ios + CMAltimeter        — iOS 气压计（实验性）
 *
 * 任何策略失败均 catch 并继续尝试下一策略；
 * 所有策略均失败时 resolve(null)，不抛错，保证主流程不中断。
 *
 * @returns {Promise<number | null>} 气压（hPa）或 null
 */
function _getBaroPressure() {
	return new Promise((resolve) => {

		// ── 幂等保护：确保 resolve 只被调用一次 ──────────────────────
		let _resolved = false;
		const safeResolve = (v) => {
			if (_resolved) return;
			_resolved = true;
			resolve(v);
		};

		// ── 超时兜底：BARO_TIMEOUT_MS 毫秒后强制 resolve(null) ────────
		const timer  = setTimeout(() => safeResolve(null), BARO_TIMEOUT_MS);
		// finish：清除超时定时器并 resolve
		const finish = (hpa) => { clearTimeout(timer); safeResolve(hpa); };

		// ╔══════════════════════════════════════════════════════════╗
		// ║  以下代码只在打包为真正的 Android / iOS App 时被编译     ║
		// ║  H5 网页 / 小程序 调试时此块会被预处理器完全剔除         ║
		// ╚══════════════════════════════════════════════════════════╝
		// #ifdef APP-PLUS

		// ════════════════════════════════════════════════════════════
		// 策略 ①：plus.sensors.startBarometer（HTML5+ 标准气压 API）
		// ════════════════════════════════════════════════════════════
		try {
			if (plus.sensors && typeof plus.sensors.startBarometer === 'function') {

				let _got = false;

				plus.sensors.startBarometer(
					{ frequency: 'fastest' }, // 尽可能快地获取一次读数

					/* 成功回调：收到气压数据 */
					(event) => {
						if (_got) return; // 防止多次回调
						_got = true;

						try { plus.sensors.stopBarometer(); } catch (_) {}

						/*
						 * 不同固件 event 字段不统一：
						 *   event.pressure      — 标准字段（hPa）
						 *   event.value[0]      — 部分固件（可能是 Pa）
						 */
						const raw = (event.pressure != null)          ? event.pressure
						          : (event.value && event.value[0] != null) ? event.value[0]
						          : null;

						if (raw == null) { finish(null); return; }

						// 少数设备以 Pa 返回（量级 > 50000），统一转换为 hPa
						finish(raw > 50000 ? raw / 100 : raw);
					},

					/* 失败回调：传感器不支持或硬件错误 */
					() => { if (!_got) finish(null); }
				);

				return; // ← 等待异步回调，勿继续往下执行

			}
		} catch (_e1) {
			// plus.sensors.startBarometer 不存在或抛出异常，尝试策略 ②
		}

		// ════════════════════════════════════════════════════════════
		// 策略 ②：Android 原生 SensorManager（TYPE_PRESSURE = 6）
		//   适用于 plus.sensors 不支持但 Android 硬件有气压计的设备
		// ════════════════════════════════════════════════════════════
		try {
			if (typeof plus !== 'undefined' && plus.android) {

				// 导入所需 Java 类（重复调用无副作用）
				plus.android.importClass('android.hardware.SensorManager');
				plus.android.importClass('android.hardware.Sensor');

				const activity = plus.android.runtimeMainActivity();

				/*
				 * Context.SENSOR_SERVICE 字符串常量 = "sensor"
				 * 等效于 Android Java: activity.getSystemService(Context.SENSOR_SERVICE)
				 */
				const sensorManager = plus.android.invoke(activity, 'getSystemService', 'sensor');

				/*
				 * Sensor.TYPE_PRESSURE 整型常量 = 6
				 * 返回设备的默认气压传感器；如设备无此传感器则返回 null
				 */
				const pressSensor = plus.android.invoke(sensorManager, 'getDefaultSensor', 6);

				if (!pressSensor) {
					// 此 Android 设备没有气压传感器，直接降级
					finish(null);
					return;
				}

				/*
				 * 实现 android.hardware.SensorEventListener 接口。
				 * 在 JavaScript 中通过 plus.android.implements 创建 Java 接口实例。
				 * 变量 sensorManager / listener 通过闭包捕获，注销时使用。
				 */
				const listener = plus.android.implements(
					'android.hardware.SensorEventListener',
					{
						/**
						 * 传感器数据变化时回调（只取第一次数据后立即注销监听）
						 * @param {android.hardware.SensorEvent} sensorEvent
						 */
						onSensorChanged(sensorEvent) {
							try {
								/*
								 * sensorEvent.values 是 float[] 数组，
								 * index 0 = 气压值（Android 返回 hPa）
								 */
								const values = plus.android.getAttribute(sensorEvent, 'values');
								const hpa    = values ? parseFloat(values[0]) : null;

								// 立即注销，只需一次采样
								try {
									plus.android.invoke(sensorManager, 'unregisterListener', listener);
								} catch (_) {}

								if (hpa == null || !isFinite(hpa)) { finish(null); return; }

								// 同样处理 Pa vs hPa 量级问题
								finish(hpa > 50000 ? hpa / 100 : hpa);

							} catch (_inner) {
								finish(null);
							}
						},

						// 精度变化回调，无需处理
						onAccuracyChanged() {},
					}
				);

				/*
				 * SensorManager.SENSOR_DELAY_FASTEST = 0
				 * 以最快频率注册，采样一次后立即注销
				 */
				plus.android.invoke(sensorManager, 'registerListener', listener, pressSensor, 0);

				return; // ← 等待 onSensorChanged 回调

			}
		} catch (_e2) {
			// Android 原生接口失败，尝试 iOS 策略
		}

		// ════════════════════════════════════════════════════════════
		// 策略 ③：iOS CMAltimeter（相对气压，实验性）
		//   CMAltimeter 返回的是"相对于设备冷启动时的气压"，
		//   需配合 GPS 校准方可获得绝对高程，此处仅读取气压值（kPa）。
		//   注意：plus.ios 的 Block 桥接在旧版 HTML5+ 运行时可能不稳定，
		//   若此处抛出则静默降级。
		// ════════════════════════════════════════════════════════════
		try {
			if (typeof plus !== 'undefined' && plus.ios) {

				const CMAltimeter      = plus.ios.importClass('CMAltimeter');
				const NSOperationQueue = plus.ios.importClass('NSOperationQueue');

				// 检查设备是否支持气压计
				const isAvail = plus.ios.invoke(CMAltimeter, 'isRelativeAltitudeAvailable');
				if (!isAvail) { finish(null); return; }

				const altimeter = plus.ios.newObject('CMAltimeter');
				const queue     = plus.ios.invoke(NSOperationQueue, 'mainQueue');

				/*
				 * startRelativeAltitudeUpdatesToQueue:withHandler: 接受 ObjC Block。
				 * 在 HTML5+ 中通过 plus.ios.implements 包装：
				 *   data.pressure 为 NSNumber（kPa），乘以 10 转为 hPa。
				 */
				const blockHandler = plus.ios.implements('AltimeterHandlerBlock', {
					/**
					 * Block 签名：^(CMAltitudeData *data, NSError *error)
					 * HTML5+ 桥接时方法名为 'invoke:withError:'
					 */
					'invoke:withError:': (data, error) => {
						if (error || !data) { finish(null); return; }
						try {
							const kpa = plus.ios.invoke(
								plus.ios.getAttribute(data, 'pressure'), 'floatValue'
							);
							const hpa = kpa * 10;
							// 停止后续更新，只取一次
							plus.ios.invoke(altimeter, 'stopRelativeAltitudeUpdates');
							finish(isFinite(hpa) ? hpa : null);
						} catch (_) {
							finish(null);
						}
					},
				});

				plus.ios.invoke(
					altimeter,
					'startRelativeAltitudeUpdatesToQueue:withHandler:',
					queue,
					blockHandler
				);

				return; // ← 等待 iOS 气压回调

			}
		} catch (_e3) {
			// iOS 接口失败
		}

		// ── 所有策略均失败：兜底返回 null ────────────────────────────
		finish(null);

		// #endif
		// ╔══════════════════════════════════════════════════════════╗
		// ║  H5 / 小程序环境：无原生气压 API，直接返回 null           ║
		// ╚══════════════════════════════════════════════════════════╝
		// #ifndef APP-PLUS
		finish(null);
		// #endif

	}); // end new Promise
}

</script>

<style scoped>
/* ──────────────────────────────────────────────────────────────
   AltitudeCollect 组件样式
   遵循"克制、实用"的体制内 UI 风格，与 collect.vue 主体色调一致
   ────────────────────────────────────────────────────────────── */

/* ── 整体容器 ── */
.alt-widget {
	background: #fff;
	border-radius: 16rpx;
	/* 组件作为独立卡片使用时可加上 box-shadow 和 padding，
	   嵌入 collect.vue 的 .section 时可按需移除 */
	padding: 4rpx 0 8rpx;
}

/* ── 标签行 ── */
.alt-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14rpx;
	flex-wrap: wrap;
	gap: 8rpx;
}

.alt-label {
	font-size: 28rpx;
	color: #374151;
	font-weight: 600;
}

/* ── 来源徽标 ── */
.alt-badge {
	display: flex;
	align-items: center;
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
}

.alt-badge-text {
	font-size: 20rpx;
	font-weight: 600;
}

/* 仅 GPS */
.badge--gps {
	background: #dbeafe;
}
.badge--gps .alt-badge-text {
	color: #1d4ed8;
}

/* GPS + 气压计融合（绿色，精度更高） */
.badge--fused {
	background: #d1fae5;
}
.badge--fused .alt-badge-text {
	color: #065f46;
}

/* 手动录入 */
.badge--manual {
	background: #f3f4f6;
}
.badge--manual .alt-badge-text {
	color: #6b7280;
}

/* ── 输入框 + 按钮行 ── */
.alt-row {
	display: flex;
	gap: 16rpx;
	align-items: center;
}

/*
 * ⚠ 重要：绝不设置 pointer-events:none、opacity:0.5 或 disabled，
 *   普查员必须能随时点击输入框手动录入 RTK 读数覆盖自动值！
 */
.alt-input {
	flex: 1;
	min-height: 84rpx;
	background: #f8fafc;
	border: 2rpx solid #e2e8f0;
	border-radius: 12rpx;
	padding: 0 24rpx;
	font-size: 32rpx;
	color: #1e293b;
	box-sizing: border-box;
}

/* 采集按钮 */
.alt-btn {
	flex-shrink: 0;
	min-width: 188rpx;
	min-height: 84rpx;
	background: #2563eb;
	color: #fff;
	border-radius: 12rpx;
	font-size: 26rpx;
	font-weight: 600;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 20rpx;
	box-sizing: border-box;
	line-height: 1;
}

.alt-btn--loading {
	background: #93c5fd;
}

.alt-btn--press {
	background: #1d4ed8;
	opacity: 0.9;
}

/* Loading 文字呼吸动画 */
.alt-pulse {
	animation: alt-pulse-anim 1.2s ease-in-out infinite;
	display: inline-block;
}

@keyframes alt-pulse-anim {
	0%   { opacity: 1; }
	50%  { opacity: 0.35; }
	100% { opacity: 1; }
}

/* ── 状态提示 ── */
.alt-status {
	margin-top: 12rpx;
	padding: 12rpx 18rpx;
	border-radius: 10rpx;
}

.alt-status-text {
	font-size: 24rpx;
	line-height: 1.6;
}

/* 信息（定位中） */
.alt-status--info {
	background: #eff6ff;
}
.alt-status--info .alt-status-text {
	color: #1d4ed8;
}

/* 成功 */
.alt-status--success {
	background: #f0fdf4;
}
.alt-status--success .alt-status-text {
	color: #15803d;
}

/* 失败 */
.alt-status--error {
	background: #fef2f2;
}
.alt-status--error .alt-status-text {
	color: #dc2626;
}

/* ── 技术详情（灰色小字，供专业人员核查原始数据） ── */
.alt-detail {
	margin-top: 10rpx;
	padding: 10rpx 16rpx;
	background: #f8fafc;
	border-radius: 8rpx;
	border-left: 4rpx solid #cbd5e1;
}

.alt-detail-text {
	font-size: 20rpx;
	color: #94a3b8;
	line-height: 1.8;
	/* 等宽字体便于数字对齐阅读 */
	font-family: 'Courier New', Courier, monospace;
}
</style>
