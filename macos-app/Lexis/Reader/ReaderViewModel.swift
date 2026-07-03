import Foundation
import Observation
import SwiftData

@MainActor
@Observable
final class ReaderViewModel {
    let sessionID: PersistentIdentifier

    private(set) var overview: SessionOverview?
    private(set) var currentPage: PageSnapshot?
    var currentPageNumber: Int = 1
    private(set) var isLoadingPage = false
    private(set) var loadError: String?

    private let processor: PageProcessor

    init(sessionID: PersistentIdentifier, container: ModelContainer) {
        self.sessionID = sessionID
        self.processor = PageProcessor(container: container, extraction: GeminiClient())
    }

    func start() async {
        await reloadOverview()
        if let overview {
            currentPageNumber = max(1, min(overview.lastPage, overview.totalPages))
        }
        await loadCurrentPage()
    }

    func goToPage(_ number: Int) {
        guard let overview, number >= 1, number <= overview.totalPages else { return }
        currentPageNumber = number
        Task { await loadCurrentPage() }
    }

    func retry() {
        Task { await loadCurrentPage() }
    }

    private func reloadOverview() async {
        do {
            overview = try await processor.persistence.overview(sessionID)
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func loadCurrentPage() async {
        isLoadingPage = true
        loadError = nil
        defer { isLoadingPage = false }
        do {
            let model = UserDefaults.standard.string(forKey: AppSettings.geminiModelKey) ?? AppSettings.defaultGeminiModel
            currentPage = try await processor.textPage(sessionID: sessionID, pageNumber: currentPageNumber, model: model)
            try await processor.persistence.updateLastPage(sessionID, page: currentPageNumber)
        } catch {
            loadError = error.localizedDescription
        }
    }
}
