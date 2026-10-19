package com.ikshana.tithi;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;

import androidx.activity.ComponentActivity;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewAssetLoader;

/**
 * Full-screen host for the bundled Tithi web app (assets/web/index.html).
 * Everything runs offline from the APK; nothing is loaded from the internet.
 */
public class MainActivity extends ComponentActivity {

    static final String HOST = "appassets.androidplatform.net";
    static final String START_URL = "https://" + HOST + "/assets/web/index.html";

    /** Closes the open bottom sheet / panel through the page's own Escape handlers. */
    private static final String JS_BACK =
            "(function(){var s=document.getElementById('sheet'),p=document.getElementById('panel');" +
            "var open=(s&&!s.hidden)||(p&&!p.hidden);" +
            "if(open)document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));" +
            "return open;})()";

    private WebView web;
    private boolean askedNotifications = false;
    private ActivityResultLauncher<String> notificationPermission;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        notificationPermission = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(), granted -> { });

        // Layout: [status-bar strip] [web view] [nav-bar / keyboard strip], colored like the page.
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(getColor(R.color.ground));

        View topStrip = new View(this);
        topStrip.setBackgroundColor(getColor(R.color.ground));
        View bottomStrip = new View(this);
        bottomStrip.setBackgroundColor(getColor(R.color.surface));

        web = new WebView(this);
        web.setBackgroundColor(getColor(R.color.ground));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        root.addView(topStrip, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0));
        root.addView(web, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        root.addView(bottomStrip, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0));
        setContentView(root);

        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            topStrip.getLayoutParams().height = bars.top;
            bottomStrip.getLayoutParams().height = Math.max(bars.bottom, ime.bottom);
            v.setPadding(bars.left, 0, bars.right, 0);
            topStrip.requestLayout();
            bottomStrip.requestLayout();
            return WindowInsetsCompat.CONSUMED;
        });

        setUpWebView();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                web.evaluateJavascript(JS_BACK, result -> {
                    if (!"true".equals(result)) {
                        // Nothing open in the page: let Android do its normal back (leave the app).
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                        setEnabled(true);
                    }
                });
            }
        });

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) {
            web.loadUrl(START_URL);
        }
    }

    private void setUpWebView() {
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // keeps city, reminders & vrat ticks between launches
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);                    // layout is designed for 100%, same as the iOS app
        s.setSupportZoom(false);

        web.addJavascriptInterface(new TithiBridge(this), "TithiAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (HOST.equals(url.getHost())) return false;
                // Any outside link (web, mail, phone) opens in the right app instead of inside Tithi.
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (ActivityNotFoundException ignored) { }
                return true;
            }
        });
    }

    /** Called by the bridge the first time the page schedules reminders. */
    void askNotificationPermissionIfNeeded() {
        if (askedNotifications || Build.VERSION.SDK_INT < 33) return;
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        askedNotifications = true;
        notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("TithiAndroid");
            web.destroy();
        }
        super.onDestroy();
    }
}
