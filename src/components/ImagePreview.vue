<template>
	<ion-content class="preview-content" :fullscreen="true" @click="close">
		<div ref="track" class="preview-track" @scroll.passive="onScroll">
			<div v-for="(url, i) in urls" :key="i" class="preview-slide">
				<img :src="url" class="preview-img" alt="" @click.stop />
			</div>
		</div>
		<div class="preview-bar">
			<span v-if="urls.length > 1" class="preview-count">{{ current + 1 }} / {{ urls.length }}</span>
			<button type="button" class="preview-close" aria-label="关闭" @click.stop="close">
				<AppIcon name="close" :size="48" color="#FFFFFF" :stroke="2.4" />
			</button>
		</div>
	</ion-content>
</template>

<script>
	// 图片全屏预览（替代 uni.previewImage），横向滑动切换，点击空白处关闭。
	import { IonContent, modalController } from '@ionic/vue';
	import AppIcon from './AppIcon.vue';

	export default {
		name: 'ImagePreview',
		components: { IonContent, AppIcon },
		props: {
			urls: { type: Array, default: () => [] },
			index: { type: Number, default: 0 },
		},
		data() {
			return { current: this.index };
		},
		mounted() {
			this.$nextTick(() => {
				const el = this.$refs.track;
				if (el) {
					el.scrollLeft = el.clientWidth * this.index;
				}
			});
		},
		methods: {
			onScroll() {
				const el = this.$refs.track;
				if (el && el.clientWidth) {
					this.current = Math.round(el.scrollLeft / el.clientWidth);
				}
			},
			close() {
				modalController.dismiss();
			},
		},
	};
</script>

<style>
	.image-preview-modal {
		--width: 100%;
		--height: 100%;
		--border-radius: 0;
	}

	.preview-content {
		--background: #000000;
	}

	.preview-track {
		display: flex;
		width: 100%;
		height: 100%;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
	}

	.preview-track::-webkit-scrollbar {
		display: none;
	}

	.preview-slide {
		flex: 0 0 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		scroll-snap-align: center;
	}

	.preview-img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.preview-bar {
		position: absolute;
		top: calc(env(safe-area-inset-top, 0px) + 12px);
		left: 16px;
		right: 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: #FFFFFF;
		font-size: 16px;
		pointer-events: none;
	}

	.preview-close {
		margin-left: auto;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.16);
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: auto;
	}
</style>
