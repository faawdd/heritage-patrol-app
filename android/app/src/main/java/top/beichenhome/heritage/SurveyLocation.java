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
    private final Runnable healthCheck = new Runnable() {
        @Override public void run() {
            if (!registered) return;
            String problem = readinessError(context);
            if (problem != null) {
                fail(problem, readinessMessage(problem));
            } else if (SystemClock.elapsedRealtime() - lastArrivalMs >= timeoutMs(intervalMs)) {
                fail("NO_SIGNAL", "No fresh GPS fix within " + timeoutMs(intervalMs) + " ms");
            } else {
                main.postDelayed(this, 5_000);
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
        try {
            LocationRequestCompat request = new LocationRequestCompat.Builder(intervalMs)
                .setQuality(LocationRequestCompat.QUALITY_HIGH_ACCURACY)
                .setMinUpdateIntervalMillis(intervalMs)
                .setMinUpdateDistanceMeters(0)
                .setMaxUpdateDelayMillis(0)
                .build();
            LocationManagerCompat.requestLocationUpdates(
                manager, LocationManager.GPS_PROVIDER, request, this, Looper.getMainLooper());
            main.postDelayed(healthCheck, 5_000);
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
        // Reject cached, duplicate, out-of-order and delayed fixes, regardless of wall-clock changes.
        if (!SurveyLocationPolicy.fresh(fix, registeredAtNanos, lastFixNanos, now)) return;
        lastFixNanos = fix;
        lastArrivalMs = SystemClock.elapsedRealtime();
        sink.position(new Location(location));
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
