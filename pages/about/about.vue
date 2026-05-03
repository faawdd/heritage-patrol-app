<template>
	<view class="page">
		<view class="hero">
			<text class="hero-kicker">{{ t('about.heroLabel') }}</text>
			<text class="hero-title">{{ t('about.title') }}</text>
			<text class="hero-subtitle">{{ t('about.subtitle') }}</text>
		</view>

		<view class="card">
			<text class="label">{{ t('about.authorLabel') }}</text>
			<text class="value">{{ t('about.authorValue') }}</text>

			<text class="label">{{ t('about.contactLabel') }}</text>
			<text class="value contact">{{ t('about.contactValue') }}</text>

			<text class="label">{{ t('about.versionLabel') }}</text>
			<text class="value">{{ t('about.versionValue') }}</text>

			<text class="label">{{ t('about.noteLabel') }}</text>
			<text class="value note">{{ t('about.noteValue') }}</text>
		</view>
	</view>
</template>

<script>
	import createPageI18n from '../../common/js/pageI18n.js';

	export default {
		mixins: [createPageI18n('about')],
	};
</script>

<style>
	.page {
		min-height: 100vh;
		padding: 24rpx;
		box-sizing: border-box;
		background: var(--bg-primary);
	}

	.hero {
		min-height: var(--topbar-min-height);
		padding: var(--card-padding);
		border-radius: var(--radius-card);
		background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
		color: #fff;
		box-shadow: var(--shadow-strong);
		margin-bottom: 20rpx;
	}

	.hero-kicker {
		display: block;
		font-size: 20rpx;
		letter-spacing: 3rpx;
		text-transform: uppercase;
		opacity: 0.72;
		margin-bottom: 10rpx;
	}

	.hero-title {
		display: block;
		font-size: 20px;
		font-weight: 700;
		margin-bottom: 10rpx;
	}

	.hero-subtitle {
		display: block;
		font-size: 14px;
		line-height: 1.6;
		opacity: 0.88;
	}

	.card {
		background: #fff;
		border-radius: 18rpx;
		border: 1rpx solid var(--line-soft);
		padding: var(--card-padding);
		box-shadow: var(--shadow-soft);
	}

	.label {
		display: block;
		font-size: 14px;
		color: var(--text-secondary);
		margin-top: 10rpx;
	}

	.value {
		display: block;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		margin: 6rpx 0 14rpx;
		line-height: 1.6;
	}

	.value.note {
		font-size: 16px;
		font-weight: 600;
	}

	.value.contact {
		font-size: 15px;
		font-weight: 600;
		white-space: pre-line;
	}
</style>