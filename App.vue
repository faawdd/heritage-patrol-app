<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	page {
		background: #f5f8ff;
		color: #334155;
		font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
	}

	:root {
		--bg-primary: #f5f8ff;
		--bg-secondary: #eef3ff;
		--surface: rgba(255, 255, 255, 0.95);
		--surface-strong: #ffffff;
		--surface-dark: #163f77;
		--line-soft: rgba(51, 65, 85, 0.12);
		--line-strong: rgba(51, 65, 85, 0.2);
		--text-primary: #334155;
		--text-secondary: #5f7188;
		--text-contrast: #f7fbfd;
		--accent: #163f77;
		--accent-soft: rgba(22, 63, 119, 0.14);
		--accent-strong: #163f77;
		--accent-glow: rgba(22, 63, 119, 0.24);
		--success: #a5d6a7;
		--shadow-soft: 0 10rpx 24rpx rgba(0, 0, 0, 0.04);
		--shadow-strong: 0 14rpx 30rpx rgba(0, 0, 0, 0.06);
		--input-bg: #f1f5ff;
		--danger: #ba3f1d;
		--danger-soft: rgba(186, 63, 29, 0.12);
		--focus-ring: rgba(22, 63, 119, 0.2);
		--transition-fast: all 160ms ease;
		--transition-page: 220ms cubic-bezier(0.22, 1, 0.36, 1);
		--transition-module: 260ms cubic-bezier(0.22, 1, 0.36, 1);
		--radius-card: 24rpx;
		--radius-pill: 999rpx;
		--topbar-min-height: 176rpx;
		--card-padding: 24rpx;
		--title-xl: 20px;
		--title-lg: 18px;
		--title-md: 16px;
	}

	button {
		border: none;
		transition: var(--transition-fast);
	}

	button[disabled] {
		opacity: 0.56;
		transform: none;
	}

	input,
	textarea,
	picker {
		transition: var(--transition-fast);
	}

	input:focus,
	textarea:focus {
		box-shadow: 0 0 0 4rpx var(--focus-ring);
	}

	.page,
	.container {
		animation: pageFadeIn var(--transition-page) both;
	}

	.header-card,
	.hero,
	.hero-card,
	.notice {
		box-shadow: var(--shadow-strong);
	}

	.card,
	.record-card,
	.empty-card,
	.summary-card,
	.section,
	.location-section,
	.heritage-section,
	.action-section,
	.preview-section,
	.manual-section,
	.form-card,
	.tabs,
	.feature-item,
	.stat-card {
		animation: moduleRise var(--transition-module) both;
	}

	.card,
	.record-card,
	.empty-card,
	.summary-card,
	.section,
	.location-section,
	.heritage-section,
	.action-section,
	.preview-section,
	.manual-section,
	.form-card {
		padding: var(--card-padding);
	}

	.header-title,
	.hero-title,
	.title {
		font-size: var(--title-xl);
	}

	.card-title,
	.section-title,
	.record-site,
	.editor-title,
	.empty-title {
		font-size: var(--title-lg);
	}

	@keyframes pageFadeIn {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	@keyframes moduleRise {
		from {
			opacity: 0;
			transform: translateY(14rpx);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.page,
		.container,
		.card,
		.record-card,
		.empty-card,
		.summary-card,
		.section,
		.location-section,
		.heritage-section,
		.action-section,
		.preview-section,
		.manual-section,
		.form-card,
		.tabs,
		.feature-item,
		.stat-card {
			animation: none;
		}
	}
</style>
