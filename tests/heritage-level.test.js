import assert from 'node:assert/strict';
import test from 'node:test';
import { heritageLevelAccent, heritageLevelShortLabel } from '../src/lib/heritage-level.js';

test('protection levels use accents without assigning unclassified sites a level', () => {
	for (const value of ['GB', '国保', '全国重点文物保护单位']) {
		assert.equal(heritageLevelAccent(value), 'national', value);
	}
	for (const value of ['SB', 'XB', '省保', '县保', '自治区级文物保护单位', '县级文物保护单位', '省（自治区、直辖市）级文物保护单位', '市（县）级文物保护单位']) {
		assert.equal(heritageLevelAccent(value), 'local', value);
	}
	for (const value of ['DS', '尚未定级的不可移动文物', '', null, undefined, '未知等级']) {
		assert.equal(heritageLevelAccent(value), 'neutral', String(value));
	}
});

test('compact labels retain the real protection level', () => {
	assert.equal(heritageLevelShortLabel('全国重点文物保护单位'), '国保');
	assert.equal(heritageLevelShortLabel('自治区级文物保护单位'), '自治区级');
	assert.equal(heritageLevelShortLabel('省（自治区、直辖市）级文物保护单位'), '省区级');
	assert.equal(heritageLevelShortLabel('市（县）级文物保护单位'), '市县级');
	assert.equal(heritageLevelShortLabel('尚未定级的不可移动文物'), '未定级');
	assert.equal(heritageLevelShortLabel('未知等级'), '未知等级');
});
