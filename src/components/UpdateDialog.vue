<template>
	<Teleport to="body">
		<div v-if="state.visible" class="upd-mask">
			<div class="upd-dialog" role="dialog" aria-modal="true">
				<div class="upd-head">
					<div class="upd-icon">
						<AppIcon name="upload" :size="52" color="#FFFFFF" />
					</div>
					<div class="upd-head-text">
						<span class="upd-title">{{ title }}</span>
						<span class="upd-sub">
							新版本 v{{ info.version }}<template v-if="sizeText"> · {{ sizeText }}</template>
						</span>
					</div>
				</div>

				<div class="upd-body">
					<template v-if="state.phase === 'available'">
						<p class="upd-text">新版本已发布，建议立即更新以获得最新功能和问题修复。</p>
						<p v-if="state.currentVersion" class="upd-hint">当前版本 v{{ state.currentVersion }}</p>
					</template>

					<template v-else-if="state.phase === 'downloading'">
						<div class="upd-progress">
							<div class="upd-bar" :style="{ width: `${state.percent}%` }" />
						</div>
						<div class="upd-progress-text">
							<span>{{ loadedText }}</span>
							<span>{{ state.percent }}%</span>
						</div>
						<p class="upd-hint">下载期间请保持网络连接，不要退出软件。</p>
					</template>

					<template v-else-if="state.phase === 'ready'">
						<p class="upd-text">安装包已下载并校验通过。如果没有弹出安装界面，请点击下方按钮。</p>
					</template>

					<template v-else-if="state.phase === 'permission'">
						<p class="upd-text">安装更新需要允许本软件“安装未知应用”。</p>
						<p class="upd-hint">点击“去设置”，打开“允许来自此来源的应用”开关后返回，即可自动继续安装。</p>
					</template>

					<template v-else-if="state.phase === 'error'">
						<p class="upd-text upd-error">{{ state.error }}</p>
					</template>
				</div>

				<div class="upd-actions">
					<template v-if="state.phase === 'available'">
						<van-button native-type="button" class="upd-btn ghost" @click="dismissUpdate">以后再说</van-button>
						<van-button native-type="button" class="upd-btn primary" @click="startDownload">立即更新</van-button>
					</template>
					<template v-else-if="state.phase === 'downloading'">
						<van-button native-type="button" class="upd-btn ghost full" @click="dismissUpdate">取消下载</van-button>
					</template>
					<template v-else-if="state.phase === 'ready'">
						<van-button native-type="button" class="upd-btn ghost" @click="dismissUpdate">关闭</van-button>
						<van-button native-type="button" class="upd-btn primary" @click="installUpdate">安装</van-button>
					</template>
					<template v-else-if="state.phase === 'permission'">
						<van-button native-type="button" class="upd-btn ghost" @click="dismissUpdate">取消</van-button>
						<van-button native-type="button" class="upd-btn primary" @click="openInstallSettings">去设置</van-button>
					</template>
					<template v-else-if="state.phase === 'error'">
						<van-button native-type="button" class="upd-btn ghost" @click="dismissUpdate">关闭</van-button>
						<van-button native-type="button" class="upd-btn primary" @click="startDownload">重试</van-button>
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

<style scoped>
	.upd-mask {
		position: fixed;
		inset: 0;
		z-index: 30000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		background: rgba(15, 23, 42, 0.5);
	}

	.upd-dialog {
		width: 100%;
		max-width: 340px;
		border-radius: 18px;
		background: #FFFFFF;
		box-shadow: 0 20px 48px rgba(15, 23, 42, 0.3);
		overflow: hidden;
	}

	.upd-head {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 18px 18px 14px;
		background: linear-gradient(135deg, #2A6BC2 0%, #1E5AA8 55%, #174B8F 100%);
		color: #FFFFFF;
	}

	.upd-icon {
		width: 44px;
		height: 44px;
		flex-shrink: 0;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.18);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.upd-head-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.upd-title {
		font-size: 18px;
		font-weight: 800;
		letter-spacing: 0.5px;
	}

	.upd-sub {
		margin-top: 2px;
		font-size: 13px;
		opacity: 0.85;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.upd-body {
		padding: 16px 18px 4px;
	}

	.upd-text {
		margin: 0 0 8px;
		font-size: 15px;
		line-height: 1.6;
		color: #334155;
	}

	.upd-error {
		color: #C62828;
	}

	.upd-hint {
		margin: 8px 0;
		font-size: 13px;
		line-height: 1.5;
		color: #64748B;
	}

	.upd-progress {
		height: 10px;
		border-radius: 5px;
		background: #E2E8F0;
		overflow: hidden;
	}

	.upd-bar {
		height: 100%;
		border-radius: 5px;
		background: linear-gradient(90deg, #2A6BC2, #174B8F);
		transition: width 0.2s ease;
	}

	.upd-progress-text {
		display: flex;
		justify-content: space-between;
		margin-top: 6px;
		font-size: 13px;
		color: #475569;
		font-variant-numeric: tabular-nums;
	}

	.upd-actions {
		display: flex;
		gap: 10px;
		padding: 12px 18px 18px;
	}

	.upd-btn {
		flex: 1;
		height: 44px;
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 700;
	}

	.upd-btn.primary {
		background: linear-gradient(135deg, #2A6BC2 0%, #1E5AA8 55%, #174B8F 100%);
		color: #FFFFFF;
	}

	.upd-btn.ghost {
		background: #F1F5F9;
		color: #475569;
	}

	.upd-btn:active {
		opacity: 0.85;
	}
</style>
