package top.beichenhome.heritage;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Raw GPS-provider location (with altitude) and barometer access, replacing the
 * plus.android LocationManager / SensorManager code of the legacy uni-app build.
 */
@CapacitorPlugin(name = "NativeSensors")
public class NativeSensorsPlugin extends Plugin {

    private static final long LAST_KNOWN_MAX_AGE_MS = 15_000;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @PluginMethod
    public void getGpsLocation(PluginCall call) {
        final int timeout = call.getInt("timeout", 15000);
        final boolean useLastKnown = call.getBoolean("useLastKnown", true);
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

        try {
            if (useLastKnown) {
                Location last = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                if (last != null && ageMs(last) <= LAST_KNOWN_MAX_AGE_MS) {
                    call.resolve(toJs(last));
                    return;
                }
            }
        } catch (SecurityException e) {
            call.reject("location permission denied", "PERMISSION_DENIED");
            return;
        }

        final AtomicBoolean done = new AtomicBoolean(false);
        final LocationListener[] holder = new LocationListener[1];
        final Runnable timeoutTask = () -> {
            if (done.compareAndSet(false, true)) {
                safeRemove(lm, holder[0]);
                call.reject("gps timeout", "TIMEOUT");
            }
        };

        holder[0] = new LocationListener() {
            @Override
            public void onLocationChanged(@NonNull Location location) {
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

    private static void safeRemove(LocationManager lm, LocationListener l) {
        try {
            if (l != null) lm.removeUpdates(l);
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
