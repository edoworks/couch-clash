import SwiftUI
import WebKit

@main
struct CouchClashApp: App {
    @State private var showingForecast = false
    var body: some Scene {
        WindowGroup {
            GameView()
                .background(Color(red: 244/255, green: 235/255, blue: 216/255))
                .preferredColorScheme(.light)
                .safeAreaInset(edge: .top) {
                    HStack {
                        Spacer()
                        Button("Forecast Review · Synthetic") { showingForecast = true }
                            .font(.subheadline).padding(.horizontal, 16).frame(minHeight: 44)
                            .accessibilityIdentifier("OpenForecastReview")
                    }.background(Color(red: 244/255, green: 235/255, blue: 216/255))
                }
                .sheet(isPresented: $showingForecast) {
                    NavigationStack {
                        ForecastView().navigationTitle("Forecast Review")
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { showingForecast = false } } }
                    }
                }
        }
    }
}

struct GameView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: "couchScores")
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        #if DEBUG
        addScoreProbe(to: config)
        if ProcessInfo.processInfo.arguments.contains("--score-test-bridge-probe") || ProcessInfo.processInfo.arguments.contains("--score-test-lifecycle") {
            config.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: "couchScoreTest")
        }
        #endif
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
    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        coordinator.cancelScores()
        uiView.stopLoading()
        uiView.configuration.userContentController.removeAllScriptMessageHandlers()
        uiView.navigationDelegate = nil
        uiView.uiDelegate = nil
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandlerWithReply {
        private let scoreTransport = ScoreTransport()
        private let scoreRequests = ScoreRequestGate()
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
                if navigationAction.targetFrame?.isMainFrame == true { scoreRequests.cancel() }
                decisionHandler(.allow)
            } else {
                if navigationAction.navigationType == .linkActivated, externalLinks.contains(url.absoluteString) {
                    UIApplication.shared.open(url)
                }
                decisionHandler(.cancel)
            }
        }
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                                   replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
            #if DEBUG
            if message.name == "couchScoreTest", let command = message.body as? String, ["count", "snapshot"].contains(command), message.frameInfo.isMainFrame,
               let root = assetRoot, let url = message.frameInfo.request.url,
               url.isFileURL, url.standardizedFileURL.path.hasPrefix(root.path + "/") {
                if command == "count" { replyHandler(scoreTransport.attemptsForTesting, nil) }
                else { replyHandler(["attempts": scoreTransport.attemptsForTesting, "cancelled": scoreTransport.cancelledAttemptsForTesting, "busy": scoreRequests.isBusy], nil) }
                return
            }
            #endif
            guard message.name == "couchScores", message.body as? String == "refresh",
                  message.frameInfo.isMainFrame, let root = assetRoot,
                  message.frameInfo.request.url?.standardizedFileURL == root.appendingPathComponent("index.html"),
                  message.webView?.url?.standardizedFileURL == root.appendingPathComponent("index.html"),
                  !scoreRequests.isBusy else {
                #if DEBUG
                replyHandler(nil, "score_bridge_rejected")
                #else
                replyHandler(nil, "Scores unavailable")
                #endif
                return
            }
            let transport = scoreTransport
            scoreRequests.start(read: { try await transport.read() }, reply: replyHandler)
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
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { scoreRequests.cancel(); webView.reload() }
        func cancelScores() { scoreRequests.cancel() }
    }
}
