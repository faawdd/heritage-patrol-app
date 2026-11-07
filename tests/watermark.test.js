import assert from 'node:assert/strict';
import test from 'node:test';
import { addWatermark } from '../src/lib/watermark.js';

test('watermark draws every line within the image width', async () => {
	const oldImage = globalThis.Image;
	const oldDocument = globalThis.document;
	const oldCreate = URL.createObjectURL;
	const lines = [];
	const context = { drawImage() {}, fillRect() {}, fillText: (...args) => lines.push(args) };
	globalThis.Image = class {
		naturalWidth = 320;
		naturalHeight = 480;
		set src(_value) { queueMicrotask(() => this.onload()); }
	};
	globalThis.document = {
		createElement: () => ({ getContext: () => context, toBlob: callback => callback(new Blob(['image'])) }),
	};
	URL.createObjectURL = () => 'blob:test';
	try {
		await addWatermark('photo', '文物点: 测试\n四普编号: 650100-0001\n坐标: 90.000000, 42.000000');
		assert.equal(lines.length, 3);
		assert.equal(lines[1][0], '四普编号: 650100-0001');
		for (const [, x, , maxWidth] of lines) {
			assert.ok(maxWidth > 0 && maxWidth <= x);
		}
	} finally {
		globalThis.Image = oldImage;
		globalThis.document = oldDocument;
		URL.createObjectURL = oldCreate;
	}
});
