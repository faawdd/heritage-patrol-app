<script>
	export default {
		onLaunch() {
			// #ifdef APP-PLUS
			plus.screen && plus.screen.lockOrientation && plus.screen.lockOrientation('portrait-primary');
			// #endif
		},
	};
</script>

<style>
	/* ==========  全局设计系统：大字号、高对比、大按钮，适合户外与老年用户  ========== */
	:root,
	page {
		--c-primary: #1E5AA8;
		--c-primary-dark: #0F2F5C;
		--c-primary-light: #E8F0FB;
		--c-gold: #D99A1E;
		--c-success: #15803D;
		--c-success-bg: #E7F6EC;
		--c-danger: #C62828;
		--c-danger-bg: #FDECEC;
		--c-warning: #B45309;
		--c-warning-bg: #FEF3E2;
		--c-bg: #F1F4F9;
		--c-surface: #FFFFFF;
		--c-text: #0F172A;
		--c-text-2: #334155;
		--c-text-3: #64748B;
		--c-line: #E2E8F0;
		--r-card: 28rpx;
		--r-btn: 24rpx;
		--shadow-card: 0 8rpx 28rpx rgba(15, 47, 92, 0.08);
		--shadow-btn: 0 12rpx 28rpx rgba(30, 90, 168, 0.28);

		/* 兼容管理端页面使用的旧变量名 */
		--bg-primary: #F1F4F9;
		--bg-secondary: #E8F0FB;
		--surface: #FFFFFF;
		--surface-strong: #FFFFFF;
		--surface-dark: #0F2F5C;
		--line-soft: #E2E8F0;
		--line-strong: #CBD5E1;
		--text-primary: #0F172A;
		--text-secondary: #475569;
		--text-contrast: #FFFFFF;
		--accent: #1E5AA8;
		--accent-soft: rgba(30, 90, 168, 0.12);
		--accent-strong: #174B8F;
		--accent-glow: rgba(30, 90, 168, 0.28);
		--success: #15803D;
		--shadow-soft: 0 8rpx 24rpx rgba(15, 47, 92, 0.06);
		--shadow-strong: 0 12rpx 32rpx rgba(15, 47, 92, 0.1);
		--input-bg: #F1F5FB;
		--danger: #C62828;
		--danger-soft: rgba(198, 40, 40, 0.1);
		--focus-ring: rgba(30, 90, 168, 0.24);
		--transition-fast: all 160ms ease;
		--radius-card: 28rpx;
		--radius-pill: 999rpx;
		--topbar-min-height: 176rpx;
		--card-padding: 28rpx;
		--title-xl: 22px;
		--title-lg: 19px;
		--title-md: 17px;
	}

	page {
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 32rpx;
		line-height: 1.5;
		font-family: -apple-system, "PingFang SC", "HarmonyOS Sans SC", "MiSans", "Microsoft YaHei", sans-serif;
	}

	button::after {
		border: none;
	}

	button {
		border: none;
		transition: var(--transition-fast);
	}

	button[disabled] {
		opacity: 0.5;
	}

	/* ---------- 新版通用组件类（u- 前缀） ---------- */
	.u-page {
		min-height: 100vh;
		background: var(--c-bg);
		box-sizing: border-box;
	}

	.u-page.has-tabbar {
		padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
	}

	.u-body {
		padding: 0 28rpx;
	}

	.u-card {
		background: var(--c-surface);
		border-radius: var(--r-card);
		padding: 32rpx;
		box-shadow: var(--shadow-card);
		margin-bottom: 28rpx;
		box-sizing: border-box;
	}

	.u-section-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 36rpx;
		font-weight: 700;
		color: var(--c-text);
		margin: 12rpx 4rpx 20rpx;
	}

	.u-section-title .u-link {
		font-size: 30rpx;
		font-weight: 500;
		color: var(--c-primary);
	}

	.u-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16rpx;
		height: 108rpx;
		padding: 0 36rpx;
		margin: 0;
		border-radius: var(--r-btn);
		font-size: 36rpx;
		font-weight: 700;
		line-height: 1;
		color: var(--c-primary);
		background: var(--c-primary-light);
		box-sizing: border-box;
	}

	.u-btn::after {
		display: none;
		border: none;
	}

	.u-btn:active {
		transform: scale(0.98);
		opacity: 0.9;
	}

	.u-btn.primary {
		color: #FFFFFF;
		background: linear-gradient(135deg, #2A6BC2 0%, #1E5AA8 55%, #174B8F 100%);
		box-shadow: var(--shadow-btn);
	}

	.u-btn.success {
		color: #FFFFFF;
		background: linear-gradient(135deg, #1C9A4C 0%, #15803D 100%);
		box-shadow: 0 12rpx 28rpx rgba(21, 128, 61, 0.28);
	}

	.u-btn.danger {
		color: #FFFFFF;
		background: linear-gradient(135deg, #DC3B3B 0%, #C62828 100%);
		box-shadow: 0 12rpx 28rpx rgba(198, 40, 40, 0.26);
	}

	.u-btn.ghost {
		color: var(--c-primary);
		background: #FFFFFF;
		border: 3rpx solid var(--c-primary);
	}

	.u-btn.plain {
		color: var(--c-text-2);
		background: #FFFFFF;
		border: 2rpx solid var(--c-line);
	}

	.u-btn.danger-ghost {
		color: var(--c-danger);
		background: #FFFFFF;
		border: 3rpx solid #F3C2C2;
	}

	.u-btn.xl {
		height: 128rpx;
		font-size: 40rpx;
		border-radius: 32rpx;
	}

	.u-btn.sm {
		height: 80rpx;
		font-size: 30rpx;
		padding: 0 28rpx;
		border-radius: 20rpx;
	}

	.u-btn.block {
		width: 100%;
	}

	.u-badge {
		display: inline-flex;
		align-items: center;
		gap: 8rpx;
		padding: 8rpx 20rpx;
		border-radius: 999rpx;
		font-size: 26rpx;
		font-weight: 700;
		line-height: 1.2;
		white-space: nowrap;
	}

	.u-badge.ok {
		color: var(--c-success);
		background: var(--c-success-bg);
	}

	.u-badge.bad {
		color: var(--c-danger);
		background: var(--c-danger-bg);
	}

	.u-badge.info {
		color: var(--c-primary);
		background: var(--c-primary-light);
	}

	.u-badge.warn {
		color: var(--c-warning);
		background: var(--c-warning-bg);
	}

	.u-input {
		height: 112rpx;
		padding: 0 28rpx;
		border-radius: 24rpx;
		background: #F5F7FB;
		border: 3rpx solid var(--c-line);
		font-size: 34rpx;
		color: var(--c-text);
		box-sizing: border-box;
	}

	.u-input-focus {
		border-color: var(--c-primary);
		background: #FFFFFF;
	}

	.u-placeholder {
		color: #94A3B8;
		font-size: 32rpx;
	}

	.u-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 64rpx 24rpx;
		color: var(--c-text-3);
		font-size: 32rpx;
		text-align: center;
		gap: 20rpx;
	}

	.u-row {
		display: flex;
		align-items: center;
	}

	.u-muted {
		color: var(--c-text-3);
	}

	.u-fade-in {
		animation: uFadeIn 260ms ease both;
	}

	@keyframes uFadeIn {
		from {
			opacity: 0;
			transform: translateY(16rpx);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ---------- 旧页面（管理端）保留的通用样式 ---------- */
	input:focus,
	textarea:focus {
		box-shadow: 0 0 0 4rpx var(--focus-ring);
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

	@media (prefers-reduced-motion: reduce) {
		.u-fade-in {
			animation: none;
		}
	}
</style>
