import Foundation
import Observation
import SwiftData
import UniformTypeIdentifiers

/// Drives the import flow: routes a picked/dropped file to either the PDF
/// page picker or straight to a text session, and creates the resulting
/// ReadingSession via PersistenceActor.
@MainActor
@Observable
final class ImportCoordinator {
    enum Stage: Equatable {
        case idle
        case selectingPages(fileName: String, pageCount: Int)
        case creating
        case error(String)
    }

    private(set) var stage: Stage = .idle
    var createdSessionID: PersistentIdentifier?

    private(set) var selectedIndices: Set<Int> = []
    private(set) var pdfDataForSelection: Data?
    private var pendingFileName: String?

    private let container: ModelContainer

    init(container: ModelContainer) {
        self.container = container
    }

    func handlePickedFile(url: URL) {
        let didAccess = url.startAccessingSecurityScopedResource()
        defer { if didAccess { url.stopAccessingSecurityScopedResource() } }
        do {
            let data = try Data(contentsOf: url)
            try route(fileName: url.lastPathComponent, data: data)
        } catch {
            stage = .error("Couldn't read \(url.lastPathComponent): \(error.localizedDescription)")
        }
    }

    func startPastedText(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        createTextSession(name: Self.deriveName(fromText: trimmed), rawText: trimmed)
    }

    func setSelectedIndices(_ indices: Set<Int>) {
        selectedIndices = indices
    }

    func confirmPageSelection() {
        guard let data = pdfDataForSelection, let fileName = pendingFileName, !selectedIndices.isEmpty else { return }
        createPDFSession(name: Self.deriveName(fromFileName: fileName), fileName: fileName, data: data, indices: selectedIndices.sorted())
    }

    func cancelSelection() {
        pdfDataForSelection = nil
        pendingFileName = nil
        selectedIndices = []
        stage = .idle
    }

    func dismissError() {
        stage = .idle
    }

    private func route(fileName: String, data: Data) throws {
        let isPDF = fileName.lowercased().hasSuffix(".pdf") || UTType(filenameExtension: (fileName as NSString).pathExtension) == .pdf
        if isPDF {
            let pageCount = PDFPageExtractor.pageCount(of: data)
            guard pageCount > 0 else {
                stage = .error("Couldn't read any pages from \(fileName).")
                return
            }
            pdfDataForSelection = data
            pendingFileName = fileName
            selectedIndices = Set(0..<pageCount)
            stage = .selectingPages(fileName: fileName, pageCount: pageCount)
        } else {
            guard let text = String(data: data, encoding: .utf8),
                  !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            else {
                stage = .error("\(fileName) doesn't contain readable text.")
                return
            }
            createTextSession(name: Self.deriveName(fromFileName: fileName), rawText: text)
        }
    }

    private func createPDFSession(name: String, fileName: String, data: Data, indices: [Int]) {
        stage = .creating
        let container = container
        Task {
            do {
                let persistence = PersistenceActor(modelContainer: container)
                let id = try await persistence.createPDFSession(
                    name: name, fileName: fileName, originalDocument: data, selectedPageIndices: indices
                )
                pdfDataForSelection = nil
                pendingFileName = nil
                selectedIndices = []
                stage = .idle
                createdSessionID = id
            } catch {
                stage = .error("Couldn't create session: \(error.localizedDescription)")
            }
        }
    }

    private func createTextSession(name: String, rawText: String) {
        stage = .creating
        let container = container
        Task {
            do {
                let persistence = PersistenceActor(modelContainer: container)
                let id = try await persistence.createTextSession(name: name, rawText: rawText)
                stage = .idle
                createdSessionID = id
            } catch {
                stage = .error("Couldn't create session: \(error.localizedDescription)")
            }
        }
    }

    private static func deriveName(fromFileName fileName: String) -> String {
        (fileName as NSString).deletingPathExtension
    }

    private static func deriveName(fromText text: String) -> String {
        String(text.prefix(50))
    }
}
