package top.beichenhome.heritage;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 应用内更新：流式下载 APK（带进度与 SHA-256 校验）并调起系统安装器。
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final String UPDATE_DIR = "updates";
    private static final long PROGRESS_INTERVAL_MS = 200;

    private final AtomicBoolean downloading = new AtomicBoolean(false);
    private final AtomicBoolean cancelled = new AtomicBoolean(false);

    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        final String fileName = call.getString("fileName", "update.apk");
        final String expectedSha = call.getString("sha256", "");
        if (url == null || url.isEmpty()) {
            call.reject("missing url", "INVALID");
            return;
        }
        if (fileName.contains("/") || fileName.contains("\\") || !fileName.toLowerCase(Locale.ROOT).endsWith(".apk")) {
            call.reject("invalid file name", "INVALID");
            return;
        }
        if (!downloading.compareAndSet(false, true)) {
            call.reject("download in progress", "BUSY");
            return;
        }
        cancelled.set(false);

        new Thread(() -> {
            File dir = new File(getContext().getCacheDir(), UPDATE_DIR);
            File target = new File(dir, fileName);
            File temp = new File(dir, fileName + ".part");
            HttpURLConnection conn = null;
            try {
                if (!dir.exists() && !dir.mkdirs()) {
                    throw new Exception("无法创建下载目录");
                }
                cleanup(dir, fileName);

                if (target.exists() && !expectedSha.isEmpty() && expectedSha.equalsIgnoreCase(sha256Of(target))) {
                    resolvePath(call, target);
                    return;
                }

                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setInstanceFollowRedirects(true);
                int code = conn.getResponseCode();
                if (code != HttpURLConnection.HTTP_OK) {
                    throw new Exception("下载失败（HTTP " + code + "）");
                }
                long total = conn.getContentLengthLong();
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                long loaded = 0;
                long lastEmit = 0;
                try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(temp)) {
                    byte[] buffer = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buffer)) != -1) {
                        if (cancelled.get()) {
                            throw new InterruptedException("cancelled");
                        }
                        out.write(buffer, 0, n);
                        digest.update(buffer, 0, n);
                        loaded += n;
                        long now = System.currentTimeMillis();
                        if (now - lastEmit >= PROGRESS_INTERVAL_MS) {
                            lastEmit = now;
                            emitProgress(loaded, total);
                        }
                    }
                }
                emitProgress(loaded, total);

                if (total > 0 && loaded != total) {
                    throw new Exception("下载不完整，请重试");
                }
                String actualSha = toHex(digest.digest());
                if (!expectedSha.isEmpty() && !expectedSha.equalsIgnoreCase(actualSha)) {
                    throw new Exception("安装包校验失败，请重试");
                }
                if (target.exists() && !target.delete()) {
                    throw new Exception("无法覆盖旧安装包");
                }
                if (!temp.renameTo(target)) {
                    throw new Exception("保存安装包失败");
                }
                resolvePath(call, target);
            } catch (InterruptedException e) {
                temp.delete();
                call.reject("已取消下载", "CANCELLED");
            } catch (Exception e) {
                temp.delete();
                String message = e.getMessage() != null ? e.getMessage() : "下载失败";
                call.reject(message, "DOWNLOAD_FAILED", e);
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
                downloading.set(false);
            }
        }, "AppUpdateDownload").start();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        cancelled.set(true);
        call.resolve();
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject result = new JSObject();
        result.put("allowed", getContext().getPackageManager().canRequestPackageInstalls());
        call.resolve(result);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        Context ctx = getContext();
        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + ctx.getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        Context ctx = getContext();
        File dir = new File(ctx.getCacheDir(), UPDATE_DIR);
        File file = path == null ? null : new File(path);
        if (file == null || !file.exists() || !dir.equals(file.getParentFile())) {
            call.reject("安装包不存在，请重新下载", "NOT_FOUND");
            return;
        }
        if (!ctx.getPackageManager().canRequestPackageInstalls()) {
            call.reject("需要允许安装未知应用", "INSTALL_PERMISSION");
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", file);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("无法打开安装程序", "INSTALL_FAILED", e);
        }
    }

    private void resolvePath(PluginCall call, File file) {
        JSObject result = new JSObject();
        result.put("path", file.getAbsolutePath());
        call.resolve(result);
    }

    private void emitProgress(long loaded, long total) {
        JSObject data = new JSObject();
        data.put("loaded", loaded);
        data.put("total", total);
        data.put("percent", total > 0 ? Math.min(100, (int) (loaded * 100 / total)) : -1);
        notifyListeners("progress", data);
    }

    // 仅保留当前目标版本，删除旧安装包和残留的临时文件。
    private static void cleanup(File dir, String keepName) {
        File[] files = dir.listFiles();
        if (files == null) {
            return;
        }
        for (File f : files) {
            if (!f.getName().equals(keepName)) {
                f.delete();
            }
        }
    }

    private static String sha256Of(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new java.io.FileInputStream(file)) {
            byte[] buffer = new byte[64 * 1024];
            int n;
            while ((n = in.read(buffer)) != -1) {
                digest.update(buffer, 0, n);
            }
        }
        return toHex(digest.digest());
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format(Locale.ROOT, "%02x", b));
        }
        return sb.toString();
    }
}
