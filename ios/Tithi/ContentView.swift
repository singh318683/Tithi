import SwiftUI
import WebKit
import UserNotifications

/// Full-screen host for the bundled Tithi web app (Web/index.html).
/// Everything runs offline from the app bundle; nothing is loaded from the internet.
struct ContentView: View {
    var body: some View {
        TithiWebView()
            .ignoresSafeArea()
            .background(Color("LaunchBackground").ignoresSafeArea())
    }
}

struct TithiWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()          // keeps city, reminders & vrat ticks between launches
        config.userContentController.add(context.coordinator, name: "tithi")   // reminders -> notifications

        let webView = WKWebView(frame: .zero, configuration: config)
        let bg = UIColor(named: "LaunchBackground") ?? .systemBackground
        webView.isOpaque = false
        webView.backgroundColor = bg
        webView.scrollView.backgroundColor = bg
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never   // page handles safe areas itself
        webView.allowsLinkPreview = false
        webView.navigationDelegate = context.coordinator

        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, UNUserNotificationCenterDelegate {

        override init() {
            super.init()
            UNUserNotificationCenter.current().delegate = self
        }

        // Open any outside web link in Safari instead of inside the app.
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url,
               let scheme = url.scheme?.lowercased(),
               scheme == "http" || scheme == "https" || scheme == "mailto" || scheme == "tel" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        // The page sends: { type: "schedule", items: [{ id, at (ms since 1970), title, body }] }
        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard let msg = message.body as? [String: Any],
                  (msg["type"] as? String) == "schedule",
                  let items = msg["items"] as? [[String: Any]] else { return }

            let center = UNUserNotificationCenter.current()
            center.removeAllPendingNotificationRequests()
            guard !items.isEmpty else { return }

            center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
                guard granted else { return }
                for item in items.prefix(60) {
                    guard let id = item["id"] as? String,
                          let at = item["at"] as? Double,
                          let title = item["title"] as? String else { continue }
                    let date = Date(timeIntervalSince1970: at / 1000)
                    if date <= Date() { continue }

                    let content = UNMutableNotificationContent()
                    content.title = title
                    content.body = (item["body"] as? String) ?? ""
                    content.sound = .default

                    let parts = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
                    let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
                    center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
                }
            }
        }

        // Show the banner even if Tithi is open when the reminder fires.
        func userNotificationCenter(_ center: UNUserNotificationCenter,
                                    willPresent notification: UNNotification,
                                    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
            completionHandler([.banner, .sound, .list])
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View { ContentView() }
}
