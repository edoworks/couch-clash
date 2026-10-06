import Foundation

private final class ScoreRedirectGuard: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
                    completionHandler: @escaping @Sendable (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

@MainActor
final class ScoreTransport {
    static let endpoint = URL(string: "https://zmzzmxdwvgelsjmfihza.supabase.co/functions/v1/scores")!
    #if DEBUG
    static var testProtocolClasses: [AnyClass]?
    #endif
    private let session: URLSession
    private var attempts = 0
    init() {
        let config = URLSessionConfiguration.ephemeral
        #if DEBUG
        if let classes = Self.testProtocolClasses { config.protocolClasses = classes }
        #endif
        config.httpShouldSetCookies = false
        config.httpCookieStorage = nil
        config.urlCredentialStorage = nil
        config.urlCache = nil
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 10
        config.waitsForConnectivity = false
        session = URLSession(configuration: config, delegate: ScoreRedirectGuard(), delegateQueue: nil)
    }
    func read() async throws -> String {
        attempts += 1
        #if DEBUG
        // Failure-only simulator controls; no fabricated live results. Absent from release builds.
        if ProcessInfo.processInfo.arguments.contains("--score-test-unavailable") ||
            (attempts > 1 && ProcessInfo.processInfo.arguments.contains("--score-test-fail-after-first")) {
            throw URLError(.notConnectedToInternet)
        }
        #endif
        var request = URLRequest(url: Self.endpoint)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (bytes, response) = try await session.bytes(for: request)
        defer { bytes.task.cancel() }
        guard let http = response as? HTTPURLResponse, http.statusCode == 200,
              http.url == Self.endpoint,
              http.mimeType == "application/json", http.expectedContentLength <= 262144 else {
            throw URLError(.badServerResponse)
        }
        var data = Data()
        for try await byte in bytes {
            guard data.count < 262144 else { throw URLError(.dataLengthExceedsMaximum) }
            data.append(byte)
        }
        guard let text = String(data: data, encoding: .utf8) else { throw URLError(.cannotDecodeContentData) }
        return text
    }
}
