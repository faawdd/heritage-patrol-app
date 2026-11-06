let database;

function openDatabase() {
	if (!database) {
		database = new Promise((resolve, reject) => {
			const request = indexedDB.open('heritage-patrol', 1);
			request.onupgradeneeded = () => {
				request.result.createObjectStore('cache', { keyPath: 'key' });
				request.result.createObjectStore('pending', { keyPath: 'key' });
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
			request.onblocked = () => reject(new Error('本地巡查存储被占用，请关闭其他页面后重试'));
		});
		database = database.catch(error => { database = null; throw error; });
	}
	return database;
}

async function transaction(storeName, mode, operation) {
	const db = await openDatabase();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(storeName, mode);
		let result;
		const request = operation(tx.objectStore(storeName));
		request.onsuccess = () => { result = request.result; };
		tx.oncomplete = () => resolve(result);
		tx.onerror = () => reject(tx.error || request.error);
		tx.onabort = () => reject(tx.error || new Error('本地巡查保存失败'));
	});
}

export function saveCache(userId, type, value) {
	return transaction('cache', 'readwrite', store => store.put({ key: `${userId}:${type}`, value, savedAt: new Date().toISOString() }));
}

export async function readCache(userId, type) {
	return (await transaction('cache', 'readonly', store => store.get(`${userId}:${type}`))) || null;
}

export function removeCache(userId, type) {
	return transaction('cache', 'readwrite', store => store.delete(`${userId}:${type}`));
}

export async function listPending(userId) {
	const rows = await transaction('pending', 'readonly', store => store.getAll());
	return rows.filter(row => row.userId === userId).sort((a, b) => a.inspect_time.localeCompare(b.inspect_time));
}

export function savePending(row) {
	return transaction('pending', 'readwrite', store => store.put(row));
}

export async function enqueuePending(row) {
	const db = await openDatabase();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(['pending', 'cache'], 'readwrite');
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error || new Error('本地巡查保存失败'));
		tx.onabort = () => reject(tx.error || new Error('本地巡查保存失败'));
		try {
			tx.objectStore('pending').put(row);
			tx.objectStore('cache').delete(`${row.userId}:draft`);
		} catch (error) {
			tx.abort();
			reject(error);
		}
	});
}

export function removePending(key) {
	return transaction('pending', 'readwrite', store => store.delete(key));
}
