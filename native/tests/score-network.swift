import Foundation

final class CaptureProtocol: URLProtocol, @unchecked Sendable {
    private static let lock=NSLock()
    nonisolated(unsafe) private static var status=200
    nonisolated(unsafe) private static var body=Data("{\"test\":true}".utf8)
    nonisolated(unsafe) private static var hold=false
    nonisolated(unsafe) private static var requests:[URLRequest]=[]
    nonisolated(unsafe) private static var stopped=0
    static func configure(status:Int=200,body:Data=Data("{\"test\":true}".utf8),hold:Bool=false){lock.withLock{Self.status=status;Self.body=body;Self.hold=hold;requests=[];stopped=0}}
    static var captured:[URLRequest]{lock.withLock{requests}}
    static var stopCount:Int{lock.withLock{stopped}}
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        let (status,body,hold)=Self.lock.withLock{Self.requests.append(request);return(Self.status,Self.body,Self.hold)}
        if hold{return}
        let response=HTTPURLResponse(url:request.url!,statusCode:status,httpVersion:nil,headerFields:["Content-Type":"application/json","Content-Length":String(body.count)])!
        client?.urlProtocol(self,didReceive:response,cacheStoragePolicy:.notAllowed)
        client?.urlProtocol(self,didLoad:body)
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {Self.lock.withLock{Self.stopped+=1}}
}
@main struct ScoreNetworkTests {
    @MainActor static func main() async throws {
        ScoreTransport.testProtocolClasses=[CaptureProtocol.self]
        let transport=ScoreTransport()
        let text=try await transport.read()
        precondition(text=="{\"test\":true}" && CaptureProtocol.captured.count==1)
        let request=CaptureProtocol.captured[0]
        precondition(request.url==ScoreTransport.endpoint && request.httpMethod=="GET" && request.httpBody==nil && request.httpBodyStream==nil && request.url?.query==nil)
        for field in ["Authorization","apikey","Cookie","Origin"] {precondition(request.value(forHTTPHeaderField:field)==nil)}
        CaptureProtocol.configure(status:503)
        do {_ = try await transport.read();fatalError("HTTP error accepted")} catch {}
        CaptureProtocol.configure(body:Data(repeating:65,count:262145))
        do {_ = try await transport.read();fatalError("Oversized response accepted")} catch {}
        CaptureProtocol.configure(body:Data([0xff,0xfe]))
        do {_ = try await transport.read();fatalError("Invalid UTF8 accepted")} catch {}
        CaptureProtocol.configure(hold:true)
        let pending=Task {try await transport.read()}
        while CaptureProtocol.captured.isEmpty {await Task.yield()}
        pending.cancel()
        do {_ = try await pending.value;fatalError("Cancelled request completed")} catch {}
        for _ in 0..<100 {if CaptureProtocol.stopCount>0{break};try await Task.sleep(for:.milliseconds(10))}
        precondition(CaptureProtocol.stopCount>0,"Cancellation must stop actual URLProtocol loading")
        print("PASS fixed credential-free GET; HTTP/size/UTF8 rejection; cancellation aborts held URLSession transport")
    }
}
