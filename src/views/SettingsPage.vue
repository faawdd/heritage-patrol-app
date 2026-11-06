<template>
	<div class="app-page">
		<div class="app-content">
			<div class="u-page">
				<AppHeader title="软件设置" back />
				<div class="u-body pt-3">
					<div class="u-card flex flex-col gap-4">
						<div>
							<h2 class="m-0 text-base font-semibold text-ink">海拔获取设置</h2>
							<label class="altitude-field">海拔来源
								<select v-model="altitude.source">
									<option value="both">GPS 和气压计</option>
									<option value="gps">仅 GPS</option>
									<option value="barometer">仅气压计</option>
								</select>
							</label>
							<label class="altitude-field">多次采样处理方式
								<select v-model="altitude.method">
									<option value="average">平均值</option>
									<option value="median">中位数</option>
								</select>
							</label>
							<label class="altitude-field">每次采集组数
								<select v-model.number="altitude.sampleCount">
									<option :value="2">2 组</option><option :value="3">3 组（默认）</option><option :value="5">5 组</option>
								</select>
							</label>
							<label class="altitude-field">海平面参考气压（hPa）
								<input v-model.number="altitude.seaLevelPressure" type="number" inputmode="decimal" min="870" max="1085" step="0.01" />
							</label>
							<p class="text-xs text-ink-3">默认标准气压 1013.25 hPa，建议填写当地最新海平面气压。气压海拔受天气影响，GPS 与气压海拔基准可能不同，融合值仅供估算。采样时请停留在同一位置。</p>
							<p class="text-xs text-ink-3">两种来源分别处理后等权平均；一种不可用时使用可用来源并提示。仅气压计模式仍需 GPS 获取坐标。</p>
							<van-button type="primary" block native-type="button" @click="saveAltitude">保存海拔设置</van-button>
						</div>
						<div>
							<h2 class="m-0 text-base font-semibold text-ink">深色模式</h2>
							<div class="mt-2 flex gap-1.5">
								<van-button
									v-for="mode in themeModes"
									:key="mode.key"
									native-type="button"
									size="small"
									class="min-w-0 flex-1"
									:type="prefs.theme === mode.key ? 'primary' : 'default'"
									:aria-pressed="prefs.theme === mode.key"
									@click="setPref('theme', mode.key)"
								>{{ mode.name }}</van-button>
							</div>
							<p class="mb-0 mt-2 text-xs text-ink-3">「跟随系统」会随手机深色模式自动切换</p>
						</div>

						<div>
							<h2 class="m-0 text-base font-semibold text-ink">主题色</h2>
							<div class="mt-2 grid grid-cols-2 gap-2.5">
								<button
									v-for="color in themeColors"
									:key="color.key"
									type="button"
									class="color-option"
									:class="{ selected: prefs.color === color.key }"
									:aria-pressed="prefs.color === color.key"
									@click="setPref('color', color.key)"
								>
									<span class="color-swatches">
										<span v-for="shade in color.palette" :key="shade" :style="{ backgroundColor: shade }" />
									</span>
									<span class="color-label">{{ color.name }}</span>
									<AppIcon v-if="prefs.color === color.key" name="check" :size="36" color="var(--c-primary)" />
								</button>
							</div>
						</div>

						<div>
							<h2 class="m-0 text-base font-semibold text-ink">字体大小</h2>
							<div class="mt-2 flex gap-1.5">
								<van-button
									v-for="font in fontSizes"
									:key="font.key"
									native-type="button"
									size="small"
									class="min-w-0 flex-1"
									:type="prefs.fontSize === font.key ? 'primary' : 'default'"
									:aria-pressed="prefs.fontSize === font.key"
									@click="setPref('fontSize', font.key)"
								>{{ font.name }}</van-button>
							</div>
							<p class="mb-0 mt-2 border border-dashed border-[var(--c-line-strong)] bg-fill px-3 py-2 text-base text-ink-2">巡查上报，记录文物点情况</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import AppHeader from '@/components/AppHeader.vue';
import AppIcon from '@/components/AppIcon.vue';
import { FONT_SIZES, THEME_COLORS, THEME_MODES, settings, updateSettings } from '@/lib/settings.js';
import { DEFAULT_ALTITUDE_SETTINGS, loadAltitudeSettings, saveAltitudeSettings } from '@/lib/altitude-settings.js';
import { toast } from '@/lib/ui.js';

export default {
	components: { AppHeader, AppIcon },
	data() {
		return {
			themeModes: THEME_MODES,
			themeColors: THEME_COLORS,
			fontSizes: FONT_SIZES,
			altitude: { ...DEFAULT_ALTITUDE_SETTINGS },
		};
	},
	computed: {
		prefs() {
			return settings;
		},
	},
	mounted() {
		try {
			this.altitude = loadAltitudeSettings();
		} catch (error) {
			toast(error.message || '海拔设置读取失败，请重新保存', { icon: 'none', duration: 4000 });
		}
	},
	methods: {
		saveAltitude() {
			try {
				this.altitude = saveAltitudeSettings(this.altitude);
				toast('海拔设置已保存', { icon: 'success' });
			} catch (error) {
				toast(error.message || '设置保存失败，请重试', { icon: 'none' });
			}
		},
		setPref(key, value) {
			updateSettings({ [key]: value });
		},
	},
};
</script>

<style scoped>
.altitude-field { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.75rem; color: var(--c-text); font-size: 0.875rem; }
.altitude-field select, .altitude-field input { min-height: 44px; width: 100%; padding: 0.5rem; border: 1px solid var(--c-line); background: var(--c-surface); color: var(--c-text); }
.color-option {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	gap: 0.5rem;
	min-width: 0;
	border: 1px solid var(--c-line);
	background: var(--c-surface);
	padding: 0.5rem;
	text-align: left;
}
.color-option.selected {
	border-color: var(--c-primary);
	box-shadow: 0 0 0 2px var(--c-primary-light);
}
.color-swatches {
	display: flex;
	grid-column: 1 / -1;
	height: 1rem;
	gap: 2px;
}
.color-swatches span { flex: 1; min-width: 0; }
.color-label { color: var(--c-text); font-size: 0.875rem; font-weight: 600; }
</style>
