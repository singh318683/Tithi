# Tithi for Android

Native Android wrapper for the Tithi web app. The whole app (calendar engine, vrat guides, fonts) is bundled in `app/src/main/assets/web/`, so it works fully offline. No INTERNET permission.

- Package: `com.ikshana.tithi`
- minSdk 26 (Android 8.0), targetSdk 36, Java 17, AGP 8.11 / Gradle 8.13
- Open the `android` folder (not the repo root) in Android Studio

## How it works
- `MainActivity` hosts a WebView that serves the bundled page at `https://appassets.androidplatform.net/assets/web/index.html` (WebViewAssetLoader), so localStorage keeps city, reminders and vrat ticks between launches.
- Reminders: the page talks to `window.webkit.messageHandlers.tithi` (the iOS bridge). A small shim at the top of the Android `index.html` routes that to `TithiBridge`, which schedules system alarms (`ReminderScheduler`) that post notifications (`ReminderReceiver`). `BootReceiver` re-arms them after reboot or an app update.
- Back button closes the open sheet/panel first, then leaves the app.
- Outside links open in the browser / mail / phone app.

## Updating the app content
The Android copy = the iOS copy (`ios/Tithi/Web/index.html`, local fonts) + the bridge shim right after `<head>`. When the web app changes, ask Claude for a fresh Android copy, bump `versionCode` (and `versionName`) in `app/build.gradle`, and build a new signed bundle.

## Release
Build > Generate Signed App Bundle / APK > Android App Bundle, with your upload keystore. Keep the `.jks` file and its passwords safe and out of git (already in `.gitignore`).
