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

现场采集需要开启系统定位并授予精确定位权限。可在「我的 → 软件设置」选择 GPS、气压计或两者，配置 2、3 或 5 组采样及平均值或中位数处理；默认三组、两种来源及平均值。每种来源先单独处理多组样本，再对可用来源等权平均。采样不足或传感器不可用时会显示有效次数，全部无海拔时清空旧海拔并提示手动填写。GPS 定位更新可能超时，建议在开阔区域采集，采样期间停留在同一位置；气压计不可用时不会虚构读数。

气压海拔根据设置中的当地海平面参考气压推算，默认 1013.25 hPa，应尽量填写当地最新值。气压受天气影响，GPS 与气压海拔的基准也可能不同，其平均值只是估算，不能替代经过校准的测绘高程。设置保存在本机；仅气压计模式也需要 GPS 获取现场坐标。

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
