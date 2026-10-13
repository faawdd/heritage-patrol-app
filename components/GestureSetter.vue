<template>
	<view class="gs">
		<text class="gs-title">{{ step === 1 ? '请画出新的手势密码' : '请再画一次，确认手势' }}</text>
		<text class="gs-tip" :class="{ error: isError }">{{ tip }}</text>
		<GestureLock ref="lock" :size="size" @complete="onComplete" />
		<view class="gs-actions">
			<button v-if="step === 2" class="u-btn plain sm" @click="restart">重新画</button>
			<button class="u-btn plain sm" @click="$emit('cancel')">{{ cancelText }}</button>
		</view>
	</view>
</template>

<script>
	import GestureLock from './GestureLock.vue';
	import { MIN_GESTURE_POINTS } from '../common/js/quickLogin.js';

	export default {
		name: 'GestureSetter',
		components: { GestureLock },
		props: {
			size: { type: Number, default: 580 },
			cancelText: { type: String, default: '取消' },
		},
		emits: ['confirm', 'cancel'],
		data() {
			return {
				step: 1,
				first: [],
				tip: `至少连接 ${MIN_GESTURE_POINTS} 个点`,
				isError: false,
			};
		},
		methods: {
			onComplete(points) {
				if (points.length < MIN_GESTURE_POINTS) {
					this.isError = true;
					this.tip = `至少连接 ${MIN_GESTURE_POINTS} 个点，请重画`;
					this.$refs.lock.showResult(false);
					return;
				}
				if (this.step === 1) {
					this.first = points;
					this.step = 2;
					this.isError = false;
					this.tip = '记住这个图案，再画一次';
					this.$refs.lock.showResult(true, 400);
					return;
				}
				if (points.join('-') !== this.first.join('-')) {
					this.isError = true;
					this.tip = '两次画的不一样，请再画一次';
					this.$refs.lock.showResult(false);
					return;
				}
				this.isError = false;
				this.tip = '手势设置成功';
				this.$refs.lock.showResult(true, 500);
				// #ifdef APP-PLUS
				uni.vibrateShort({ type: 'medium' });
				// #endif
				this.$emit('confirm', points);
			},
			restart() {
				this.step = 1;
				this.first = [];
				this.isError = false;
				this.tip = `至少连接 ${MIN_GESTURE_POINTS} 个点`;
				this.$refs.lock.reset();
			},
		},
	};
</script>

<style>
	.gs {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.gs-title {
		font-size: 40rpx;
		font-weight: 800;
		color: #0F172A;
	}

	.gs-tip {
		margin: 16rpx 0 32rpx;
		min-height: 44rpx;
		font-size: 30rpx;
		color: #64748B;
	}

	.gs-tip.error {
		color: #C62828;
		font-weight: 700;
	}

	.gs-actions {
		display: flex;
		gap: 24rpx;
		margin-top: 32rpx;
	}
</style>
