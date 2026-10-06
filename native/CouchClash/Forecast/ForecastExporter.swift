import UIKit

@MainActor final class ForecastExporter: NSObject, UIDocumentPickerDelegate, UIAdaptivePresentationControllerDelegate {
    typealias Reply = @MainActor @Sendable (String) -> Void
    private var reply: Reply?
    private var directory: URL?
    private weak var picker: UIDocumentPickerViewController?
    private let exportRoot = FileManager.default.temporaryDirectory.appendingPathComponent("ForecastReviewExports", isDirectory: true)
    var busy: Bool { reply != nil }
    override init() {
        super.init()
        // Remove only this feature's stale staging copies after an interrupted export.
        try? FileManager.default.removeItem(at: exportRoot)
    }
    func save(_ packet: ExportPacket, presenter: UIViewController, reply: @escaping Reply) {
        guard !busy, presenter.presentedViewController == nil else { reply("busy"); return }
        self.reply = reply
        do {
            let folder = exportRoot.appendingPathComponent(UUID().uuidString, isDirectory: true)
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            directory = folder
            // Every export is a snapshot; unique names avoid accidental replacement of earlier records.
            let stamp = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "-")
            let file = folder.appendingPathComponent("forecast-journal-" + stamp + "-" + UUID().uuidString.prefix(8) + ".json")
            try Data(packet.json.utf8).write(to: file, options: [.atomic, .completeFileProtection])
            let picker = UIDocumentPickerViewController(forExporting: [file], asCopy: true)
            picker.delegate = self; picker.shouldShowFileExtensions = true
            self.picker = picker
            presenter.present(picker, animated: true)
            picker.presentationController?.delegate = self
        } catch { finish("failed") }
    }
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard controller === picker else { return }
        finish(urls.isEmpty ? "failed" : "saved")
    }
    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        guard controller === picker else { return }; finish("cancelled")
    }
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        guard presentationController.presentedViewController === picker else { return }; finish("cancelled")
    }
    private func finish(_ status: String) {
        let callback = reply; reply = nil; picker = nil
        if let directory { try? FileManager.default.removeItem(at: directory) }
        directory = nil; callback?(status)
    }
    func cancel() { let current = picker; if busy { finish("cancelled") }; current?.dismiss(animated: false) }
}
