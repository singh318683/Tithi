# Tithi for iOS

Native iOS wrapper for the Tithi web app. The whole app (calendar engine, vrat guides, fonts) is bundled in `Tithi/Web/`, so it works fully offline.

- Bundle ID: `com.ikshana.tithi`
- Team: Ikshana Solutions (QAWRSA2R3U)
- iOS 15+, iPhone, portrait

## Updating the app content
When `index.html` in the repo root changes, copy it to `ios/Tithi/Web/index.html` (the iOS copy uses local fonts instead of Google Fonts, so ask Claude for a fresh iOS copy), bump the Build number in Xcode, then archive again.
