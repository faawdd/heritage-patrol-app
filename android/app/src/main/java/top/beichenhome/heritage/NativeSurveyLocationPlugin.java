package top.beichenhome.heritage;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.database.sqlite.SQLiteException;
import android.location.Location;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;

import androidx.lifecycle.Lifecycle;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@CapacitorPlugin(name = "NativeSurveyLocation", permissions = {
    @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "location"),
    @Permission(strings = { Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "coarseLocation"),
    @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
})
public final class NativeSurveyLocationPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Map<String, Watch> watches = new LinkedHashMap<>();
    private boolean destroyed;

    @Override public Map<String, PermissionState> getPermissionStates() {
        Map<String, PermissionState> states = new LinkedHashMap<>(super.getPermissionStates());
        // Keep Capacitor's inherited check/request handlers and callbacks. Before API 33
        // no notification runtime grant exists; app/channel switches are checked at start.
        if (Build.VERSION.SDK_INT < 33) states.put("notifications", PermissionState.GRANTED);
        return states;
    }

    private final class Watch implements SurveyLocation.Sink {
        final String id = UUID.randomUUID().toString();
        final PluginCall call;
        final SurveyLocation updates;
        Watch(PluginCall call, long intervalMs) {
            this.call = call;
            updates = new SurveyLocation(getContext(), intervalMs, this);
        }
        @Override public void position(Location location) {
            JSObject result = new JSObject();
            result.put("id", id);
            result.put("position", SurveyLocation.position(location));
            call.resolve(result);
        }
        @Override public void error(String code, String message) {
            JSObject result = new JSObject();
            result.put("id", id);
            result.put("error", SurveyLocation.error(code, message));
            call.setKeepAlive(false);
            call.resolve(result);
            removeWatch(id);
        }
    }

    private boolean visible() {
        return !destroyed && getActivity() != null
            && getActivity().getLifecycle().getCurrentState().isAtLeast(Lifecycle.State.RESUMED);
    }

    private Long interval(PluginCall call) {
        Object value = call.getData().opt("intervalMs");
        return SurveyLocationPolicy.interval(value == JSONObject.NULL ? null : value);
    }

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void watchPosition(PluginCall call) {
        Long intervalMs = interval(call);
        call.setKeepAlive(true);
        main.post(() -> {
            Watch watch = new Watch(call, intervalMs == null ? 1_000 : intervalMs);
            watches.put(watch.id, watch);
            if (intervalMs == null) {
                watch.error("INVALID_ARGUMENT", "intervalMs must be an integer between 100 and 60000");
                return;
            }
            if (!visible()) {
                watch.error("FOREGROUND_REQUIRED", "Foreground watches require a visible Activity");
                return;
            }
            watch.updates.start();
            if (watches.containsKey(watch.id) && watch.updates.isRegistered()) {
                JSObject ack = new JSObject();
                ack.put("id", watch.id);
                call.resolve(ack);
            }
        });
    }

    @PluginMethod
    public void clearWatch(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("id is required", "INVALID_ARGUMENT");
            return;
        }
        main.post(() -> {
            if (removeWatch(id)) call.resolve();
            else call.reject("The platform refused GPS listener removal", "LOCATION_CLEANUP_FAILED");
        });
    }

    private boolean removeWatch(String id) {
        Watch watch = watches.remove(id);
        if (watch == null) return true;
        boolean removed = watch.updates.stop();
        if (watch.call.isKeptAlive()) {
            // Also release Capacitor's JS-side callback, not just its native saved call.
            watch.call.setKeepAlive(false);
            JSObject closed = new JSObject();
            closed.put("id", id);
            watch.call.resolve(closed);
        }
        watch.call.release(getBridge());
        return removed;
    }

    @PluginMethod
    public void checkReady(PluginCall call) {
        main.post(() -> {
            JSObject result = new JSObject();
            result.put("enabled", SurveyLocation.gpsEnabled(getContext()));
            result.put("precise", SurveyLocation.precise(getContext()));
            result.put("foreground", visible());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        main.post(() -> {
            if (!visible()) {
                call.reject("Opening settings requires a visible Activity", "FOREGROUND_REQUIRED");
                return;
            }
            try {
                getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + getContext().getPackageName())));
                call.resolve();
            } catch (ActivityNotFoundException | SecurityException e) {
                Log.e(SurveyLocation.TAG, "App settings could not be opened", e);
                call.reject("App settings could not be opened: " + e.getMessage(), "SETTINGS_UNAVAILABLE", e);
            }
        });
    }

    @PluginMethod
    public void startBackgroundTrack(PluginCall call) {
        Long intervalMs = interval(call);
        if (intervalMs == null) {
            call.reject("intervalMs must be an integer between 100 and 60000", "INVALID_ARGUMENT");
            return;
        }
        main.post(() -> {
            if (!visible()) {
                call.reject("Start recording while the Activity is visible", "FOREGROUND_REQUIRED");
                return;
            }
            try {
                store();
                TrackForegroundService.start(getContext(), intervalMs, completion(call));
            } catch (SQLiteException e) {
                storageError(call, e);
            }
        });
    }

    @PluginMethod
    public void stopBackgroundTrack(PluginCall call) {
        main.post(() -> {
            try {
                // Initialize recovery before answering even when no service exists in this process.
                store();
                TrackForegroundService.stop(completion(call));
            } catch (SQLiteException e) {
                storageError(call, e);
            }
        });
    }

    private TrackForegroundService.Completion completion(PluginCall call) {
        return new TrackForegroundService.Completion() {
            @Override public void success(String id) {
                JSObject result = new JSObject();
                result.put("sessionId", id == null ? JSONObject.NULL : id);
                call.resolve(result);
            }
            @Override public void error(String code, String message) {
                call.reject(message, code);
            }
        };
    }

    @PluginMethod
    public void getBackgroundStatus(PluginCall call) {
        main.post(() -> {
            try {
                call.resolve(store().status());
            } catch (SQLiteException e) {
                storageError(call, e);
            }
        });
    }

    @PluginMethod
    public void listBackgroundTracks(PluginCall call) {
        main.post(() -> {
            try {
                JSObject result = new JSObject();
                result.put("tracks", store().list());
                call.resolve(result);
            } catch (SQLiteException e) {
                storageError(call, e);
            }
        });
    }

    @PluginMethod
    public void readBackgroundTrack(PluginCall call) {
        String id = sessionId(call);
        if (id == null) return;
        Object after = call.getData().opt("afterId");
        Object requestedLimit = call.getData().opt("limit");
        if (!validInteger(after, 0, 9_007_199_254_740_991L)
            || !validInteger(requestedLimit, 1, Integer.MAX_VALUE)) {
            call.reject("afterId must be nonnegative; limit must be a positive integer", "INVALID_ARGUMENT");
            return;
        }
        long afterId = after instanceof Number ? ((Number) after).longValue() : 0;
        int limit = requestedLimit instanceof Number ? Math.min(1000, ((Number) requestedLimit).intValue()) : 1000;
        main.post(() -> {
            try {
                JSObject result = store().read(id, afterId, limit);
                if (result == null) call.reject("Background track not found", "NOT_FOUND");
                else call.resolve(result);
            } catch (SQLiteException e) {
                storageError(call, e);
            } catch (JSONException e) {
                Log.e(SurveyLocation.TAG, "Stored GPS fix is corrupt", e);
                call.reject("Stored GPS fix is corrupt", "STORAGE_ERROR", e);
            }
        });
    }

    private static boolean validInteger(Object value, long min, long max) {
        if (value == null || value == JSONObject.NULL) return true;
        if (!(value instanceof Number)) return false;
        double number = ((Number) value).doubleValue();
        return Double.isFinite(number) && number == Math.rint(number) && number >= min && number <= max;
    }

    private String sessionId(PluginCall call) {
        String id = call.getString("sessionId");
        if (id == null || id.isEmpty()) {
            call.reject("sessionId is required", "INVALID_ARGUMENT");
            return null;
        }
        return id;
    }

    @PluginMethod
    public void deleteBackgroundTrack(PluginCall call) {
        String id = sessionId(call);
        if (id == null) return;
        main.post(() -> {
            try {
                SurveyTrackStore store = store();
                JSObject session = store.session(id);
                if (session == null) {
                    call.reject("Background track not found", "NOT_FOUND");
                } else if (session.optBoolean("active")) {
                    call.reject("Stop the recording before deleting it", "BUSY");
                } else {
                    store.delete(id);
                    call.resolve();
                }
            } catch (SQLiteException e) {
                storageError(call, e);
            }
        });
    }

    private void storageError(PluginCall call, SQLiteException e) {
        Log.e(SurveyLocation.TAG, "Track database operation failed", e);
        call.reject("Track database operation failed: " + e.getMessage(), "STORAGE_ERROR", e);
    }

    private SurveyTrackStore store() {
        SurveyTrackStore store = SurveyTrackStore.get(getContext());
        if (!TrackForegroundService.hasLiveRecording()) {
            // Reconcile an orphan after a same-process service/closure failure as well.
            // A write failure here is surfaced instead of falsely reporting an active session.
            store.interruptOpenSessions("No live foreground recording service owns this session");
        }
        return store;
    }

    @Override protected void handleOnPause() {
        main.post(() -> {
            for (Watch watch : new ArrayList<>(watches.values())) {
                watch.error("FOREGROUND_REQUIRED", "Activity paused; use background recording for screen-off capture");
            }
        });
    }

    @Override protected void handleOnDestroy() {
        main.post(() -> {
            destroyed = true;
            for (String id : new ArrayList<>(watches.keySet())) removeWatch(id);
        });
    }
}
