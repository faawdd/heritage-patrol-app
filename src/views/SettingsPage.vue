<template>
	<ion-page>
		<ion-content :fullscreen="true">
			<div class="u-page">
				<AppHeader title="软件设置" subtitle="现场采集海拔" back />
				<div class="u-body settings-body">
					<div class="u-card settings-card">
						<h2>海拔获取设置</h2>
						<label class="field">
							<span>海拔来源</span>
							<select v-model="settings.source" class="u-input">
								<option value="both">GPS 和气压计</option>
								<option value="gps">仅 GPS</option>
								<option value="barometer">仅气压计</option>
							</select>
						</label>
						<label class="field">
							<span>多次采样处理方式</span>
							<select v-model="settings.method" class="u-input">
								<option value="average">平均值</option>
								<option value="median">中位数</option>
							</select>
						</label>
						<label class="field">
							<span>每次采集组数</span>
							<select v-model.number="settings.sampleCount" class="u-input">
								<option :value="2">2 组</option>
								<option :value="3">3 组（默认）</option>
								<option :value="5">5 组</option>
							</select>
						</label>
						<label class="field">
							<span>当地海平面参考气压（hPa）</span>
							<input v-model.number="settings.seaLevelPressure" class="u-input" type="number" inputmode="decimal" min="870" max="1085" step="0.01" />
						</label>
						<p class="note">默认标准气压为 1013.25 hPa。建议填写当地最新海平面气压；气压海拔受天气影响，为估算值。GPS 和气压海拔基准可能不同，平均值不代表测绘高程。</p>
						<p class="note">两种来源分别按所选方式处理后等权平均；其中一种不可用时使用可用来源并提示。仅气压计模式仍需 GPS 获取坐标。采样期间请停留在同一位置。</p>
						<button type="button" class="u-btn primary block" @click="save">保存设置</button>
					</div>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script>
	import { IonContent, IonPage } from '@ionic/vue';
	import AppHeader from '@/components/AppHeader.vue';
	import { DEFAULT_ALTITUDE_SETTINGS, loadAltitudeSettings, saveAltitudeSettings } from '@/lib/altitude-settings.js';
	import { toast } from '@/lib/ui.js';

	export default {
		components: { IonContent, IonPage, AppHeader },
		data() {
			return { settings: { ...DEFAULT_ALTITUDE_SETTINGS } };
		},
		ionViewWillEnter() {
			try {
				this.settings = loadAltitudeSettings();
			} catch (error) {
				toast(error.message || '海拔设置读取失败，请重新保存', { icon: 'none', duration: 4000 });
			}
		},
		methods: {
			save() {
				try {
					this.settings = saveAltitudeSettings(this.settings);
					toast('海拔设置已保存', { icon: 'success' });
				} catch (error) {
					toast(error.message || '设置保存失败，请重试', { icon: 'none' });
				}
			},
		},
	};
</script>

<style scoped>
	.settings-body { padding-top: 16px; }
	.settings-card h2 { margin: 0 0 18px; font-size: 19px; color: #0F172A; }
	.field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; color: #334155; font-weight: 700; }
	.note { color: #64748B; font-size: 14px; line-height: 1.6; }
</style>
