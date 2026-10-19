package com.ikshana.tithi;

import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Receives messages from the page as window.TithiAndroid.postMessage(json).
 * A small shim in index.html maps the iOS bridge (window.webkit.messageHandlers.tithi)
 * onto this, so the web code is shared with the iOS app.
 *
 * The page sends: { type: "schedule", items: [{ id, at (ms since 1970), title, body }] }
 */
public class TithiBridge {
    private final MainActivity activity;

    TithiBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void postMessage(String json) {
        try {
            JSONObject msg = new JSONObject(json);
            if (!"schedule".equals(msg.optString("type"))) return;
            JSONArray items = msg.optJSONArray("items");
            if (items == null) items = new JSONArray();

            ReminderScheduler.saveAndSchedule(activity.getApplicationContext(), items);
            if (items.length() > 0) activity.runOnUiThread(activity::askNotificationPermissionIfNeeded);
        } catch (JSONException ignored) {
        }
    }
}
