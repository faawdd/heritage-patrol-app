// 用法：node scripts/sync-version.mjs [版本号]
// 不传参数时使用 package.json 的 version；传入 v1.2.3 / 1.2.3 时写回 package.json。
// Android 的 versionName / versionCode 由 android/app/build.gradle 在构建时从 package.json（或 -P 参数）读取。
import { readFileSync, writeFileSync } from 'node:fs';

const pkgPath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const input = process.argv[2];

if (input) {
	const version = input.replace(/^v/, '');
	if (!/^\d+\.\d+\.\d+([-+].*)?$/.test(version)) {
		console.error(`无效版本号: ${input}（应为 X.Y.Z）`);
		process.exit(1);
	}
	pkg.version = version;
	writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

const [major, minor, patch] = pkg.version.replace(/[-+].*$/, '').split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;
console.log(`versionName=${pkg.version}`);
console.log(`versionCode=${versionCode}`);
