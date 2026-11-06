# 鄯善文保巡查（Heritage Patrol App）

鄯善县文物保护巡查移动端。巡查员用它做日常巡查打卡、拍照上报、查看巡查记录。管理员还可以用它管理文物点和项目，做现场采集（坐标、海拔、照片）和 KML 叠加检查。

本分支（`app2`）把原来基于 uni-app 的版本重写成了 **Capacitor + Vant** 应用。Ionic 组件、路由、浮层与样式依赖已移除，Capacitor 原生能力保持不变。

## 技术栈

| 层 | 选型 |
| --- | --- |
| UI | [Vant 4](https://vant-ui.github.io/vant/) + Vue 3.5（组件自动引入） |
| 路由 | Vue Router 5 + KeepAlive（标签页缓存） |
| 构建 | Vite 8 |
| 原生容器 | [Capacitor 8](https://capacitorjs.com/)（Android） |
| 原生能力 | Camera、Geolocation、Filesystem、File Opener、Haptics、Clipboard、Browser、Status Bar、Splash Screen、Screen Orientation、生物识别（`@aparajita/capacitor-biometric-auth`） |
| 自定义插件 | `NativeSensors`（Java）：直接读取 GPS 提供者（含海拔）和气压传感器 |

## 目录结构

```
src/
  main.js / App.vue        应用入口（Vant、返回键、状态栏、竖屏锁定）
  router/                  路由与登录/管理员守卫
  views/                   页面（TabsPage 为底部标签栏）
  components/              公共组件（AppHeader、AppIcon、手势锁、采集表单…）
  lib/                     服务层：request（API/鉴权/上传）、native（相机/定位/文件…）、
                           sensors（原生 GPS/气压）、ui（Toast/Loading/对话框）、nav、watermark…
  theme/                   Vant 主题变量、页面布局与全局设计系统
android/                   Capacitor Android 原生工程（含 NativeSensorsPlugin.java）
assets/icon.png            应用图标源文件（npm run assets 生成各分辨率图标与启动图）
scripts/sync-version.mjs   版本号同步脚本
.github/workflows/         CI 与按标签发布 APK
```

## 巡查分配与离线使用

底部导航、按钮、账号输入、管理分类切换、下拉刷新、采集记录分页、Toast、Loading、Dialog、ActionSheet 与图片预览使用 Vant。手势密码绘制和专业坐标/采集表单保留现有交互与数据校验。标签页使用 `KeepAlive` 保留未提交巡查草稿，重新进入时刷新数据；Android 返回键先处理浮层，再后退页面，标签页根页面退到后台。

UI 与返回导航回归测试：`npm run test:ui`；原生定位回归测试：`npm run test:location`。

现场采集在“我的 → 软件设置”中配置 GPS、气压计或两者、采样组数及平均值或中位数。默认三组，分别计算两种来源后等权平均；单一来源不可用时使用可用结果并提示。需要开启精确定位并在采样期间停留在同一位置。气压海拔基于可配置的当地海平面气压（默认 1013.25 hPa）估算，受天气及高程基准影响，不能代替测绘高程。

- 管理端“文物管理 → 巡查管理”支持批量为看护员分配乡镇当前库内文物点或指定点列表，并设置等级/单点巡查周期。单点周期优先；看护员仅能上报已分配点。
- 手机管理员可通过“管理 → 工具 → 巡查管理”进入同一在线管理页面，复用现有短时登录桥接，不向看护员开放管理入口。
- 首次使用必须联网登录。在“任务”页确认清单已保存后即可断网巡查；首次离线启动若没有已登录账号或没有缓存任务，会提示联网准备。已开启手势/生物识别的账号仍需本地解锁；未开启快捷登录的账号可选择本机账号离线巡查，不缓存密码。
- 支持连续拍照或相册批量选择，最多 20 张，每张最多 10 MB，逐张添加巡查水印。提交时先将内容与照片 Blob 原子保存到 IndexedDB，保存失败不会提示成功。
- 巡查上报分为“确认文物点 → 拍摄照片 → 填写情况”三页，完成当前步骤后点击“下一步”，最后提交；可返回上一步修改，照片处理期间不可切换步骤。切换标签保留当前进度，有照片的本机草稿会保存步骤；提交成功后继续巡查从第一步开始。
- 待同步记录与任务缓存按账号 ID 隔离。恢复网络、App 回到前台以及前台每分钟会尝试同步；也可在“记录”页重试。服务器按账号与唯一提交编号去重，保留实际离线巡查时间。
- 被撤销分配、账号过期或服务器拒绝的记录不会丢弃，在记录页显示失败原因；需要联网重新登录或联系管理员处理。退出登录不会删除已保存队列，重新登录同一账号即可继续上传。
- 拍照添加后保存账号隔离的本机草稿，未提交时下次进入巡查页面可恢复照片和内容；草稿保存失败会明确提示。草稿不是待同步记录，需提交后才会上传。
- 离线清单可能不是最新分配，以恢复网络后服务器校验为准。请确认“已保存到本机”后离开。不要卸载 App 或清除应用数据，否则本机照片与记录将被删除。浏览器调试环境只保证页面资源已加载时的离线巡查，不提供网站资源的离线安装。
- 需要先部署配套服务端并执行数据库迁移，再发布手机端；发布 Android 前执行 `npm run sync`，将 Web 资源同步到原生工程。
- 离线回归测试：启动 `npm run dev`，在本地浏览器控制台执行 `(await import('/tests/patrol.browser.js')).runPatrolTests()`。测试使用合成账号、真实 IndexedDB 与模拟请求，结束后恢复登录存储并清理测试数据，不访问生产服务。

## Android 巡查定位

- Android 直接向系统申请位置权限并使用系统多提供者高精度定位，不依赖 Google 定位服务检查权限；默认最多等待 60 秒，收到满足精度的位置即返回。
- 巡查需要高精度位置时，已有“模糊位置”权限也会申请升级为“精确位置”；用户仍选择模糊位置时继续尝试系统粗略定位，不伪造 GPS 结果。
- 首次定位或长时间未使用后的 GPS 冷启动可能较慢。请开启手机“位置信息”，允许本应用“使用期间访问位置”，并开启“精确位置”；在室外开阔处保持 App 在前台等待。
- 定位失败不会再切换到 Google 低精度定位。权限拒绝、定位开关关闭、提供者不可用和超时分别提示；仍可手动选择文物点，但不会伪造坐标。
- 小米等手机上地图能定位不代表本应用已获精确位置权限。若仍超时，通过 `adb logcat -s NativeSensors` 查看实际启用的定位提供者和注册失败原因。
- 定位封装回归测试：`node --experimental-vm-modules --test tests/location.test.js`。原生请求仍需在真机验证；修改 Java 后必须重新构建 APK，仅更新 Web 资源不生效。

### 高精度打点与轨迹（TypeScript）

`src/lib/location/` 提供与 Vue/React 无关的服务类；`HighAccuracyCapture.vue` 已接入现场采集的单点坐标窗口，原有单次定位与 DEM 海拔路径保留。高精度按钮单独启用严格采样，不改变普通巡查的可用性。

采样质量元数据随组件 `v-model` 返回；现有服务端坐标列表规范化只保存坐标及来源/说明，不保存新增的 `survey` 质量字段。如果要在服务端进行长期精度审计，需另行扩展该接口，不能以当前 UI 元数据代替服务器审计记录。

```ts
import {
  HighAccuracyLocationService, TrackService, TrackFilter,
  locationSource, backgroundBackend, locationError,
} from './src/lib/location/index.ts';

const abort = new AbortController();
const sampler = new HighAccuracyLocationService(locationSource);
try {
  const point = await sampler.collect({
    sampleCount: 10,
    maxAccuracyMeters: 5,
    timeoutMs: 60000, // 每次采样尝试的上限，首次 GPS 搜星也计时
    retries: 1,       // 最多两次采样，每次重新收集10个样本
    average: 'weighted', // 1/accuracy²；也支持 'arithmetic'
    signal: abort.signal,
    onProgress: p => console.log(`第${p.attempt}次 ${p.accepted}/${p.target}`, p.reason),
  });
  // WGS84 经度、纬度、GPS海拔/垂直精度(null表示缺失)、最新样本时间戳、
  // bestAccuracyRadius、保守 accuracy、spreadMeters、sampleCount、rejectedCount。
  console.log(point);
} catch (error) {
  console.error(locationError(error).message);
}
// 页面离开/取消时 abort.abort()；不要继续使用已取消操作的结果。

const track = new TrackService(locationSource, backgroundBackend);
await track.start({
  onPoint: point => console.log(point.segment, point.longitude, point.latitude, point.raw),
  onRejected: reason => console.warn('噪点已剔除', reason),
  onError: error => console.error(error.message),
}, { maxAccuracyMeters: 20, maxSpeedMetersPerSecond: 8 });
await track.stop();

// 必须由可见页面上的用户操作启动；后台不靠 JS watchPosition 或定时器维持。
const sessionId = await track.startBackground({ intervalMs: 1000 });
await track.stopBackground(); // 通知栏“停止”按钮同样可停止
const filter = new TrackFilter();
let cursor = 0;
while (true) {
  const page = await track.readBackgroundPage(sessionId, cursor, filter, 500);
  if (page.error) console.error(locationError(page.error).message);
  // 按 segment 分段绘图，不能跨断点连直线；多页必须复用同一个 filter。
  console.log(page.points);
  if (page.cursor === cursor) break;
  cursor = page.cursor; // 即使整页都是噪点，也推进原始记录游标
}
// listBackgroundTracks()/backgroundStatus() 可在页面或进程重建后恢复会话。
// deleteBackgroundTrack(sessionId) 显式删除本机记录，不能删除正在采集的会话。
```

完整 Vue 3 权限、采样进度、错误提示、开始/停止、回到前台分页重放示例见 `src/examples/SurveyLocationExample.vue`。该示例未注册新路由，不会自动开启位置追踪。后台数据为设备级原始 GPS 会话，尚未关联账号/文物或自动上传服务器；接入多人账号业务前应定义会话归属和访问策略。

#### 精度边界与过滤规则

- **1–3 米只是良好条件下可能接近的目标，不是硬件保证。** 手机 `accuracy` 是系统估计的水平半径；多径、树木/峭壁遮挡、天线和系统偏差不一定能被平均消除。需在已知控制点重复测量真实误差，不能用增加小数位、最优样本或 `accuracy/√N` 宣称达到测绘精度。
- 打点默认保留 10 个不同时间戳的新样本（间隔至少 1 秒、报告精度 ≤5 米、有效期 3 秒），剔除过期/重复/乱序/模拟位置、无效数值、报告速度 >0.8 米/秒及偏离静止点超过 10 米的样本。手机速度缺失或偏低时不能保证检测到所有缓慢移动，仍需人工保持静止；连续 GPS 样本也可能存在统计相关性。不足 10 个即超时；重试次数有上限，不自动放宽阈值。
- 权限等待也有超时；取消和所有正常退出都会清理监听，原生注册迟到仍会清理。默认最多两次 60 秒采样，间隔 1.5 秒，权限等待单独最多 60 秒。采样中保持静止，否则移动平均不代表某个固定遗址点。
- 海拔独立采用垂直精度加权；缺少垂直精度时采用算术平均。GPS 海拔不等于经过大地水准面/DEM 校正的国家高程；海拔缺失返回 `null`，海拔 0 是合法值。坐标均为 WGS84，叠加高德/百度底图前须另外做 GCJ-02/BD-09 转换。
- 轨迹默认精度阈值 20 米（不是打点的 5 米），使用局部米制平面二维随机游走卡尔曼滤波。按报告误差和最大速度过滤跳变，超过 30 秒的定位缺口重新分段；`filterRadius` 只是模型内部估计，保留 `raw` 便于审计。车辆巡查应显式调整速度阈值。

#### Android 后台定位与前台服务

Manifest 已声明 `ACCESS_FINE_LOCATION`、`ACCESS_COARSE_LOCATION`、`ACCESS_BACKGROUND_LOCATION`、`FOREGROUND_SERVICE`、`FOREGROUND_SERVICE_LOCATION`、`POST_NOTIFICATIONS`，并注册不可被外部启动的 `foregroundServiceType="location"` 服务。

- Android 12+ 申请精确位置必须同时声明/申请粗略与精确位置；高精度模块不接受仅有模糊位置。Android 13+ 本实现明确要求通知权限，以展示可见的记录提示和停止入口。
- Android 14+ 启动位置前台服务受“使用期间”权限限制：**用户在 App 可见时启动的位置 FGS 可以在锁屏后继续运行，不需要自动申请“始终允许”。** Manifest 的后台权限声明不是运行时授权，也不意味着可以任意从后台启动服务。本实现不从后台偷偷启动，也不自动请求 `ACCESS_BACKGROUND_LOCATION`；如果未来确需后台启动，必须按 Android 10/11+ 规则独立申请并说明用途、满足 FGS 启动豁免及应用市场政策。
- 原生 GPS 连续采样和 SQLite 保存不依赖 WebView 回调。停止、GPS 关闭、权限撤销、存储错误和长时间无新坐标会明确结束或报告；被系统终止的会话标记中断，不悄悄恢复或伪造遗漏轨迹。原始噪点同样落盘，返回界面后再按统一策略重放过滤。
- 小米/其他 OEM 的省电策略仍可能结束服务，应允许应用后台运行并做锁屏/省电实测；用户“强行停止”、重启和卸载不能保证连续记录。不存在“加权限即可保证后台不死”的方案。
- 轨迹保存在 App 私有 SQLite 中，不发送到第三方；用户应在结束巡查后停止服务以降低耗电。卸载/清除数据会丢失记录。需重新打包 APK 才能包含新的原生插件和服务。

验证命令：`npm run typecheck:location`、`npm run test:location`、`npm run sync`，Android 使用 JDK 21 执行 `./gradlew assembleDebug`。CI 和 Release 构建在打包前运行类型检查和定位回归测试。算法测试含阈值、取消/重试/迟到监听清理、加权平均、跨日期变更线、静态偏差、步行噪声误差降低和后台分页重放；这些模拟结果不代替真机定位精度与锁屏续航验证。

组件 UI 回归：启动 `npm run dev` 后访问 `/tests/survey.browser.html`，使用合成位置流检查坐标回填、采样进度、海拔 0、精度元数据保留、监听清理和手动编辑撤销旧精度标记，不登录或访问生产 API。

## 开发

需要 Node.js ≥ 22；构建 Android 还需要 JDK 21 和 Android SDK（推荐用 Android Studio）。

```bash
npm install
npm run dev            # 浏览器调试，/app-api 已代理到 https://beichenhome.top:9081
npm run build          # 构建 Web 资源到 dist/
npm run sync           # 构建并同步到 Android 工程
npm run android        # 用 Android Studio 打开原生工程
npm run assets         # 根据 assets/icon.png 重新生成图标与启动图
```

接口地址默认是 `https://beichenhome.top:9081/app-api`，可以用环境变量 `VITE_API_BASE_URL` 覆盖（见 `src/lib/config.js`）。

### 本地打正式包

在 `android/keystore.properties` 中写入签名信息（该文件已被 gitignore）：

```properties
storeFile=/绝对路径/release.keystore
storePassword=******
keyAlias=heritage
keyPassword=******
```

然后执行：

```bash
npm run sync
cd android && ./gradlew assembleRelease
# 产物：android/app/build/outputs/apk/release/app-release.apk
```

## 发布（GitHub Actions 自动打包）

推送 `vX.Y.Z` 格式的标签后，[`release.yml`](.github/workflows/release.yml) 会自动完成以下步骤：

1. 从标签解析版本号：`versionName = X.Y.Z`，`versionCode = X*10000 + Y*100 + Z`。
2. 构建 Web 资源，再执行 `cap sync android`。
3. 用仓库 Secrets 中的签名证书编译 **已签名的 release APK**，并用 apksigner 校验。
4. 创建 GitHub Release，上传 `heritage-patrol-vX.Y.Z.apk` 和 SHA-256 校验文件。

```bash
npm version 1.2.0 --no-git-tag-version   # 可选：同步 package.json 版本
git commit -am "release: v1.2.0"
git tag v1.2.0
git push origin app2 --tags
```

带后缀的标签（如 `v1.2.0-beta.1`）会发布为 Pre-release。

需要在仓库 **Settings → Secrets and variables → Actions** 中配置以下 Secrets：

| Secret | 说明 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | 签名证书文件的 base64（`base64 -i release.keystore`） |
| `ANDROID_KEYSTORE_PASSWORD` | 证书库密码 |
| `ANDROID_KEY_ALIAS` | 密钥别名 |
| `ANDROID_KEY_PASSWORD` | 密钥密码 |

> ⚠️ 请妥善备份签名证书。证书一旦丢失，已安装的应用将无法覆盖升级。

每次向 `app2` 推送或提交 PR 时，[`ci.yml`](.github/workflows/ci.yml) 会构建一个 debug APK，作为 Artifact 保存 7 天。

## 许可证

[Apache License 2.0](LICENSE)
