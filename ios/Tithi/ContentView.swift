import SwiftUI
import WebKit

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
        config.websiteDataStore = .default()          // keeps chosen city & vrat ticks between launches
        config.allowsInlineMediaPlayback = true

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

    final class Coordinator: NSObject, WKNavigationDelegate {
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
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View { ContentView() }
}
