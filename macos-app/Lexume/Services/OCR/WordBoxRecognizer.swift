import CoreGraphics
import Vision

/// On-device word-level bounding boxes for Original Layout mode — a sibling
/// to `VisionOCRService`, but returning per-word location instead of joined
/// prose, since only Vision (never Gemini) can tell us where a word sits on
/// the page.
enum WordBoxRecognizer {
    static func recognizeWordBoxes(in image: CGImage) async throws -> [WordBox] {
        try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
                continuation.resume(returning: Self.wordBoxes(from: observations))
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            // See VisionOCRService - without this, non-English text is
            // recognized against an English-only language model by default.
            request.automaticallyDetectsLanguage = true

            let handler = VNImageRequestHandler(cgImage: image, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
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
