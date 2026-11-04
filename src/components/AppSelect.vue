<template>
	<div class="min-w-0 flex-1">
		<button
			type="button"
			class="flex h-full min-h-10 w-full items-center justify-between gap-2 bg-transparent text-left text-base text-ink disabled:opacity-50"
			:disabled="disabled"
			@click="open = true"
		>
			<span class="min-w-0 flex-1 truncate" :class="label ? 'text-ink' : 'text-ink-4'">{{ label || placeholder }}</span>
			<AppIcon name="chevron-down" :size="36" color="var(--c-text-4)" />
		</button>
		<van-popup v-model:show="open" position="bottom" round teleport="body">
			<van-picker
				:title="title"
				:columns="columns"
				:model-value="pickerValue"
				confirm-button-text="确定"
				cancel-button-text="取消"
				@confirm="onConfirm"
				@cancel="open = false"
			/>
		</van-popup>
	</div>
</template>

<script>
	import AppIcon from '@/components/AppIcon.vue';

	// 以选项下标作为值，兼容原生 <select> 的 {detail:{value}} 回调约定
	export default {
		name: 'AppSelect',
		components: { AppIcon },
		props: {
			options: { type: Array, default: () => [] },
			modelValue: { type: Number, default: 0 },
			placeholder: { type: String, default: '请选择' },
			title: { type: String, default: '' },
			disabled: { type: Boolean, default: false },
		},
		emits: ['update:modelValue', 'change'],
		data() {
			return { open: false };
		},
		computed: {
			columns() {
				return this.options.map((text, index) => ({ text: String(text), value: index }));
			},
			pickerValue() {
				return [this.modelValue];
			},
			label() {
				return this.options[this.modelValue] ?? '';
			},
		},
		methods: {
			onConfirm({ selectedValues }) {
				const value = Number(selectedValues?.[0] ?? 0);
				this.open = false;
				this.$emit('update:modelValue', value);
				this.$emit('change', { detail: { value } });
			},
		},
	};
</script>
