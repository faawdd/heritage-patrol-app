<template>
	<svg
		class="app-icon"
		:width="px"
		:height="px"
		viewBox="0 0 24 24"
		fill="currentColor"
		:style="{ color }"
		aria-hidden="true"
		v-html="body"
	/>
</template>

<script>
	// Remix Icon（https://remixicon.com，Apache-2.0）线性图标，24x24 视图，内联 SVG 渲染，颜色跟随 currentColor。
	// size 沿用原 rpx 数值（750 设计稿），按 1rpx = 0.5px 换算。
	import i0 from 'remixicon/icons/Buildings/home-4-line.svg?raw';
	import i1 from 'remixicon/icons/Media/camera-line.svg?raw';
	import i2 from 'remixicon/icons/Document/file-list-3-line.svg?raw';
	import i3 from 'remixicon/icons/User & Faces/user-3-line.svg?raw';
	import i4 from 'remixicon/icons/Design/layout-grid-line.svg?raw';
	import i5 from 'remixicon/icons/Map/map-pin-line.svg?raw';
	import i6 from 'remixicon/icons/Design/focus-3-line.svg?raw';
	import i7 from 'remixicon/icons/System/search-line.svg?raw';
	import i8 from 'remixicon/icons/System/check-line.svg?raw';
	import i9 from 'remixicon/icons/System/checkbox-circle-line.svg?raw';
	import i10 from 'remixicon/icons/System/alert-line.svg?raw';
	import i11 from 'remixicon/icons/Arrows/arrow-right-s-line.svg?raw';
	import i12 from 'remixicon/icons/Arrows/arrow-down-s-line.svg?raw';
	import i13 from 'remixicon/icons/Arrows/arrow-right-line.svg?raw';
	import i14 from 'remixicon/icons/Device/fingerprint-line.svg?raw';
	import i15 from 'remixicon/icons/User & Faces/user-smile-line.svg?raw';
	import i16 from 'remixicon/icons/Arrows/drag-move-2-line.svg?raw';
	import i17 from 'remixicon/icons/System/lock-line.svg?raw';
	import i18 from 'remixicon/icons/Others/key-2-line.svg?raw';
	import i19 from 'remixicon/icons/System/logout-box-r-line.svg?raw';
	import i20 from 'remixicon/icons/System/information-line.svg?raw';
	import i21 from 'remixicon/icons/Device/phone-line.svg?raw';
	import i22 from 'remixicon/icons/System/refresh-line.svg?raw';
	import i23 from 'remixicon/icons/System/time-line.svg?raw';
	import i24 from 'remixicon/icons/System/shield-check-line.svg?raw';
	import i25 from 'remixicon/icons/System/close-line.svg?raw';
	import i26 from 'remixicon/icons/Design/edit-line.svg?raw';
	import i27 from 'remixicon/icons/Business/calendar-line.svg?raw';
	import i28 from 'remixicon/icons/Buildings/government-line.svg?raw';
	import i29 from 'remixicon/icons/Media/image-line.svg?raw';
	import i30 from 'remixicon/icons/System/eye-line.svg?raw';
	import i31 from 'remixicon/icons/System/eye-off-line.svg?raw';
	import i32 from 'remixicon/icons/System/upload-2-line.svg?raw';
	import i33 from 'remixicon/icons/Map/map-2-line.svg?raw';
	import i34 from 'remixicon/icons/Business/bar-chart-line.svg?raw';
	import i35 from 'remixicon/icons/Document/file-line.svg?raw';
	import i36 from 'remixicon/icons/System/add-line.svg?raw';
	import i37 from 'remixicon/icons/Media/mic-line.svg?raw';
	import i38 from 'remixicon/icons/System/question-line.svg?raw';
	import i39 from 'remixicon/icons/Design/tools-line.svg?raw';

	const RAW = {
		'home': i0,
		'camera': i1,
		'records': i2,
		'user': i3,
		'grid': i4,
		'pin': i5,
		'locate': i6,
		'search': i7,
		'check': i8,
		'check-circle': i9,
		'alert': i10,
		'chevron-right': i11,
		'chevron-down': i12,
		'arrow-right': i13,
		'fingerprint': i14,
		'face': i15,
		'gesture': i16,
		'lock': i17,
		'key': i18,
		'logout': i19,
		'info': i20,
		'phone': i21,
		'refresh': i22,
		'clock': i23,
		'shield': i24,
		'close': i25,
		'edit': i26,
		'calendar': i27,
		'landmark': i28,
		'image': i29,
		'eye': i30,
		'eye-off': i31,
		'upload': i32,
		'map': i33,
		'chart': i34,
		'file': i35,
		'plus': i36,
		'mic': i37,
		'help': i38,
		'tools': i39,
	};

	// 取出 <svg> 内部的 path，外层 <svg> 由模板统一提供
	const ICONS = Object.fromEntries(Object.entries(RAW).map(([key, svg]) => [key, svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')]));

	export default {
		name: 'AppIcon',
		props: {
			name: { type: String, required: true },
			size: { type: Number, default: 44 },
			color: { type: String, default: 'currentColor' },
			// 兼容旧调用：Remix Icon 为填充路径，不再使用描边粗细
			stroke: { type: Number, default: 2 },
		},
		computed: {
			body() {
				return ICONS[this.name] || ICONS.info;
			},
			px() {
				return `${Math.round(this.size / 2)}px`;
			},
		},
	};
</script>

<style>
	.app-icon {
		display: block;
		flex-shrink: 0;
	}
</style>
