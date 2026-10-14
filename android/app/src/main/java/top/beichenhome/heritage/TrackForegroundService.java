package top.beichenhome.heritage;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.database.sqlite.SQLiteException;
import android.location.Location;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** User-started location FGS. Never restarts or resumes a recording implicitly. */
public final class TrackForegroundService extends Service {
    private static final String ACTION_START = "top.beichenhome.heritage.survey.START";
    private static final String ACTION_STOP = "top.beichenhome.heritage.survey.STOP";
    private static final String CHANNEL = "survey_location";
    private static final int NOTIFICATION_ID = 7301;
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static TrackForegroundService running;
    private static StartRequest pending;

    interface Completion {
        void success(String sessionId);
        void error(String code, String message);
    }

    private static final class StartRequest {
        final String token = UUID.randomUUID().toString();
        final long intervalMs;
        final Completion completion;
        final Runnable timeout;
        StartRequest(long intervalMs, Completion completion) {
            this.intervalMs = intervalMs;
            this.completion = completion;
            timeout = () -> {
                if (pending != this) return;
                failPending("START_TIMEOUT", "Foreground location service initialization timed out");
                if (running != null) running.finish("START_TIMEOUT", "Service initialization timed out", null);
            };
        }
    }

    private SurveyTrackStore store;
    private SurveyLocation updates;
    private String sessionId;
    private boolean foreground;
    private boolean stopping;
    private StartRequest ownedStart;
    private String deferredErrorCode;
    private String deferredErrorMessage;
    private final List<Runnable> stoppedCompletions = new ArrayList<>();
    private final Runnable notificationCheck = new Runnable() {
        @Override public void run() {
            if (sessionId == null) return;
            String problem = startReadinessError(TrackForegroundService.this);
            if (problem != null) {
                finish(problem, startReadinessMessage(problem), null);
            } else {
                MAIN.postDelayed(this, 5_000);
            }
        }
    };

    static boolean hasLiveRecording() {
        SurveyLocation.requireMainThread();
        return pending != null || (running != null && !running.stopping && running.sessionId != null);
    }

    static String startReadinessError(Context context) {
        String problem = SurveyLocation.readinessError(context);
        if (problem != null) return problem;
        if (Build.VERSION.SDK_INT >= 33
            && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) return "NOTIFICATION_PERMISSION";
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || !manager.areNotificationsEnabled()) return "NOTIFICATION_PERMISSION";
        NotificationChannel channel = manager.getNotificationChannel(CHANNEL);
        if (channel != null && channel.getImportance() == NotificationManager.IMPORTANCE_NONE) {
            return "NOTIFICATION_PERMISSION";
        }
        return null;
    }

    static String startReadinessMessage(String code) {
        return "NOTIFICATION_PERMISSION".equals(code)
            ? "Enable app notifications and the Survey recording notification channel before recording"
            : SurveyLocation.readinessMessage(code);
    }

    static void start(Context context, long intervalMs, Completion completion) {
        SurveyLocation.requireMainThread();
        if (pending != null || (running != null && (running.sessionId != null || running.stopping))) {
            completion.error("BUSY", "A background recording is already starting, active or stopping");
            return;
        }
        String problem = startReadinessError(context);
        if (problem != null) {
            completion.error(problem, startReadinessMessage(problem));
            return;
        }
        pending = new StartRequest(intervalMs, completion);
        MAIN.postDelayed(pending.timeout, 10_000);
        try {
            ContextCompat.startForegroundService(context,
                new Intent(context, TrackForegroundService.class).setAction(ACTION_START)
                    .putExtra("requestToken", pending.token));
        } catch (SecurityException e) {
            Log.e(SurveyLocation.TAG, "Foreground service start denied", e);
            failPending("PERMISSION_DENIED", "Foreground service start denied: " + e.getMessage());
        } catch (IllegalStateException | IllegalArgumentException e) {
            Log.e(SurveyLocation.TAG, "Foreground service start failed", e);
            failPending("FOREGROUND_START_FAILED", "Foreground service start failed: " + e.getMessage());
        }
    }

    static void stop(Completion completion) {
        SurveyLocation.requireMainThread();
        // Cancelling an in-flight start also settles its caller, rather than leaving it hanging.
        if (pending != null) failPending("CANCELLED", "Recording start was cancelled");
        if (running == null) {
            completion.success(null);
        } else {
            running.finish(null, null, completion);
        }
    }

    private static void failPending(String code, String message) {
        if (pending == null) return;
        StartRequest request = pending;
        pending = null;
        MAIN.removeCallbacks(request.timeout);
        request.completion.error(code, message);
    }

    @Override public void onCreate() {
        super.onCreate();
        running = this;
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stop(new Completion() {
                @Override public void success(String id) {}
                @Override public void error(String code, String message) {
                    Log.e(SurveyLocation.TAG, code + ": " + message);
                }
            });
            return START_NOT_STICKY;
        }
        // A cancelled/late intent must still meet the startForegroundService deadline.
        try {
            showForegroundNotification();
        } catch (SecurityException e) {
            Log.e(SurveyLocation.TAG, "Foreground notification denied", e);
            failPending("PERMISSION_DENIED", "Foreground notification denied: " + e.getMessage());
            finish("PERMISSION_DENIED", "Foreground notification denied", null);
            return START_NOT_STICKY;
        } catch (IllegalStateException | IllegalArgumentException e) {
            Log.e(SurveyLocation.TAG, "Foreground notification failed", e);
            failPending("FOREGROUND_START_FAILED", "Foreground notification failed: " + e.getMessage());
            finish("FOREGROUND_START_FAILED", "Foreground notification failed", null);
            return START_NOT_STICKY;
        }
        if (sessionId != null) return START_NOT_STICKY;
        StartRequest request = pending;
        if (request != null && intent != null && ACTION_START.equals(intent.getAction())
            && !request.token.equals(intent.getStringExtra("requestToken"))) {
            // A cancelled request can arrive after its replacement. Await the matching intent
            // without stopping the service underneath the newer request.
            return START_NOT_STICKY;
        }
        if (request == null || intent == null || !ACTION_START.equals(intent.getAction())
            || !request.token.equals(intent.getStringExtra("requestToken"))) {
            finish(null, null, null);
            return START_NOT_STICKY;
        }
        ownedStart = request;
        running = this;
        String problem = startReadinessError(this);
        if (problem != null) {
            failPending(problem, startReadinessMessage(problem));
            finish(problem, startReadinessMessage(problem), null);
            return START_NOT_STICKY;
        }
        try {
            store = SurveyTrackStore.get(this);
            if (!store.status().isNull("sessionId")) {
                failPending("BUSY", "A background recording session is still open");
                finish(null, null, null);
                return START_NOT_STICKY;
            }
            sessionId = store.begin(request.intervalMs);
            updates = new SurveyLocation(this, request.intervalMs, new SurveyLocation.Sink() {
                @Override public void position(Location location) {
                    if (sessionId == null) return;
                    try {
                        store.append(sessionId, location);
                    } catch (SQLiteException e) {
                        Log.e(SurveyLocation.TAG, "Raw GPS point persistence failed", e);
                        finish("STORAGE_ERROR", "Raw GPS point persistence failed: " + e.getMessage(), null);
                    }
                }
                @Override public void error(String code, String message) {
                    failPending(code, message);
                    finish(code, message, null);
                }
            });
            updates.start();
            if (pending == request && sessionId != null && updates.isRegistered()) {
                pending = null;
                ownedStart = null;
                MAIN.removeCallbacks(request.timeout);
                MAIN.postDelayed(notificationCheck, 5_000);
                request.completion.success(sessionId);
            }
        } catch (SQLiteException e) {
            Log.e(SurveyLocation.TAG, "Recording database initialization failed", e);
            failPending("STORAGE_ERROR", "Recording database initialization failed: " + e.getMessage());
            finish("STORAGE_ERROR", "Recording database initialization failed", null);
        }
        return START_NOT_STICKY;
    }

    private void showForegroundNotification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel(
            CHANNEL, "Survey recording", NotificationManager.IMPORTANCE_LOW));
        Intent open = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(this, 0, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, 0,
            new Intent(this, TrackForegroundService.class).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = new Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("Survey track recording")
            .setContentText("Saving raw GPS fixes on this device")
            .setContentIntent(content)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .addAction(new Notification.Action.Builder(
                android.R.drawable.ic_media_pause, "Stop recording", stop).build());
        if (Build.VERSION.SDK_INT >= 31) {
            builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        }
        Notification notification = builder.build();
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        foreground = true;
    }

    private void finish(String code, String message, Completion completion) {
        SurveyLocation.requireMainThread();
        stopping = true;
        MAIN.removeCallbacks(notificationCheck);
        boolean removed = true;
        if (updates != null) {
            removed = updates.stop();
            updates = null;
        }
        if (!removed && code == null) {
            code = "LOCATION_CLEANUP_FAILED";
            message = "The platform refused GPS listener removal";
        }
        String closed = sessionId;
        if (closed != null) {
            try {
                store.finish(closed, code, message);
                sessionId = null;
            } catch (SQLiteException e) {
                Log.e(SurveyLocation.TAG, "Recording session closure failed", e);
                // Keep the ID until onDestroy retries; next process also recovers an open row.
                deferredErrorCode = "STORAGE_ERROR";
                deferredErrorMessage = "Recording session closure failed: " + e.getMessage();
                if (completion != null) {
                    completion.error("STORAGE_ERROR", "Recording session closure failed: " + e.getMessage());
                    completion = null;
                }
            }
        }
        if (foreground) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            foreground = false;
        }
        stopSelf();
        if (completion != null) {
            if (!removed) completion.error("LOCATION_CLEANUP_FAILED", "The platform refused GPS listener removal");
            else {
                Completion stopped = completion;
                // Wait for destruction too, so an awaited stop can immediately start a new
                // session without reusing a service instance that is still shutting down.
                stoppedCompletions.add(() -> stopped.success(closed));
            }
        }
    }

    @Override public void onDestroy() {
        MAIN.removeCallbacks(notificationCheck);
        if (updates != null) {
            updates.stop();
            updates = null;
        }
        if (sessionId != null) {
            try {
                store.finish(sessionId, deferredErrorCode == null ? "INTERRUPTED" : deferredErrorCode,
                    deferredErrorMessage == null ? "The foreground recording service was terminated" : deferredErrorMessage);
                sessionId = null;
            } catch (SQLiteException e) {
                Log.e(SurveyLocation.TAG, "Interrupted session persistence failed", e);
            }
        }
        if (running == this) running = null;
        if (pending != null && pending == ownedStart) {
            failPending("INTERRUPTED", "The foreground recording service was terminated");
        }
        if (foreground) stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
        for (Runnable completion : stoppedCompletions) completion.run();
        stoppedCompletions.clear();
    }

    @Override public IBinder onBind(Intent intent) {
        return null;
    }
}
