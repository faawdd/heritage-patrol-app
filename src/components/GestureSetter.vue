<template>
	<div class="flex flex-col items-center">
		<span class="text-xl font-extrabold text-ink">{{ step === 1 ? '请画出新的手势密码' : '请再画一次，确认手势' }}</span>
		<span class="my-2 mb-4 min-h-[1.375rem] text-[0.9375rem] text-ink-3" :class="isError ? 'font-bold text-danger' : ''">{{ tip }}</span>
		<GestureLock ref="lock" :size="size" @complete="onComplete" />
		<div class="mt-4 flex gap-3">
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


