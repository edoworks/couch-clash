import Foundation

@MainActor
final class ScoreRequestGate {
    typealias Reply = @MainActor @Sendable (Any?, String?) -> Void
    private var task: Task<Void, Never>?
    private var reply: Reply?
    private var generation: UInt64 = 0
    var isBusy: Bool { task != nil }

    @discardableResult
    func start(read: @escaping @MainActor @Sendable () async throws -> String, reply: @escaping Reply) -> Bool {
        guard !isBusy else { return false }
        generation &+= 1
        let current = generation
        self.reply = reply
        task = Task { @MainActor [weak self] in
            let result: Result<String, Error>
            do { result = .success(try await read()) } catch { result = .failure(error) }
            guard let self, self.generation == current else { return }
            self.task = nil
            let completion = self.reply
            self.reply = nil
            switch result {
            case .success(let text): completion?(text, nil)
            case .failure: completion?(nil, "Scores unavailable")
            }
        }
        return true
    }
    func cancel() {
        generation &+= 1
        let oldTask = task, oldReply = reply
        task = nil
        reply = nil
        oldTask?.cancel()
        oldReply?(nil, "Scores unavailable")
    }
}
