import CoreGraphics
import Vision

/// On-device word-level bounding boxes for Original Layout mode — a sibling
/// to `VisionOCRService`, but returning per-word location instead of joined
/// prose, since only Vision (never Gemini) can tell us where a word sits on
/// the page.
/// Runs Vision text recognition one request at a time. Two concurrent
/// `.accurate` requests (e.g. the visible page plus a background prefetch) make
/// the Neural Engine fail with an `e5rt` error, so every OCR call in the app
/// goes through this single queue. A failed request is retried once, then
/// retried at `.fast` accuracy, before the error is surfaced.
actor VisionGate {
    static let shared = VisionGate()

    func run<T: Sendable>(
        image: CGImage,
        _ transform: @Sendable ([VNRecognizedTextObservation]) -> T
    ) async throws -> T {
        func attempt(_ level: VNRequestTextRecognitionLevel) throws -> T {
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = level
            request.usesLanguageCorrection = level == .accurate
            // Without this, non-English text is recognized against an
            // English-only language model by default.
            request.automaticallyDetectsLanguage = true
            try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
            return transform(request.results ?? [])
        }
        do {
            return try attempt(.accurate)
        } catch {
            try? await Task.sleep(nanoseconds: 400_000_000)
            do { return try attempt(.accurate) } catch { return try attempt(.fast) }
        }
    }
}

enum WordBoxRecognizer {
    static func recognizeWordBoxes(in image: CGImage) async throws -> [WordBox] {
        try await VisionGate.shared.run(image: image) { Self.wordBoxes(from: $0) }
    }

    private static func wordBoxes(from observations: [VNRecognizedTextObservation]) -> [WordBox] {
        var boxes: [WordBox] = []
        for observation in observations {
            guard let candidate = observation.topCandidates(1).first else { continue }
            let string = candidate.string
            string.enumerateSubstrings(in: string.startIndex..<string.endIndex, options: .byWords) { word, wordRange, _, _ in
                guard let word, !word.isEmpty,
                      let rectangleObservation = try? candidate.boundingBox(for: wordRange)
                else { return }
                boxes.append(WordBox(word: word, boundingBox: rectangleObservation.boundingBox))
            }
        }
        return boxes
    }
}
