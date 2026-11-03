<template>
	<div class="gesture-wrap">
		<div
			class="gesture-pad"
			:class="{ 'is-error': status === 'error', 'is-success': status === 'success' }"
			:style="padStyle"
			ref="pad"
			@pointerdown.stop.prevent="onStart"
			@pointermove.stop.prevent="onMove"
			@pointerup.stop.prevent="onEnd"
			@pointercancel.stop.prevent="onEnd"
		>
			<div
				v-for="line in lines"
				:key="line.key"
				class="gesture-line"
				:style="line.style"
			/>
			<div v-if="tailStyle" class="gesture-line" :style="tailStyle" />
			<div
				v-for="dot in dots"
				:key="dot.index"
				class="gesture-dot"
				:class="{ active: selected.indexOf(dot.index) > -1 }"
				:style="dot.style"
			>
				<div class="gesture-dot-core" />
			</div>
		</div>
	</div>
</template>

<script>
	import { vibrateShort } from '@/lib/native.js';

	// 九宫格手势：点位编号 1-9，返回连线顺序数组。
	export default {
		name: 'GestureLock',
		props: {
			size: { type: Number, default: 600 },
			disabled: { type: Boolean, default: false },
		},
		emits: ['complete'],
		data() {
			return {
				selected: [],
				rect: null,
				pointerId: null,
				cursor: null,
				status: '',
				drawing: false,
				resetTimer: null,
			};
		},
		computed: {
			sizePx() {
				return this.size / 2;
			},
			cell() {
				return this.sizePx / 3;
			},
			dotSize() {
				return this.cell * 0.56;
			},
			padStyle() {
				return { width: `${this.sizePx}px`, height: `${this.sizePx}px` };
			},
			dots() {
				const list = [];
				for (let i = 0; i < 9; i += 1) {
					const center = this.centerOf(i + 1);
					list.push({
						index: i + 1,
						style: {
							width: `${this.dotSize}px`,
							height: `${this.dotSize}px`,
							left: `${center.x - this.dotSize / 2}px`,
							top: `${center.y - this.dotSize / 2}px`,
						},
					});
				}
				return list;
			},
			lines() {
				const result = [];
				for (let i = 1; i < this.selected.length; i += 1) {
					result.push({
						key: `${this.selected[i - 1]}-${this.selected[i]}`,
						style: this.lineStyle(this.centerOf(this.selected[i - 1]), this.centerOf(this.selected[i])),
					});
				}
				return result;
			},
			tailStyle() {
				if (!this.drawing || !this.cursor || !this.selected.length) {
					return null;
				}
				return this.lineStyle(this.centerOf(this.selected[this.selected.length - 1]), this.cursor);
			},
		},
		beforeUnmount() {
			clearTimeout(this.resetTimer);
		},
		methods: {
			centerOf(index) {
				const i = index - 1;
				return {
					x: (i % 3) * this.cell + this.cell / 2,
					y: Math.floor(i / 3) * this.cell + this.cell / 2,
				};
			},
			lineStyle(from, to) {
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const length = Math.sqrt(dx * dx + dy * dy);
				const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
				return {
					left: `${from.x}px`,
					top: `${from.y - 4}px`,
					width: `${length}px`,
					transform: `rotate(${angle}deg)`,
				};
			},
			measure() {
				this.rect = this.$refs.pad.getBoundingClientRect();
				return this.rect;
			},
			point(event) {
				if (!this.rect) {
					return null;
				}
				return { x: event.clientX - this.rect.left, y: event.clientY - this.rect.top };
			},
			hit(p) {
				if (!p) {
					return 0;
				}
				const col = Math.floor(p.x / this.cell);
				const row = Math.floor(p.y / this.cell);
				if (col < 0 || col > 2 || row < 0 || row > 2) {
					return 0;
				}
				const index = row * 3 + col + 1;
				const center = this.centerOf(index);
				const dist = Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2);
				return dist <= this.cell * 0.4 ? index : 0;
			},
			addPoint(index) {
				if (!index || this.selected.indexOf(index) > -1) {
					return;
				}
				const last = this.selected[this.selected.length - 1];
				if (last) {
					// 自动补上中间经过的点（如 1 -> 3 经过 2）
					const a = this.centerOf(last);
					const b = this.centerOf(index);
					const mid = this.hit({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
					const isMidpoint = (last + index) % 2 === 0 && mid && mid !== last && mid !== index;
					if (isMidpoint && this.selected.indexOf(mid) < 0) {
						this.selected.push(mid);
					}
				}
				this.selected.push(index);
				vibrateShort('light');
			},
			onStart(event) {
				if (this.disabled) {
					return;
				}
				clearTimeout(this.resetTimer);
				this.status = '';
				this.selected = [];
				this.drawing = true;
				this.pointerId = event.pointerId;
				try {
					this.$refs.pad.setPointerCapture(event.pointerId);
				} catch (e) {
					// ignore
				}
				this.measure();
				const p = this.point(event);
				this.cursor = p;
				this.addPoint(this.hit(p));
			},
			onMove(event) {
				if (!this.drawing || this.disabled || !this.rect || event.pointerId !== this.pointerId) {
					return;
				}
				const p = this.point(event);
				this.cursor = p;
				this.addPoint(this.hit(p));
			},
			onEnd(event) {
				if (!this.drawing || (event && event.pointerId !== this.pointerId)) {
					return;
				}
				this.drawing = false;
				this.cursor = null;
				if (!this.selected.length) {
					return;
				}
				this.$emit('complete', this.selected.slice());
			},
			// 由父组件调用：显示结果颜色，随后清空
			showResult(ok, delay = 700) {
				this.status = ok ? 'success' : 'error';
				clearTimeout(this.resetTimer);
				this.resetTimer = setTimeout(() => this.reset(), delay);
			},
			reset() {
				this.status = '';
				this.selected = [];
				this.cursor = null;
				this.drawing = false;
			},
		},
	};
</script>

<style scoped>
	.gesture-wrap {
		display: flex;
		justify-content: center;
	}

	.gesture-pad {
		position: relative;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.gesture-dot {
		position: absolute;
		border-radius: 50%;
		border: 3px solid var(--c-line-strong);
		background: var(--c-surface);
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		z-index: 2;
		transition: border-color 0.15s, transform 0.15s;
	}

	.gesture-dot-core {
		width: 26%;
		height: 26%;
		border-radius: 50%;
		background: var(--c-line-strong);
	}

	.gesture-dot.active {
		border-color: var(--c-primary);
		background: var(--c-primary-light);
		transform: scale(1.08);
	}

	.gesture-dot.active .gesture-dot-core {
		background: var(--c-primary);
		width: 36%;
		height: 36%;
	}

	.gesture-line {
		position: absolute;
		height: 8px;
		border-radius: 4px;
		background: rgba(30, 90, 168, 0.75);
		transform-origin: 0 50%;
		z-index: 1;
	}

	.is-error .gesture-dot.active {
		border-color: var(--c-danger);
		background: var(--c-danger-bg);
	}

	.is-error .gesture-dot.active .gesture-dot-core {
		background: var(--c-danger);
	}

	.is-error .gesture-line {
		background: rgba(198, 40, 40, 0.75);
	}

	.is-success .gesture-dot.active {
		border-color: var(--c-success);
		background: var(--c-success-bg);
	}

	.is-success .gesture-dot.active .gesture-dot-core {
		background: var(--c-success);
	}

	.is-success .gesture-line {
		background: rgba(21, 128, 61, 0.75);
	}
</style>
