package top.beichenhome.heritage;

/** Run with javac/java directly; no Android runtime or test dependencies required. */
public final class SurveyLocationPolicyTest {
    public static void main(String[] args) {
        equal(1_000L, SurveyLocationPolicy.interval(null));
        equal(1_000L, SurveyLocationPolicy.interval(1000));
        equal(60_000L, SurveyLocationPolicy.interval(60_000.0));
        equal(100L, SurveyLocationPolicy.interval(100));
        equal(null, SurveyLocationPolicy.interval(99));
        equal(null, SurveyLocationPolicy.interval(60_001));
        equal(null, SurveyLocationPolicy.interval(1000.1));
        equal(null, SurveyLocationPolicy.interval(Double.NaN));
        equal(null, SurveyLocationPolicy.interval(Double.POSITIVE_INFINITY));
        equal(null, SurveyLocationPolicy.interval("1000"));
        equal(120_000L, SurveyLocationPolicy.timeoutMs(1000));
        equal(180_000L, SurveyLocationPolicy.timeoutMs(60_000));

        long start = 20_000_000_000L;
        long fix = start + 1_000_000_000L;
        check(SurveyLocationPolicy.fresh(fix, start, 0, fix), "new GPS fix");
        check(SurveyLocationPolicy.fresh(fix, start, 0, fix + 10_000_000_000L), "age boundary");
        check(!SurveyLocationPolicy.fresh(start - 1, start, 0, fix), "cached fix");
        check(!SurveyLocationPolicy.fresh(fix, start, fix, fix), "duplicate fix");
        check(!SurveyLocationPolicy.fresh(fix, start, fix + 1, fix + 2), "out-of-order fix");
        check(!SurveyLocationPolicy.fresh(fix, start, 0, fix - 1), "future fix");
        check(!SurveyLocationPolicy.fresh(fix, start, 0, fix + 10_000_000_001L), "stale fix");
        System.out.println("Survey location policy: 19 checks passed");
    }

    private static void equal(Long expected, Long actual) {
        check(expected == null ? actual == null : expected.equals(actual), "interval/timeout rule");
    }

    private static void check(boolean condition, String label) {
        if (!condition) throw new AssertionError(label);
    }
}
