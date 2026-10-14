package top.beichenhome.heritage;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteException;
import android.database.sqlite.SQLiteOpenHelper;
import android.location.Location;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.UUID;

/** App-private raw fixes: no network, pruning or deletion on stop. */
final class SurveyTrackStore extends SQLiteOpenHelper {
    private static SurveyTrackStore instance;

    static synchronized SurveyTrackStore get(Context context) {
        if (instance == null) {
            SurveyTrackStore candidate = new SurveyTrackStore(context.getApplicationContext());
            // Once per process, before either the plugin or service can create a new session.
            try {
                candidate.interruptOpenSessions("The recording process terminated before the session was closed");
            } catch (SQLiteException e) {
                candidate.close();
                throw e;
            }
            instance = candidate;
        }
        return instance;
    }

    private SurveyTrackStore(Context context) {
        super(context, "survey-location.db", null, 1);
        setWriteAheadLoggingEnabled(true);
    }

    @Override public void onConfigure(SQLiteDatabase db) {
        db.setForeignKeyConstraintsEnabled(true);
        db.execSQL("PRAGMA synchronous=FULL");
    }

    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE sessions (session_id TEXT PRIMARY KEY, started_at INTEGER NOT NULL,"
            + " stopped_at INTEGER, interval_ms INTEGER NOT NULL, error_code TEXT, error_message TEXT)");
        db.execSQL("CREATE UNIQUE INDEX single_active_session ON sessions ((1)) WHERE stopped_at IS NULL");
        db.execSQL("CREATE TABLE points (id INTEGER PRIMARY KEY AUTOINCREMENT,"
            + " session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,"
            + " position TEXT NOT NULL)");
        db.execSQL("CREATE INDEX points_session_id ON points(session_id, id)");
    }

    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        throw new SQLiteException("Unsupported survey track database version");
    }

    synchronized String begin(long intervalMs) {
        ContentValues values = new ContentValues();
        String id = UUID.randomUUID().toString();
        values.put("session_id", id);
        values.put("started_at", System.currentTimeMillis());
        values.put("interval_ms", intervalMs);
        getWritableDatabase().insertOrThrow("sessions", null, values);
        return id;
    }

    synchronized void interruptOpenSessions(String message) {
        ContentValues values = new ContentValues();
        values.put("stopped_at", System.currentTimeMillis());
        values.put("error_code", "INTERRUPTED");
        values.put("error_message", message);
        getWritableDatabase().update("sessions", values, "stopped_at IS NULL", null);
    }

    synchronized void append(String sessionId, Location location) {
        ContentValues values = new ContentValues();
        values.put("session_id", sessionId);
        values.put("position", SurveyLocation.position(location).toString());
        getWritableDatabase().insertOrThrow("points", null, values);
    }

    synchronized void finish(String id, String code, String message) {
        ContentValues values = new ContentValues();
        values.put("stopped_at", System.currentTimeMillis());
        if (code == null) {
            values.putNull("error_code");
            values.putNull("error_message");
        } else {
            values.put("error_code", code);
            values.put("error_message", message);
        }
        getWritableDatabase().update("sessions", values,
            "session_id = ? AND stopped_at IS NULL", new String[] { id });
    }

    synchronized JSObject status() {
        JSObject result = new JSObject();
        try (Cursor cursor = getReadableDatabase().rawQuery(
            "SELECT session_id, stopped_at, error_code, error_message FROM sessions"
                + " ORDER BY (stopped_at IS NULL) DESC, rowid DESC LIMIT 1", null)) {
            if (cursor.moveToFirst()) {
                result.put("sessionId", cursor.isNull(1) ? cursor.getString(0) : JSONObject.NULL);
                result.put("error", error(cursor, 2, 3));
            } else {
                result.put("sessionId", JSONObject.NULL);
                result.put("error", JSONObject.NULL);
            }
        }
        return result;
    }

    synchronized JSArray list() {
        JSArray tracks = new JSArray();
        try (Cursor cursor = getReadableDatabase().rawQuery(
            "SELECT session_id, started_at, stopped_at, error_code, error_message FROM sessions"
                + " ORDER BY started_at DESC, rowid DESC", null)) {
            while (cursor.moveToNext()) {
                JSObject track = new JSObject();
                track.put("sessionId", cursor.getString(0));
                track.put("startedAt", cursor.getLong(1));
                track.put("stoppedAt", cursor.isNull(2) ? JSONObject.NULL : cursor.getLong(2));
                track.put("error", error(cursor, 3, 4));
                tracks.put(track);
            }
        }
        return tracks;
    }

    synchronized JSObject read(String id, long afterId, int limit) throws JSONException {
        JSObject result = session(id);
        if (result == null) return null;
        JSArray points = new JSArray();
        try (Cursor cursor = getReadableDatabase().rawQuery(
            "SELECT id, position FROM points WHERE session_id = ? AND id > ? ORDER BY id ASC LIMIT ?",
            new String[] { id, Long.toString(afterId), Integer.toString(limit) })) {
            while (cursor.moveToNext()) {
                JSObject point = new JSObject();
                point.put("id", cursor.getLong(0));
                point.put("position", new JSONObject(cursor.getString(1)));
                points.put(point);
            }
        }
        result.put("points", points);
        return result;
    }

    synchronized JSObject session(String id) {
        try (Cursor cursor = getReadableDatabase().rawQuery(
            "SELECT stopped_at, error_code, error_message FROM sessions WHERE session_id = ?",
            new String[] { id })) {
            if (!cursor.moveToFirst()) return null;
            JSObject result = new JSObject();
            result.put("active", cursor.isNull(0));
            result.put("error", error(cursor, 1, 2));
            return result;
        }
    }

    synchronized void delete(String id) {
        getWritableDatabase().delete("sessions", "session_id = ? AND stopped_at IS NOT NULL",
            new String[] { id });
    }

    private static Object error(Cursor cursor, int code, int message) {
        return cursor.isNull(code) ? JSONObject.NULL
            : SurveyLocation.error(cursor.getString(code), cursor.getString(message));
    }
}
