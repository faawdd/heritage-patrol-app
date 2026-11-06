package top.beichenhome.heritage;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.location.LocationListenerCompat;
import androidx.core.location.LocationManagerCompat;
import androidx.core.location.LocationRequestCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Raw GPS-provider location (with altitude) and barometer access, replacing the
 * plus.android LocationManager / SensorManager code of the legacy uni-app build.
 */
@CapacitorPlugin(name = "NativeSensors", permissions = {
    @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "location"),
    @Permission(strings = { Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "coarseLocation")
})
public class NativeSensorsPlugin extends Plugin {

    private static final long LAST_KNOWN_MAX_AGE_MS = 15_000;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void getGpsLocation(PluginCall call) {
        final int timeout = call.getInt("timeout", 15000);
        final boolean useLastKnown = call.getBoolean("useLastKnown", true);
        final boolean requireAltitude = call.getBoolean("requireAltitude", false);
        final Long newerThanTimestamp = call.getLong("newerThanTimestamp");
        final Context ctx = getContext();

        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("location permission denied", "PERMISSION_DENIED");
            return;
        }

        final LocationManager lm = (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) {
            call.reject("location service unavailable", "UNAVAILABLE");
            return;
        }
        if (!lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            call.reject("gps provider disabled", "PROVIDER_DISABLED");
            return;
        }

        final Location[] bestLocation = new Location[1];
        try {
            if (useLastKnown) {
                Location last = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                if (last != null && ageMs(last) <= LAST_KNOWN_MAX_AGE_MS
                        && (newerThanTimestamp == null || last.getTime() > newerThanTimestamp)) {
                    if (!requireAltitude || last.hasAltitude()) {
                        call.resolve(toJs(last));
                        return;
                    }
                    bestLocation[0] = last;
                }
            }
        } catch (SecurityException e) {
            call.reject("location permission denied", "PERMISSION_DENIED");
            return;
        }

        final AtomicBoolean done = new AtomicBoolean(false);
        final LocationListenerCompat[] holder = new LocationListenerCompat[1];
        final Runnable timeoutTask = () -> {
            if (done.compareAndSet(false, true)) {
                safeRemove(lm, holder[0]);
                if (bestLocation[0] != null) call.resolve(toJs(bestLocation[0]));
                else call.reject("gps timeout", "TIMEOUT");
            }
        };

        holder[0] = new LocationListenerCompat() {
            @Override
            public void onLocationChanged(@NonNull Location location) {
                if (newerThanTimestamp != null && location.getTime() <= newerThanTimestamp) return;
                bestLocation[0] = location;
                if (requireAltitude && !location.hasAltitude()) return;
                if (done.compareAndSet(false, true)) {
                    mainHandler.removeCallbacks(timeoutTask);
                    safeRemove(lm, this);
                    call.resolve(toJs(location));
                }
            }

            @Override
            public void onProviderDisabled(@NonNull String provider) {
                if (done.compareAndSet(false, true)) {
                    mainHandler.removeCallbacks(timeoutTask);
                    safeRemove(lm, this);
                    call.reject("gps provider disabled", "PROVIDER_DISABLED");
                }
            }

            @Override
            public void onProviderEnabled(@NonNull String provider) {}

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {}
        };

        try {
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0L, 0f, holder[0], Looper.getMainLooper());
            mainHandler.postDelayed(timeoutTask, timeout);
        } catch (SecurityException e) {
            done.set(true);
            call.reject("location permission denied", "PERMISSION_DENIED");
        } catch (Exception e) {
            done.set(true);
            call.reject("gps error: " + e.getMessage(), "ERROR");
        }
    }

    /**
     * 多提供者定位：同时监听 GPS 与系统网络定位（国产 ROM 自带基站/WiFi 定位，不依赖 Google 服务），
     * 并利用各提供者的缓存位置。拿到满足精度的位置立即返回；否则在首个位置后最多再等待 settleMs 取最优值；
     * 超时仍无新位置时返回不超过 staleMaxAge 的旧缓存（stale=true）。
     */
    @PluginMethod
    public void getLocation(final PluginCall call) {
        final int timeout = call.getInt("timeout", 60000);
        final int maximumAge = call.getInt("maximumAge", 30000);
        final int staleMaxAge = call.getInt("staleMaxAge", 30 * 60 * 1000);
        final int settleMs = call.getInt("settleMs", 3000);
        final double desiredAccuracy = call.getDouble("desiredAccuracy", 50.0);
        final Context ctx = getContext();

        boolean fine = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        boolean coarse = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        if (!fine && !coarse) {
            call.reject("location permission denied", "PERMISSION_DENIED");
            return;
        }

        final LocationManager lm = (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) {
            call.reject("location service unavailable", "UNAVAILABLE");
            return;
        }
        if (!LocationManagerCompat.isLocationEnabled(lm)) {
            call.reject("location services disabled", "LOCATION_DISABLED");
            return;
        }

        final List<String> providers = new ArrayList<>();
        try {
            for (String p : lm.getProviders(true)) {
                providers.add(p);
            }
        } catch (SecurityException e) {
            call.reject("location permission denied", "PERMISSION_DENIED");
            return;
        }

        Location cached = bestLastKnown(lm);
        if (cached != null && ageMs(cached) <= maximumAge
                && (!cached.hasAccuracy() || cached.getAccuracy() <= Math.max(desiredAccuracy, 200))) {
            call.resolve(toLocationJs(cached, true, false));
            return;
        }
        if (providers.isEmpty()) {
            if (cached != null && ageMs(cached) <= staleMaxAge) {
                call.resolve(toLocationJs(cached, true, true));
            } else {
                call.reject("no location provider enabled", "LOCATION_DISABLED");
            }
            return;
        }

        final Location cachedLoc = cached;
        // 监听回调与计时都在主线程，注册也放到主线程，避免与回调竞争
        mainHandler.post(() -> requestFromProviders(call, lm, providers, cachedLoc, timeout, staleMaxAge, settleMs, desiredAccuracy));
    }

    private void requestFromProviders(final PluginCall call, final LocationManager lm, List<String> providers,
            Location cached, int timeout, final int staleMaxAge, final int settleMs, final double desiredAccuracy) {
        final AtomicBoolean done = new AtomicBoolean(false);
        final Location[] best = new Location[1];
        final List<LocationListenerCompat> listeners = new ArrayList<>();
        final List<String> activeProviders = new ArrayList<>();
        final Runnable[] finishRef = new Runnable[1];

        final Runnable finish = () -> {
            if (!done.compareAndSet(false, true)) return;
            mainHandler.removeCallbacks(finishRef[0]);
            for (LocationListenerCompat l : listeners) safeRemove(lm, l);
            if (best[0] != null) {
                call.resolve(toLocationJs(best[0], false, false));
                return;
            }
            Location fallback = bestLastKnown(lm);
            if (fallback != null && ageMs(fallback) <= staleMaxAge) {
                call.resolve(toLocationJs(fallback, true, true));
            } else {
                String detail = "location timeout; active providers=" + activeProviders;
                Log.w("NativeSensors", detail);
                call.reject(detail, "TIMEOUT");
            }
        };
        finishRef[0] = finish;

        for (String provider : providers) {
            if (done.get()) break;
            LocationListenerCompat listener = new LocationListenerCompat() {
                @Override
                public void onLocationChanged(@NonNull Location location) {
                    if (done.get()) return;
                    boolean firstFix = best[0] == null;
                    if (isBetter(location, best[0])) best[0] = location;
                    if (best[0].hasAccuracy() && best[0].getAccuracy() <= desiredAccuracy) {
                        finish.run();
                    } else if (firstFix) {
                        mainHandler.postDelayed(finish, settleMs);
                    }
                }

                @Override
                public void onProviderDisabled(@NonNull String p) {}

                @Override
                public void onProviderEnabled(@NonNull String p) {}

                @Override
                public void onStatusChanged(String p, int status, Bundle extras) {}
            };
            try {
                LocationRequestCompat request = new LocationRequestCompat.Builder(1000L)
                        .setQuality(LocationRequestCompat.QUALITY_HIGH_ACCURACY)
                        .setMinUpdateIntervalMillis(0L)
                        .setMinUpdateDistanceMeters(0f)
                        .build();
                // 先记录监听器：缓存回调可能在注册时立即完成定位，需要一起清理。
                listeners.add(listener);
                LocationManagerCompat.requestLocationUpdates(lm, provider, request, listener, Looper.getMainLooper());
                activeProviders.add(provider);
                if (done.get()) safeRemove(lm, listener);
            } catch (SecurityException | IllegalArgumentException e) {
                listeners.remove(listener);
                safeRemove(lm, listener);
                Log.w("NativeSensors", "Cannot request location from " + provider, e);
            }
        }
        if (done.get()) return;
        if (listeners.isEmpty()) {
            done.set(true);
            if (cached != null && ageMs(cached) <= staleMaxAge) {
                call.resolve(toLocationJs(cached, true, true));
            } else {
                call.reject("no usable location provider; enabled providers=" + providers, "UNAVAILABLE");
            }
            return;
        }
        mainHandler.postDelayed(finish, timeout);
    }

    private static Location bestLastKnown(LocationManager lm) {
        Location best = null;
        try {
            for (String p : lm.getAllProviders()) {
                Location loc;
                try {
                    loc = lm.getLastKnownLocation(p);
                } catch (SecurityException | IllegalArgumentException e) {
                    continue;
                }
                if (loc == null) continue;
                if (best == null || loc.getElapsedRealtimeNanos() > best.getElapsedRealtimeNanos()) {
                    best = loc;
                }
            }
        } catch (Exception ignored) {}
        return best;
    }

    private static boolean isBetter(Location candidate, Location current) {
        if (current == null) return true;
        float ca = candidate.hasAccuracy() ? candidate.getAccuracy() : Float.MAX_VALUE;
        float cu = current.hasAccuracy() ? current.getAccuracy() : Float.MAX_VALUE;
        return ca <= cu;
    }

    private static JSObject toLocationJs(Location loc, boolean cached, boolean stale) {
        JSObject ret = toJs(loc);
        ret.put("altitudeAccuracy", loc.hasVerticalAccuracy() ? (double) loc.getVerticalAccuracyMeters() : JSObject.NULL);
        ret.put("speed", loc.hasSpeed() ? (double) loc.getSpeed() : JSObject.NULL);
        ret.put("provider", loc.getProvider());
        ret.put("cached", cached);
        ret.put("stale", stale);
        return ret;
    }

    @PluginMethod
    public void getPressure(PluginCall call) {
        final int timeout = call.getInt("timeout", 3000);
        final SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        final Sensor sensor = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_PRESSURE);
        if (sensor == null) {
            JSObject ret = new JSObject();
            ret.put("pressure", JSObject.NULL);
            ret.put("available", false);
            call.resolve(ret);
            return;
        }

        final AtomicBoolean done = new AtomicBoolean(false);
        final SensorEventListener[] holder = new SensorEventListener[1];
        final Runnable timeoutTask = () -> {
            if (done.compareAndSet(false, true)) {
                sm.unregisterListener(holder[0]);
                JSObject ret = new JSObject();
                ret.put("pressure", JSObject.NULL);
                ret.put("available", true);
                call.resolve(ret);
            }
        };
        holder[0] = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                if (event.values == null || event.values.length == 0 || event.values[0] <= 0) return;
                if (done.compareAndSet(false, true)) {
                    mainHandler.removeCallbacks(timeoutTask);
                    sm.unregisterListener(this);
                    JSObject ret = new JSObject();
                    ret.put("pressure", (double) event.values[0]);
                    ret.put("available", true);
                    call.resolve(ret);
                }
            }

            @Override
            public void onAccuracyChanged(Sensor s, int accuracy) {}
        };
        sm.registerListener(holder[0], sensor, SensorManager.SENSOR_DELAY_NORMAL, mainHandler);
        mainHandler.postDelayed(timeoutTask, timeout);
    }

    private static long ageMs(Location loc) {
        return (SystemClock.elapsedRealtimeNanos() - loc.getElapsedRealtimeNanos()) / 1_000_000L;
    }

    private static void safeRemove(LocationManager lm, LocationListenerCompat l) {
        try {
            if (l != null) LocationManagerCompat.removeUpdates(lm, l);
        } catch (Exception ignored) {}
    }

    private static JSObject toJs(Location loc) {
        JSObject ret = new JSObject();
        ret.put("longitude", loc.getLongitude());
        ret.put("latitude", loc.getLatitude());
        ret.put("altitude", loc.hasAltitude() ? loc.getAltitude() : JSObject.NULL);
        ret.put("accuracy", loc.hasAccuracy() ? (double) loc.getAccuracy() : JSObject.NULL);
        ret.put("timestamp", loc.getTime());
        return ret;
    }
}
