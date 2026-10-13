<template>
	<svg
		class="app-icon"
		:width="px"
		:height="px"
		viewBox="0 0 24 24"
		fill="none"
		:stroke="color"
		:stroke-width="stroke"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		v-html="body"
	/>
</template>

<script>
	// 线性图标（24x24 视图），内联 SVG 渲染，支持任意颜色与尺寸。size 沿用原 rpx 数值（750 设计稿），按 1rpx = 0.5px 换算。
	const ICONS = {
		home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
		camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
		records: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><path d="M8.5 10h7M8.5 14h7M8.5 18h4"/>',
		user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
		grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
		pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
		locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
		search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
		check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
		'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
		alert: '<path d="M12 3.5 2.5 20h19L12 3.5z"/><path d="M12 10v4.5"/><path d="M12 17.5v.01"/>',
		'chevron-right': '<path d="m9 5 7 7-7 7"/>',
		'chevron-down': '<path d="m5 9 7 7 7-7"/>',
		fingerprint: '<path d="M12 11v3.5c0 2.5-.8 4.6-2 6.5"/><path d="M8.5 10.5a3.5 3.5 0 0 1 7 .5v2c0 2.3-.4 4.4-1.2 6.3"/><path d="M5.6 8A7.5 7.5 0 0 1 19.5 11v1.5c0 1.6-.2 3.1-.6 4.5"/><path d="M4.5 11.5v1c0 1.9-.5 3.6-1.3 5"/><path d="M7.5 3.8A8.8 8.8 0 0 1 17 4.2"/>',
		face: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1"/><path d="M9 15.5c1.7 1.3 4.3 1.3 6 0"/>',
		gesture: '<circle cx="5" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/><circle cx="5" cy="19" r="1.6"/><circle cx="12" cy="19" r="1.6"/><circle cx="19" cy="19" r="1.6"/><path d="M5 5l7 7 7-7M12 12v7"/>',
		lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
		key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l2.5 2.5M15 8l2 2"/>',
		logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
		info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.5v.01"/>',
		phone: '<path d="M5 3.5h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.6 6.6l1.4-2.3 4.5 1.8V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
		refresh: '<path d="M20 11.5A8 8 0 0 0 6 6.3L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 12.5A8 8 0 0 0 18 17.7l2-2.2"/><path d="M20 20v-4.5h-4.5"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
		shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
		close: '<path d="M6 6l12 12M18 6 6 18"/>',
		edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
		calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
		landmark: '<path d="M3 21h18"/><path d="M12 3 3.5 8.5V10h17V8.5L12 3z"/><path d="M6.5 10v8M10 10v8M14 10v8M17.5 10v8"/><path d="M4.5 18h15"/>',
		image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="m21 16-5-5-9 9"/>',
		eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
		'eye-off': '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4"/><path d="M6.6 6.6A17.6 17.6 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
		upload: '<path d="M12 16V4"/><path d="m6.5 9.5 5.5-5.5 5.5 5.5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
		map: '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4z"/><path d="M9 4v13.5M15 6.5V20"/>',
		chart: '<path d="M4 20V11M10 20V5M16 20v-6M2 20h20"/>',
		file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6"/>',
		plus: '<path d="M12 5v14M5 12h14"/>',
		mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
		help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><path d="M12 17v.01"/>',
	};

	export default {
		name: 'AppIcon',
		props: {
			name: { type: String, required: true },
			size: { type: Number, default: 44 },
			color: { type: String, default: '#1E5AA8' },
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
