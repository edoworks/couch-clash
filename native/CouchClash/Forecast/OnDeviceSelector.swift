import Foundation
import FoundationModels

@available(iOS 26.0, macOS 26.0, *)
@Generable enum ApprovedExplanationID { case oneEventNotSkill, noBenchmarkAvailable }

@MainActor enum OnDeviceSelector {
    private(set) static var attempts = 0
    // No caller input enters the model. Fixed, synthetic learning packet only.
    static func select() async -> SelectionResult {
        guard #available(iOS 26.0, macOS 26.0, *) else { return .unavailable }
        let model = SystemLanguageModel.default
        guard model.availability == .available, model.supportsLocale(Locale(identifier: "en_US")) else { return .unavailable }
        let session = LanguageModelSession(model: model, tools: [], instructions: "Choose only an approved explanation ID for this fictional learning example. Do not invent facts, causes, predictions, scores or advice.")
        do {
            try Task.checkCancellation()
            attempts += 1
            let result = try await session.respond(to: "Synthetic evidence E1: one fictional sports event has been reviewed. No benchmark is supplied. Select the caution that one observation cannot establish forecasting skill.", generating: ApprovedExplanationID.self, options: GenerationOptions(temperature: 0, maximumResponseTokens: 64))
            try Task.checkCancellation()
            switch result.content { case .oneEventNotSkill: return .oneEventNotSkill; case .noBenchmarkAvailable: return .noBenchmarkAvailable }
        } catch {
            if #available(iOS 27.0, macOS 27.0, *), let failure = error as? LanguageModelError {
                switch failure { case .refusal, .guardrailViolation: return .refused; default: break }
            }
            return .failed
        }
    }
}
