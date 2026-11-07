export function heritageLevelAccent(value) {
	const level = String(value || '').trim();
	if (level === 'GB' || level === '国保' || level === '全国重点文物保护单位') return 'national';
	if (['SB', 'XB', '省保', '县保', '自治区级文物保护单位', '县级文物保护单位',
		'省（自治区、直辖市）级文物保护单位', '市（县）级文物保护单位'].includes(level)) return 'local';
	return 'neutral';
}

export function heritageLevelShortLabel(value) {
	const level = String(value || '').trim();
	if (heritageLevelAccent(level) === 'national') return '国保';
	if (level === '自治区级文物保护单位') return '自治区级';
	if (level === '省（自治区、直辖市）级文物保护单位') return '省区级';
	if (['SB', '省保'].includes(level)) return '省级';
	if (level === '市（县）级文物保护单位') return '市县级';
	if (['XB', '县保', '县级文物保护单位'].includes(level)) return '县级';
	if (level === 'DS' || level === '尚未定级的不可移动文物') return '未定级';
	return level;
}
