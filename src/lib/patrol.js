import { getUser, isLoggedIn } from './auth.js';
import { apiRequest, apiUpload, extractError } from './request.js';
import { enqueuePending, listPending, readCache, removePending, saveCache, savePending } from './patrolStore.js';

let syncing;
export const PATROL_CHANGED = 'patrol-changed';
const changed = () => window.dispatchEvent(new Event(PATROL_CHANGED));

function requireAccount(userId) {
	if (getUser()?.id !== userId) throw new Error('账号已切换，请在当前账号重新操作');
}

export function pendingPatrols() {
	return listPending(getUser()?.id);
}

export async function loadTasks({ refresh = true } = {}) {
	const userId = getUser()?.id;
	if (!userId) throw new Error('请先联网登录');
	const cached = await readCache(userId, 'tasks');
	requireAccount(userId);
	if (!refresh || navigator.onLine === false) {
		if (!cached) throw new Error('没有离线任务，请联网下载巡查任务');
		return { ...cached.value, cached: true, savedAt: cached.savedAt };
	}
	try {
		requireAccount(userId);
		const res = await apiRequest({ url: '/api/inspections/tasks' });
		requireAccount(userId);
		if (res.statusCode !== 200) throw new Error(extractError(res, '下载巡查任务失败'));
		await saveCache(userId, 'tasks', res.data);
		return res.data;
	} catch (error) {
		if (cached && error.errMsg) return { ...cached.value, cached: true, savedAt: cached.savedAt };
		throw error;
	}
}

export async function enqueuePatrol(payload, files) {
	const userId = getUser()?.id;
	if (!userId || !isLoggedIn()) throw new Error('请先登录');
	if (!files.length || files.length > 20) throw new Error('请添加 1 至 20 张照片');
	const photos = await Promise.all(files.map(async file => {
		const blob = file instanceof Blob ? file : await fetch(file).then(res => {
			if (!res.ok) throw new Error('读取巡查照片失败');
			return res.blob();
		});
		if (!blob.size || blob.size > 10 * 1024 * 1024) throw new Error('每张照片需大于 0 且不超过 10 MB');
		return blob;
	}));
	requireAccount(userId);
	const client_id = crypto.randomUUID();
	const row = { ...payload, client_id, userId, key: `${userId}:${client_id}`, photos, error: '', inspect_time: payload.inspect_time || new Date().toISOString() };
	await enqueuePending(row);
	changed();
	return row;
}

export async function syncPatrols() {
	if (syncing) return syncing;
	if (navigator.onLine === false || !isLoggedIn()) return { uploaded: 0 };
	const userId = getUser()?.id;
	if (!userId) return { uploaded: 0 };
	syncing = (async () => {
		let uploaded = 0;
		let distanceSupported = false;
		for (const row of await listPending(userId)) {
			if (getUser()?.id !== userId || navigator.onLine === false || !isLoggedIn()) break;
			try {
				if (row.distance_meters != null && !distanceSupported) {
					const capability = await apiRequest({ url: '/api/inspections/capabilities' });
					if (capability.statusCode !== 200 || capability.data?.distance_meters !== true) {
						throw new Error('服务器尚不支持巡查距离，请更新服务器后重试；记录已保存在本机');
					}
					distanceSupported = true;
				}
				const res = await apiUpload({
					url: '/api/inspections/upload',
					files: row.photos,
					name: 'photos',
					formData: {
						site_id: row.site_id, latitude: row.latitude, longitude: row.longitude,
						distance_meters: row.distance_meters,
						is_normal: row.is_normal, issue_details: row.issue_details,
						client_id: row.client_id, inspect_time: row.inspect_time,
					},
				});
				if (![200, 201].includes(res.statusCode)) throw new Error(extractError(res, '同步失败'));
				await removePending(row.key);
				uploaded += 1;
			} catch (error) {
				await savePending({ ...row, error: error.errMsg ? '网络连接失败，记录仍保存在本机，请联网后重试' : error.message || '同步失败，请重试' });
				changed();
				if (error.errMsg || !isLoggedIn()) break;
			}
			changed();
		}
		return { uploaded };
	})().finally(() => { syncing = null; });
	return syncing;
}

export async function loadPatrolRecords({ page = 1, status = 'all' } = {}) {
	const userId = getUser()?.id;
	if (!userId) throw new Error('请先登录');
	const cacheKey = `records-v2:${status}:${page}`;
	const cached = await readCache(userId, cacheKey);
	requireAccount(userId);
	if (navigator.onLine === false) {
		if (!cached) throw new Error('该页没有离线缓存，请联网加载');
		return { ...cached.value, cached: true };
	}
	try {
		requireAccount(userId);
		const res = await apiRequest({ url: '/api/inspections/records', data: { page, page_size: 20, status } });
		requireAccount(userId);
		if (res.statusCode !== 200) throw new Error(extractError(res, '加载巡查记录失败'));
		await saveCache(userId, cacheKey, res.data);
		requireAccount(userId);
		return res.data;
	} catch (error) {
		requireAccount(userId);
		if (cached && error.errMsg) return { ...cached.value, cached: true };
		throw error;
	}
}
