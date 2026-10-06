import Foundation
import CoreFoundation

struct BridgePacket: Sendable {
    let id: String
    let operation: String
    static func parse(_ body: Any, mainFrame: Bool, frameURL: URL?, currentURL: URL?, originProtocol: String, allowedURL: URL) -> BridgePacket? {
        guard mainFrame, originProtocol == "file", frameURL?.absoluteString == allowedURL.absoluteString,
              currentURL?.absoluteString == allowedURL.absoluteString,
              let d = body as? [String: Any], Set(d.keys) == Set(["version", "requestID", "operation", "packet", "evidenceIDs"]),
              let version = d["version"] as? NSNumber, CFGetTypeID(version) != CFBooleanGetTypeID(), version.doubleValue == 1,
              let id = d["requestID"] as? String, UUID(uuidString: id) != nil, id.count == 36,
              let op = d["operation"] as? String, ["select", "cancel"].contains(op),
              d["packet"] as? String == "synthetic-one-event-v1", d["evidenceIDs"] as? [String] == ["E1"],
              JSONSerialization.isValidJSONObject(d), let bytes = try? JSONSerialization.data(withJSONObject: d), bytes.count <= 512 else { return nil }
        return BridgePacket(id: id, operation: op)
    }
}

enum SelectionResult: String, Sendable { case oneEventNotSkill, noBenchmarkAvailable, unavailable, refused, failed }

@MainActor final class SelectionGate {
    typealias Reply = @MainActor @Sendable (String, String?) -> Void
    private var operation: Task<Void, Never>?
    private var deadline: Task<Void, Never>?
    private var reply: Reply?
    private var generation: UInt64 = 0
    private var seen = Set<String>()
    private var running = 0
    private(set) var requestID: String?
    var busy: Bool { requestID != nil }
    var admittedCount: Int { seen.count }
    @discardableResult func start(id: String, timeout: Duration = .seconds(15), read: @escaping @MainActor @Sendable () async -> SelectionResult, reply: @escaping Reply) -> Bool {
        guard !busy, running == 0, seen.count < 256, seen.insert(id).inserted else { return false }
        generation &+= 1; let token = generation
        requestID = id; self.reply = reply; running += 1
        operation = Task { @MainActor [weak self] in
            let result = await read()
            guard let self else { return };self.running -= 1
            guard self.generation == token, self.busy else { return }
            let selection = [SelectionResult.oneEventNotSkill, .noBenchmarkAvailable].contains(result) ? result.rawValue : nil
            self.finish(status: selection == nil ? result.rawValue : "ok", selection: selection)
        }
        deadline = Task { @MainActor [weak self] in
            do { try await Task.sleep(for: timeout) } catch { return }
            guard let self, self.generation == token, self.busy else { return }
            self.finish(status: "timeout", selection: nil)
        }
        return true
    }
    private func finish(status: String, selection: String?) {
        generation &+= 1
        let callback = reply, oldTask = operation, oldDeadline = deadline
        requestID = nil; reply = nil; operation = nil; deadline = nil
        oldDeadline?.cancel(); oldTask?.cancel(); callback?(status, selection)
    }
    func cancel(id: String? = nil) {
        guard busy, id == nil || id == requestID else { return }
        finish(status: "cancelled", selection: nil)
    }
    func navigation() { cancel(); seen.removeAll() }
}
