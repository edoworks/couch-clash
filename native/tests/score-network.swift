import Foundation

final class CaptureProtocol: URLProtocol, @unchecked Sendable {
    nonisolated(unsafe) static var requests: [URLRequest] = []
    nonisolated(unsafe) static var status = 200
    nonisolated(unsafe) static var body = Data("{\"test\":true}".utf8)
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.requests.append(request)
        let response=HTTPURLResponse(url:request.url!,statusCode:Self.status,httpVersion:nil,headerFields:["Content-Type":"application/json","Content-Length":String(Self.body.count)])!
        client?.urlProtocol(self,didReceive:response,cacheStoragePolicy:.notAllowed)
        client?.urlProtocol(self,didLoad:Self.body)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}
@main struct ScoreNetworkTests {
    @MainActor static func main() async throws {
        ScoreTransport.testProtocolClasses=[CaptureProtocol.self]
        let transport=ScoreTransport()
        let text=try await transport.read()
        precondition(text=="{\"test\":true}" && CaptureProtocol.requests.count==1)
        let request=CaptureProtocol.requests[0]
        precondition(request.url==ScoreTransport.endpoint && request.httpMethod=="GET" && request.httpBody==nil && request.httpBodyStream==nil && request.url?.query==nil)
        for field in ["Authorization","apikey","Cookie","Origin"] {precondition(request.value(forHTTPHeaderField:field)==nil)}
        CaptureProtocol.status=503
        do {_ = try await transport.read();fatalError("HTTP error accepted")} catch {}
        CaptureProtocol.status=200;CaptureProtocol.body=Data(repeating:65,count:262145)
        do {_ = try await transport.read();fatalError("Oversized response accepted")} catch {}
        CaptureProtocol.body=Data([0xff,0xfe])
        do {_ = try await transport.read();fatalError("Invalid UTF8 accepted")} catch {}
        print("PASS synthetic native request: fixed GET, no query/body/auth/key/cookie/Origin; HTTP, size and UTF8 failures rejected")
    }
}
