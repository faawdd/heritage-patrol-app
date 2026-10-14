<template>
	<div class="gs">
		<span class="gs-title">{{ step === 1 ? '请画出新的手势密码' : '请再画一次，确认手势' }}</span>
		<span class="gs-tip" :class="{ error: isError }">{{ tip }}</span>
		<GestureLock ref="lock" :size="size" @complete="onComplete" />
		<div class="gs-actions">
			<van-button native-type="button" v-if="step === 2" class="u-btn plain sm" @click="restart">重新画</van-button>
			<van-button native-type="button" class="u-btn plain sm" @click="$emit('cancel')">{{ cancelText }}</van-button>
		</div>
	</div>
</template>

<script>
	import { vibrateShort } from '@/lib/native.js';
	import GestureLock from './GestureLock.vue';
	import { MIN_GESTURE_POINTS } from '@/lib/quickLogin.js';

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
				vibrateShort('medium');
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

<style scoped>
	.gs {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.gs-title {
		font-size: 20px;
		font-weight: 800;
		color: #0F172A;
	}

	.gs-tip {
		margin: 8px 0 16px;
		min-height: 22px;
		font-size: 15px;
		color: #64748B;
	}

	.gs-tip.error {
		color: #C62828;
		font-weight: 700;
	}

	.gs-actions {
		display: flex;
		gap: 12px;
		margin-top: 16px;
	}
</style>
