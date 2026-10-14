package top.beichenhome.heritage;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import androidx.core.content.ContextCompat;
import androidx.core.location.LocationListenerCompat;
import androidx.core.location.LocationManagerCompat;
import androidx.core.location.LocationRequestCompat;

import com.getcapacitor.JSObject;

import org.json.JSONObject;

/** GPS-only, unbatched updates. All listener operations run on the main looper. */
final class SurveyLocation implements LocationListenerCompat {
    static final String TAG = "NativeSurveyLocation";
    
    // 增加启动宽限期，让GPS有足够时间冷启动
    private static final long STARTUP_GRACE_PERIOD_MS = 30_000; // 30秒启动宽限期
    // 允许的最大定位点年龄（纳秒），用于启动阶段宽松检查
    private static final long MAX_FIX_AGE_NANOS = 60_000_000_000L; // 60秒

    interface Sink {
        void position(Location location);
        void error(String code, String message);
    }

    private final Context context;
    private final LocationManager manager;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Sink sink;
    private final long intervalMs;
    private boolean registered;
    private long registeredAtNanos;
    private long lastFixNanos;
    private long lastArrivalMs;
    private boolean hasReceivedFirstFix = false; // 标记是否收到过第一个定位点
    private final Runnable healthCheck = new Runnable() {
        @Override public void run() {
            if (!registered) return;
            String problem = readinessError(context);
            if (problem != null) {
                fail(problem, readinessMessage(problem));
            } else {
                long elapsed = SystemClock.elapsedRealtime() - lastArrivalMs;
                long timeout = timeoutMs(intervalMs);
                // 在启动宽限期内，不检查超时；宽限期后，只在收到过定位点后才检查超时
                if (hasReceivedFirstFix && elapsed >= timeout) {
                    fail("NO_SIGNAL", "No fresh GPS fix within " + timeout + " ms");
                } else {
                    main.postDelayed(this, 5_000);
                }
            }
        }
    };

    SurveyLocation(Context context, long intervalMs, Sink sink) {
        this.context = context.getApplicationContext();
        this.manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        this.intervalMs = intervalMs;
        this.sink = sink;
    }

    static long timeoutMs(long intervalMs) {
        return SurveyLocationPolicy.timeoutMs(intervalMs);
    }

    static boolean precise(Context context) {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    }

    static boolean gpsEnabled(Context context) {
        LocationManager manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        return manager != null && manager.isProviderEnabled(LocationManager.GPS_PROVIDER);
    }

    static String readinessError(Context context) {
        if (!precise(context)) return "PERMISSION_DENIED";
        if (!gpsEnabled(context)) return "PROVIDER_DISABLED";
        return null;
    }

    static String readinessMessage(String code) {
        return "PERMISSION_DENIED".equals(code)
            ? "Precise location permission is required"
            : "The GPS provider is disabled or unavailable";
    }

    void start() {
        requireMainThread();
        String problem = readinessError(context);
        if (problem != null) {
            sink.error(problem, readinessMessage(problem));
            return;
        }
        registeredAtNanos = SystemClock.elapsedRealtimeNanos();
        lastArrivalMs = SystemClock.elapsedRealtime();
        registered = true;
        hasReceivedFirstFix = false; // 重置标记
        try {
            // 修改 LocationRequest 配置，增加兼容性
            LocationRequestCompat request = new LocationRequestCompat.Builder(intervalMs)
                .setQuality(LocationRequestCompat.QUALITY_HIGH_ACCURACY)
                .setMinUpdateIntervalMillis(intervalMs / 2) // 允许更频繁的更新
                .setMinUpdateDistanceMeters(0)
                .setMaxUpdateDelayMillis(intervalMs * 2) // 放宽最大延迟，避免某些设备收不到更新
                .build();
            LocationManagerCompat.requestLocationUpdates(
                manager, LocationManager.GPS_PROVIDER, request, this, Looper.getMainLooper());
            // 延长首次健康检查时间，给GPS冷启动留时间
            main.postDelayed(healthCheck, STARTUP_GRACE_PERIOD_MS);
        } catch (SecurityException e) {
            fail("PERMISSION_DENIED", "GPS registration denied: " + e.getMessage());
        } catch (IllegalArgumentException | IllegalStateException e) {
            fail("LOCATION_UNAVAILABLE", "GPS registration failed: " + e.getMessage());
        }
    }

    boolean isRegistered() {
        return registered;
    }

    boolean stop() {
        requireMainThread();
        main.removeCallbacks(healthCheck);
        if (!registered) return true;
        registered = false;
        try {
            manager.removeUpdates(this);
            return true;
        } catch (SecurityException | IllegalArgumentException | IllegalStateException e) {
            // The flag prevents late callbacks even if the platform refuses removal.
            Log.e(TAG, "GPS listener removal failed", e);
            return false;
        }
    }

    private void fail(String code, String message) {
        stop();
        Log.e(TAG, code + ": " + message);
        sink.error(code, message);
    }

    @Override public void onLocationChanged(Location location) {
        if (!registered || !LocationManager.GPS_PROVIDER.equals(location.getProvider())) return;
        String problem = readinessError(context);
        if (problem != null) {
            fail(problem, readinessMessage(problem));
            return;
        }
        long now = SystemClock.elapsedRealtimeNanos();
        long fix = location.getElapsedRealtimeNanos();
        // 放宽新鲜度检查，特别是在启动阶段
        if (!isFreshEnough(fix, registeredAtNanos, lastFixNanos, now, hasReceivedFirstFix)) {
            Log.d(TAG, "Rejected stale fix: fix=" + fix + ", registered=" + registeredAtNanos 
                + ", lastFix=" + lastFixNanos + ", now=" + now);
            return;
        }
        lastFixNanos = fix;
        lastArrivalMs = SystemClock.elapsedRealtime();
        hasReceivedFirstFix = true; // 标记已收到首个定位点
        sink.position(new Location(location));
    }
    
    /** 放宽的新鲜度检查：在启动阶段允许更旧的定位点 */
    private boolean isFreshEnough(long fix, long registered, long previous, long now, boolean hasFirstFix) {
        // 基本检查：定位时间不能晚于当前时间
        if (fix > now) return false;
        // 必须比上次更新
        if (fix <= previous) return false;
        // 在启动宽限期内，接受任何非重复的定位点（即使较旧）
        if (!hasFirstFix && SystemClock.elapsedRealtime() - registeredAtNanos / 1_000_000 <= STARTUP_GRACE_PERIOD_MS) {
            return fix >= registered - MAX_FIX_AGE_NANOS; // 允许注册前MAX_FIX_AGE_NANOS时间内的定位
        }
        // 正常检查：不能太旧 (例如 60 秒内)
        return now - fix <= MAX_FIX_AGE_NANOS;
    }

    @Override public void onProviderDisabled(String provider) {
        if (registered && LocationManager.GPS_PROVIDER.equals(provider)) {
            fail("PROVIDER_DISABLED", "The GPS provider was disabled");
        }
    }

    static JSObject position(Location location) {
        JSObject coords = new JSObject();
        coords.put("latitude", location.getLatitude());
        coords.put("longitude", location.getLongitude());
        coords.put("accuracy", (double) location.getAccuracy());
        coords.put("altitude", location.hasAltitude() ? location.getAltitude() : JSONObject.NULL);
        coords.put("altitudeAccuracy", location.hasVerticalAccuracy()
            ? (double) location.getVerticalAccuracyMeters() : JSONObject.NULL);
        coords.put("speed", location.hasSpeed() ? (double) location.getSpeed() : JSONObject.NULL);
        coords.put("heading", location.hasBearing() ? (double) location.getBearing() : JSONObject.NULL);
        JSObject position = new JSObject();
        position.put("timestamp", location.getTime());
        position.put("coords", coords);
        position.put("mocked", location.isFromMockProvider());
        return position;
    }

    static JSObject error(String code, String message) {
        JSObject error = new JSObject();
        error.put("code", code);
        error.put("message", message);
        return error;
    }

    static void requireMainThread() {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            throw new IllegalStateException("Location lifecycle must run on the main thread");
        }
    }
}
