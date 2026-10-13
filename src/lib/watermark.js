/**
 * 在图片上添加水印（右下角多行文字，半透明底条）。
 * @param {string} src - 图片地址（webPath / dataURL / blob:）
 * @param {string} text - 水印文本，可包含换行
 * @param {object} [options] - { maxSide: 1920, quality: 0.92 }
 * @returns {Promise<{ blob: Blob, url: string }>} 带水印的 JPEG（url 为 blob: 地址，可直接预览）
 */
export function addWatermark(src, text, options = {}) {
	const maxSide = options.maxSide || 1920;
	const quality = options.quality || 0.92;
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = 'anonymous';
		image.onload = () => {
			try {
				const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
				const width = Math.max(1, Math.round(image.naturalWidth * scale));
				const height = Math.max(1, Math.round(image.naturalHeight * scale));
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(image, 0, 0, width, height);

				const fontSize = Math.max(16, Math.floor(Math.min(width, height) * 0.03));
				const lineHeight = Math.floor(fontSize * 1.35);
				const padding = Math.floor(fontSize * 0.9);
				const lines = String(text || '').split('\n');
				const blockHeight = lineHeight * lines.length + padding;

				ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
				ctx.fillRect(0, height - blockHeight - padding, width, blockHeight + padding);
				ctx.font = `${fontSize}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
				ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
				ctx.textAlign = 'right';
				ctx.textBaseline = 'bottom';
				lines.forEach((line, index) => {
					const y = height - padding - (lines.length - 1 - index) * lineHeight;
					ctx.fillText(line, width - padding, y);
				});

				canvas.toBlob((blob) => {
					if (!blob) {
						reject(new Error('canvas toBlob failed'));
						return;
					}
					resolve({ blob, url: URL.createObjectURL(blob) });
				}, 'image/jpeg', quality);
			} catch (error) {
				reject(error);
			}
		};
		image.onerror = () => reject(new Error('图片加载失败'));
		image.src = src;
	});
}
