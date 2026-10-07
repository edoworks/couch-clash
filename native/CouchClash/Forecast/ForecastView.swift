import SwiftUI
import WebKit

struct ForecastView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // Stable persistent store, separate from the social game's .default() store.
        config.websiteDataStore = WKWebsiteDataStore(forIdentifier: UUID(uuidString: "CCF02026-1006-4000-8000-000000000001")!)
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--forecast-qa") {
            config.websiteDataStore = WKWebsiteDataStore(forIdentifier: UUID(uuidString: "CCF02026-1006-4000-8000-000000000099")!)
        }
        addForecastProbe(to: config)
        #endif
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        for name in ["forecastSelection", "forecastJournalExport"] {
            config.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: name)
        }
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.accessibilityIdentifier = "ForecastReview"
        web.allowsBackForwardNavigationGestures = false
        if let page = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "ForecastWeb") {
            context.coordinator.allowedURL = page
            web.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
        }
        context.coordinator.observeBackground()
        return web
    }
    func updateUIView(_ web: WKWebView, context: Context) {}
    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) {
        coordinator.teardown(); web.stopLoading()
        web.configuration.userContentController.removeAllScriptMessageHandlers(); web.navigationDelegate = nil
    }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandlerWithReply {
        var allowedURL: URL?
        private let gate = SelectionGate()
        private let exporter = ForecastExporter()
        func observeBackground() {
            NotificationCenter.default.addObserver(self, selector: #selector(background), name: UIApplication.didEnterBackgroundNotification, object: nil)
        }
        @objc private func background() { gate.cancel() }
        func teardown() { gate.cancel(); exporter.cancel(); NotificationCenter.default.removeObserver(self) }
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
            guard action.targetFrame?.isMainFrame == true, action.request.url?.absoluteString == allowedURL?.absoluteString else { decisionHandler(.cancel); return }
            gate.cancel(); exporter.cancel(); decisionHandler(.allow)
        }
        func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) { gate.navigation() }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { gate.cancel(); exporter.cancel(); webView.reload() }
        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
            guard let allowedURL, message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.protocol == "file",
                  message.frameInfo.request.url?.absoluteString == allowedURL.absoluteString,
                  message.webView?.url?.absoluteString == allowedURL.absoluteString else { replyHandler(nil, "Request unavailable"); return }
            if message.name == "forecastJournalExport" {
                guard let packet = ExportPacket.parse(message.body), let presenter = message.webView?.window?.rootViewController else { replyHandler(nil, "Export unavailable"); return }
                var top = presenter
                while let next = top.presentedViewController { top = next }
                exporter.save(packet, presenter: top) { status in replyHandler(["version": 1, "requestID": packet.id, "status": status], nil) }
                return
            }
            guard message.name == "forecastSelection", let packet = BridgePacket.parse(message.body, mainFrame: message.frameInfo.isMainFrame, frameURL: message.frameInfo.request.url, currentURL: message.webView?.url, originProtocol: message.frameInfo.securityOrigin.protocol, allowedURL: allowedURL) else { replyHandler(nil, "Request unavailable"); return }
            if packet.operation == "cancel" {
                gate.cancel(id: packet.id); replyHandler(["version": 1, "requestID": packet.id, "status": "cancelled"], nil); return
            }
            let admitted = gate.start(id: packet.id, read: {
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("--forecast-fake") {
                    try? await Task.sleep(for: .milliseconds(200))
                    return .oneEventNotSkill
                }
                #endif
                return await OnDeviceSelector.select()
            }) { status, selection in
                var value: [String: Any] = ["version": 1, "requestID": packet.id, "status": status]
                if let selection { value["selection"] = selection }
                replyHandler(value, nil)
            }
            if !admitted { replyHandler(["version": 1, "requestID": packet.id, "status": "busy"], nil) }
        }
    }
}
