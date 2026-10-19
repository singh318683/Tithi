package com.ikshana.tithi;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Turns the page's reminder list into system alarms. The list is saved so it can be
 * re-armed after a reboot or app update (alarms do not survive those on their own).
 */
final class ReminderScheduler {
    static final String ACTION_REMIND = "com.ikshana.tithi.REMIND";
    static final String EXTRA_ID = "id";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_BODY = "body";

    private static final int MAX = 60;
    private static final String PREFS = "reminders";
    private static final String KEY_ITEMS = "items";

    private ReminderScheduler() { }

    static synchronized void saveAndSchedule(Context ctx, JSONArray items) {
        prefs(ctx).edit().putString(KEY_ITEMS, items.toString()).apply();
        schedule(ctx, items);
    }

    /** Re-arms the saved list (after boot / app update). */
    static synchronized void reschedule(Context ctx) {
        try {
            schedule(ctx, new JSONArray(prefs(ctx).getString(KEY_ITEMS, "[]")));
        } catch (JSONException ignored) {
        }
    }

    private static void schedule(Context ctx, JSONArray items) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        if (am == null) return;

        // Clear everything we set before.
        for (int i = 0; i < MAX; i++) {
            PendingIntent old = PendingIntent.getBroadcast(ctx, i, baseIntent(ctx),
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
            if (old != null) {
                am.cancel(old);
                old.cancel();
            }
        }

        long now = System.currentTimeMillis();
        int slot = 0;
        for (int i = 0; i < items.length() && slot < MAX; i++) {
            JSONObject it = items.optJSONObject(i);
            if (it == null) continue;
            String id = it.optString("id", "");
            String title = it.optString("title", "");
            long at = it.optLong("at", 0);
            if (id.isEmpty() || title.isEmpty() || at <= now) continue;

            Intent intent = baseIntent(ctx)
                    .putExtra(EXTRA_ID, id)
                    .putExtra(EXTRA_TITLE, title)
                    .putExtra(EXTRA_BODY, it.optString("body", ""));
            PendingIntent pi = PendingIntent.getBroadcast(ctx, slot, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            // Inexact-but-Doze-safe: needs no special alarm permission; fires within minutes.
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            slot++;
        }
    }

    private static Intent baseIntent(Context ctx) {
        return new Intent(ctx, ReminderReceiver.class).setAction(ACTION_REMIND);
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
