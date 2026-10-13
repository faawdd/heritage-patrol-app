import { canUseOfflinePatrol, clearSession, setSession, unlockOfflinePatrol } from '../src/lib/auth.js';
import { enqueuePatrol, loadTasks, pendingPatrols, syncPatrols } from '../src/lib/patrol.js';
import { listPending, readCache, removeCache, removePending, saveCache } from '../src/lib/patrolStore.js';

// Run in a local Vite browser: (await import('/tests/patrol.browser.js')).runPatrolTests()
export async function runPatrolTests() {
	const storage = Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('heritage_app_')));
	const originalFetch = globalThis.fetch;
	const results = [];
	const ids = [-910001, -910002];
	const sessions = ids.map(id => ({ token: `test-${id}`, user: { id, username: `test-${id}`, role: '文物看护员' } }));
	const expect = (condition, message) => {
		if (!condition) throw new Error(message);
		results.push(message);
	};
	const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
	try {
		globalThis.fetch = async () => { throw new Error('Tests must not access external servers'); };
		clearSession();
		expect(!canUseOfflinePatrol(), '首次未认证账号不可离线使用');
		let rejected = false;
		try { unlockOfflinePatrol(); } catch { rejected = true; }
		expect(rejected, '首次离线解锁明确拒绝');
		setSession(sessions[0]);
		unlockOfflinePatrol();
		expect(canUseOfflinePatrol(), '联网认证后的账号可本地解锁');

		globalThis.fetch = async () => response({ items: [{ id: 42, name: '测试文物点' }] });
		await loadTasks();
		expect((await readCache(ids[0], 'tasks')).value.items[0].id === 42, '任务清单持久保存');
		expect((await loadTasks({ refresh: false })).cached, '可直接读取离线任务');
		const photos = [new Blob(['photo-1'], { type: 'image/jpeg' }), new Blob(['photo-2'], { type: 'image/jpeg' })];
		await saveCache(ids[0], 'draft', { photos });
		expect(await (await readCache(ids[0], 'draft')).value.photos[1].text() === 'photo-2', '照片 Blob 可从本机草稿恢复');
		const capturedTime = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
		const row = await enqueuePatrol({ site_id: 42, is_normal: true, latitude: 42, longitude: 90, inspect_time: capturedTime }, photos);
		const saved = (await pendingPatrols())[0];
		expect(saved.photos.length === 2 && await saved.photos[0].text() === 'photo-1', '多张照片原子保存至待同步队列');
		expect(saved.client_id === row.client_id && saved.inspect_time === capturedTime, '唯一提交编号与实际离线巡查时间持久保存');
		expect(!(await readCache(ids[0], 'draft')), '提交入队与删除草稿在同一事务中完成');

		setSession(sessions[1]);
		expect(!(await pendingPatrols()).length && !(await readCache(ids[1], 'tasks')), '不同账号不能读取前一账号任务与队列');
		let noTasksRejected = false;
		try { await loadTasks({ refresh: false }); } catch { noTasksRejected = true; }
		expect(noTasksRejected, '无离线任务缓存时明确要求联网下载');
		setSession(sessions[0]);
		globalThis.fetch = async () => response({ detail: '未分配该文物点' }, 403);
		await syncPatrols();
		expect((await pendingPatrols())[0].error === '未分配该文物点', '服务器拒绝后保留照片并显示具体失败原因');

		const sent = [];
		globalThis.fetch = async (_url, init) => {
			sent.push({ client: init.body.get('client_id'), count: init.body.getAll('photos').length, time: init.body.get('inspect_time') });
			throw new Error('模拟已接收后响应丢失');
		};
		await syncPatrols();
		expect((await pendingPatrols()).length === 1, '网络或响应丢失不会删除本机记录');
		globalThis.fetch = async (_url, init) => {
			sent.push({ client: init.body.get('client_id'), count: init.body.getAll('photos').length, time: init.body.get('inspect_time') });
			return response({ id: 7 }, 201);
		};
		const synced = await syncPatrols();
		expect(synced.uploaded === 1 && !(await pendingPatrols()).length, '仅服务器成功后才移除本机记录');
		expect(sent.every(item => item.client === row.client_id && item.count === 2 && item.time === row.inspect_time), '重试保留相同去重编号、全部照片与原始时间');

		let oversizeRejected = false;
		try { await enqueuePatrol({ site_id: 42 }, [new Blob([new Uint8Array(10 * 1024 * 1024 + 1)])]); }
		catch { oversizeRejected = true; }
		expect(oversizeRejected && !(await pendingPatrols()).length, '超过 10 MB 的照片拒绝入队');
		let countRejected = false;
		try { await enqueuePatrol({ site_id: 42 }, Array(21).fill(photos[0])); }
		catch { countRejected = true; }
		expect(countRejected, '超过 20 张照片拒绝入队');

		const boundary = await enqueuePatrol({ site_id: 42 }, Array(20).fill(photos[0]));
		expect((await pendingPatrols())[0].photos.length === 20, '允许恰好 20 张照片');
		await removePending(boundary.key);
		const originalPut = IDBObjectStore.prototype.put;
		let quotaRejected = false;
		try {
			IDBObjectStore.prototype.put = function(value) {
				if (this.name === 'pending') throw new DOMException('模拟存储空间不足', 'QuotaExceededError');
				return originalPut.call(this, value);
			};
			await enqueuePatrol({ site_id: 42 }, photos);
		} catch { quotaRejected = true; }
		finally { IDBObjectStore.prototype.put = originalPut; }
		expect(quotaRejected && !(await pendingPatrols()).length, '存储空间不足时明确失败且不生成成功记录');
		globalThis.fetch = async () => {
			setSession(sessions[1]);
			return response({ items: [{ id: 99 }] });
		};
		let switchRejected = false;
		try { await loadTasks(); } catch { switchRejected = true; }
		expect(switchRejected && !(await readCache(ids[1], 'tasks')), '请求期间切换账号时拒绝写入混用的任务缓存');
		setSession(sessions[0]);
		await enqueuePatrol({ site_id: 42 }, photos);
		clearSession();
		expect(!canUseOfflinePatrol(), '退出账号后不能直接离线解锁');
		setSession(sessions[0]);
		expect((await pendingPatrols()).length === 1, '退出后重新登录同一账号仍保留队列');
		return { passed: results.length, results };
	} finally {
		globalThis.fetch = originalFetch;
		for (const id of ids) {
			for (const row of await listPending(id)) await removePending(row.key);
			for (const type of ['tasks', 'draft', 'records']) await removeCache(id, type);
		}
		clearSession();
		for (const key of Object.keys(localStorage).filter(key => key.startsWith('heritage_app_'))) localStorage.removeItem(key);
		for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
	}
}
