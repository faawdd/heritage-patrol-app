<template>
	<Teleport to="body">
		<div v-if="state.visible" class="fixed inset-0 z-[30000] flex items-center justify-center bg-[var(--c-mask)] p-6">
			<div class="w-full max-w-[21.25rem] overflow-hidden rounded-[1.125rem] bg-surface shadow-xl" role="dialog" aria-modal="true">
				<div class="flex items-center gap-3 bg-gradient-primary px-[1.125rem] pt-[1.125rem] pb-3.5 text-on-primary">
					<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-on-primary/15">
						<AppIcon name="upload" :size="52" color="var(--c-on-primary)" />
					</div>
					<div class="flex min-w-0 flex-col">
						<span class="text-lg font-extrabold tracking-[0.03125rem]">{{ title }}</span>
						<span class="mt-0.5 truncate text-[0.8125rem] opacity-85">
							新版本 v{{ info.version }}<template v-if="sizeText"> · {{ sizeText }}</template>
						</span>
					</div>
				</div>

				<div class="px-[1.125rem] pt-4 pb-1">
					<template v-if="state.phase === 'available'">
						<p class="mb-2 text-[0.9375rem] leading-relaxed text-ink-2">新版本已发布，建议立即更新以获得最新功能和问题修复。</p>
						<p v-if="state.currentVersion" class="my-2 text-[0.8125rem] leading-snug text-ink-3">当前版本 v{{ state.currentVersion }}</p>
					</template>

					<template v-else-if="state.phase === 'downloading'">
						<div class="h-2.5 overflow-hidden rounded-full bg-line">
							<div class="h-full rounded-full bg-gradient-primary transition-[width] duration-200" :style="{ width: `${state.percent}%` }" />
						</div>
						<div class="mt-1.5 flex justify-between text-[0.8125rem] tabular-nums text-ink-2">
							<span>{{ loadedText }}</span>
							<span>{{ state.percent }}%</span>
						</div>
						<p class="my-2 text-[0.8125rem] leading-snug text-ink-3">下载期间请保持网络连接，不要退出软件。</p>
					</template>

					<template v-else-if="state.phase === 'ready'">
						<p class="mb-2 text-[0.9375rem] leading-relaxed text-ink-2">安装包已下载并校验通过。如果没有弹出安装界面，请点击下方按钮。</p>
					</template>

					<template v-else-if="state.phase === 'permission'">
						<p class="mb-2 text-[0.9375rem] leading-relaxed text-ink-2">安装更新需要允许本软件“安装未知应用”。</p>
						<p class="my-2 text-[0.8125rem] leading-snug text-ink-3">点击“去设置”，打开“允许来自此来源的应用”开关后返回，即可自动继续安装。</p>
					</template>

					<template v-else-if="state.phase === 'error'">
						<p class="mb-2 text-[0.9375rem] leading-relaxed text-danger">{{ state.error }}</p>
					</template>
				</div>

				<div class="flex gap-2.5 px-[1.125rem] pt-3 pb-[1.125rem]">
					<template v-if="state.phase === 'available'">
						<van-button native-type="button" plain class="min-h-11 flex-1 rounded-xl !border-0 !bg-fill text-base font-bold !text-ink-2" @click="dismissUpdate">以后再说</van-button>
						<van-button native-type="button" plain class="min-h-11 flex-1 rounded-xl !border-0 !bg-gradient-primary text-base font-bold !text-on-primary" @click="startDownload">立即更新</van-button>
					</template>
					<template v-else-if="state.phase === 'downloading'">
						<van-button native-type="button" plain class="min-h-11 flex-1 rounded-xl !border-0 !bg-fill text-base font-bold !text-ink-2" @click="dismissUpdate">取消下载</van-button>
					</template>
					<template v-else-if="state.phase === 'ready'">
						<van-button native-type="button" plain class="min-h-11 flex-1 rounded-xl !border-0 !bg-fill text-base font-bold !text-ink-2" @click="dismissUpdate">关闭</van-button>
						<van-button native-type="button" plain class="min-h-11 flex-1 rounded-xl !border-0 !bg-gradient-primary text-base font-bold !text-on-primary" @click="installUpdate">安装</van-button>
					</template>
					<template v-else-if="state.phase === 'permission'">
						<van-button native-type="button" plain class="min-h-11 flex-1 rounded-xl !border-0 !bg-fill text-base font-bold !text-ink-2" @click="dismissUpdate">取消</van-button>
						<van-button native-type="button" plain class="min-h-11 flex-1 rounded-xl !border-0 !bg-gradient-primary text-base font-bold !text-on-primary" @click="openInstallSettings">去设置</van-button>
					</template>
					<template v-else-if="state.phase === 'error'">
						<van-button native-type="button" plain class="min-h-11 flex-1 rounded-xl !border-0 !bg-fill text-base font-bold !text-ink-2" @click="dismissUpdate">关闭</van-button>
						<van-button native-type="button" plain class="min-h-11 flex-1 rounded-xl !border-0 !bg-gradient-primary text-base font-bold !text-on-primary" @click="startDownload">重试</van-button>
					</template>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup>
	import { computed } from 'vue';
	import AppIcon from '@/components/AppIcon.vue';
	import {
		updateState as state,
		dismissUpdate,
		startDownload,
		installUpdate,
		openInstallSettings,
	} from '@/lib/updater.js';

	const info = computed(() => state.info || {});

	const formatSize = (bytes) => {
		if (!bytes) {
			return '';
		}
		return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
	};

	const sizeText = computed(() => formatSize(state.total || info.value.size));
	const loadedText = computed(() => `${formatSize(state.loaded) || '0 KB'} / ${sizeText.value || '未知大小'}`);

	const title = computed(() => ({
		available: '发现新版本',
		downloading: '正在下载更新',
		ready: '下载完成',
		permission: '需要安装权限',
		error: '更新失败',
	}[state.phase] || '软件更新'));
</script>


