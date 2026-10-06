import SwiftUI
import WebKit

@main
struct CouchClashApp: App {
    var body: some Scene {
        WindowGroup {
            GameView()
                .background(Color(red: 244/255, green: 235/255, blue: 216/255))
                .preferredColorScheme(.light)
        }
    }
}

struct GameView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 244/255, green: 235/255, blue: 216/255, alpha: 1)
        web.scrollView.backgroundColor = web.backgroundColor
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsBackForwardNavigationGestures = false
        web.accessibilityIdentifier = "CouchClashGame"
        if let page = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            context.coordinator.assetRoot = page.deletingLastPathComponent().standardizedFileURL
            web.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
        }
        return web
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var assetRoot: URL?
        let externalLinks: Set<String> = [
            "https://www.seahawks.com/game-day/2026/reg-week4/seahawks-vs-chargers/",
            "https://www.neworleanssaints.com/schedule/",
            "https://operations.nfl.com/rules-officiating/nfl-football-basics/football-terms"
        ]
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            if url.isFileURL, let root = assetRoot, url.standardizedFileURL.path.hasPrefix(root.path + "/") {
                decisionHandler(.allow)
            } else {
                if navigationAction.navigationType == .linkActivated, externalLinks.contains(url.absoluteString) {
                    UIApplication.shared.open(url)
                }
                decisionHandler(.cancel)
            }
        }
        func presenter(for webView: WKWebView) -> UIViewController? {
            var vc = webView.window?.rootViewController
            while let presented = vc?.presentedViewController { vc = presented }
            return vc
        }
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping @MainActor @Sendable () -> Void) {
            guard let vc = presenter(for: webView) else { completionHandler(); return }
            let alert = UIAlertController(title: "Couch Clash", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            vc.present(alert, animated: true)
        }
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping @MainActor @Sendable (Bool) -> Void) {
            guard let vc = presenter(for: webView) else { completionHandler(false); return }
            let alert = UIAlertController(title: "Confirm local change", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "Continue", style: .destructive) { _ in completionHandler(true) })
            vc.present(alert, animated: true)
        }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }
    }
}
