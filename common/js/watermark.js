// common/js/watermark.js

/**
 * 在图片上添加水印
 * @param {string} tempFilePath - uni.chooseImage返回的临时文件路径
 * @param {string} text - 要绘制的文本
 * @param {object} context - Vue组件实例的上下文 (this)，用于获取canvas
 * @returns {Promise<string>} - 返回带水印的图片的新临时文件路径
 */
export function addWatermark(tempFilePath, text, context) {
	return new Promise((resolve, reject) => {
		const ctx = uni.createCanvasContext('watermarkCanvas', context);
		const maxCanvasSide = 1920;

		// 获取图片信息
		uni.getImageInfo({
			src: tempFilePath,
			success: (image) => {
				const originalWidth = image.width;
				const originalHeight = image.height;
				const scale = Math.min(1, maxCanvasSide / Math.max(originalWidth, originalHeight));
				const width = Math.max(1, Math.round(originalWidth * scale));
				const height = Math.max(1, Math.round(originalHeight * scale));

				// 让页面中的离屏 canvas 与原图像素一致，避免导出被裁切
				if (context && context.watermarkCanvas) {
					context.watermarkCanvas.width = width;
					context.watermarkCanvas.height = height;
				}

				const drawWatermark = () => {
					ctx.clearRect(0, 0, width, height);
					ctx.drawImage(image.path || tempFilePath, 0, 0, width, height);

					const fontSize = Math.max(16, Math.floor(Math.min(width, height) * 0.03));
					const lineHeight = Math.floor(fontSize * 1.35);
					const padding = Math.floor(fontSize * 0.9);
					const textLines = text.split('\n');
					const blockHeight = lineHeight * textLines.length + padding;

					ctx.setFillStyle('rgba(0, 0, 0, 0.45)');
					ctx.fillRect(0, height - blockHeight - padding, width, blockHeight + padding);

					ctx.setFontSize(fontSize);
					ctx.setFillStyle('rgba(255, 255, 255, 0.96)');
					ctx.setTextAlign('right');
					ctx.setTextBaseline('bottom');

					textLines.forEach((line, index) => {
						const y = height - padding - (textLines.length - 1 - index) * lineHeight;
						ctx.fillText(line, width - padding, y);
					});

					ctx.draw(false, () => {
						uni.canvasToTempFilePath({
							canvasId: 'watermarkCanvas',
							x: 0,
							y: 0,
							width,
							height,
							destWidth: width,
							destHeight: height,
							fileType: 'jpg',
							quality: 0.92,
							success: (res) => {
								resolve(res.tempFilePath);
							},
							fail: (err) => {
								console.error('canvasToTempFilePath failed:', JSON.stringify(err));
								reject(err);
							}
						}, context);
					});
				};

				if (context && typeof context.$nextTick === 'function') {
					context.$nextTick(() => setTimeout(drawWatermark, 30));
					return;
				}

				setTimeout(drawWatermark, 30);
			},
			fail: (err) => {
				console.error('getImageInfo failed:', JSON.stringify(err));
				reject(err);
			}
		});
	});
}
