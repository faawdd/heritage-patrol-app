package top.beichenhome.heritage;

/** Monotonic-time and input rules kept independent of Android for native checks. */
final class SurveyLocationPolicy {
    static final long MIN_INTERVAL_MS = 100;
    static final long DEFAULT_INTERVAL_MS = 1_000;
    static final long MAX_INTERVAL_MS = 60_000;
    static final long MAX_FIX_AGE_NANOS = 10_000_000_000L;

    private SurveyLocationPolicy() {}

    static Long interval(Object value) {
        if (value == null) return DEFAULT_INTERVAL_MS;
        if (!(value instanceof Number)) return null;
        double number = ((Number) value).doubleValue();
        if (!Double.isFinite(number) || number != Math.rint(number)
            || number < MIN_INTERVAL_MS || number > MAX_INTERVAL_MS) return null;
        return (long) number;
    }

    static boolean fresh(long fix, long registered, long previous, long now) {
        return fix >= registered && fix > previous && fix <= now
            && now - fix <= MAX_FIX_AGE_NANOS;
    }

    static long timeoutMs(long intervalMs) {
        return Math.max(120_000, intervalMs * 3);
    }
}
