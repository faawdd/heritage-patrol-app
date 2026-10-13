# 鄯善文保巡查（Heritage Patrol App）

鄯善县文物保护巡查移动端。巡查员用它做日常巡查打卡、拍照上报、查看巡查记录。管理员还可以用它管理文物点和项目，做现场采集（坐标、海拔、照片）和 KML 叠加检查。

本分支（`app2`）把原来基于 uni-app 的版本重写成了 **Capacitor + Ionic Vue** 应用。

## 技术栈

| 层 | 选型 |
| --- | --- |
| UI | [Ionic Vue 9](https://ionicframework.com/docs/vue/overview)（Material Design 模式）+ Vue 3.5 |
| 路由 | `@ionic/vue-router`（Vue Router 5） |
| 构建 | Vite 8 |
| 原生容器 | [Capacitor 8](https://capacitorjs.com/)（Android） |
| 原生能力 | Camera、Geolocation、Filesystem、File Opener、Haptics、Clipboard、Browser、Status Bar、Splash Screen、Screen Orientation、生物识别（`@aparajita/capacitor-biometric-auth`） |
| 自定义插件 | `NativeSensors`（Java）：直接读取 GPS 提供者（含海拔）和气压传感器 |

## 目录结构

```
src/
  main.js / App.vue        应用入口（Ionic、返回键、状态栏、竖屏锁定）
  router/                  路由与登录/管理员守卫
  views/                   页面（TabsPage 为底部标签栏）
  components/              公共组件（AppHeader、AppIcon、图片预览、手势锁、采集表单…）
  lib/                     服务层：request（API/鉴权/上传）、native（相机/定位/文件…）、
                           sensors（原生 GPS/气压）、ui（Toast/Loading/对话框）、nav、watermark…
  theme/                   Ionic 主题变量与全局设计系统
android/                   Capacitor Android 原生工程（含 NativeSensorsPlugin.java）
assets/icon.png            应用图标源文件（npm run assets 生成各分辨率图标与启动图）
scripts/sync-version.mjs   版本号同步脚本
.github/workflows/         CI 与按标签发布 APK
```

## 巡查分配与离线使用

- 管理端“文物管理 → 巡查管理”支持批量为看护员分配乡镇当前库内文物点或指定点列表，并设置等级/单点巡查周期。单点周期优先；看护员仅能上报已分配点。
- 手机管理员可通过“管理 → 工具 → 巡查管理”进入同一在线管理页面，复用现有短时登录桥接，不向看护员开放管理入口。
- 首次使用必须联网登录。在“任务”页确认清单已保存后即可断网巡查；首次离线启动若没有已登录账号或没有缓存任务，会提示联网准备。已开启手势/生物识别的账号仍需本地解锁；未开启快捷登录的账号可选择本机账号离线巡查，不缓存密码。
- 支持连续拍照或相册批量选择，最多 20 张，每张最多 10 MB，逐张添加巡查水印。提交时先将内容与照片 Blob 原子保存到 IndexedDB，保存失败不会提示成功。
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
