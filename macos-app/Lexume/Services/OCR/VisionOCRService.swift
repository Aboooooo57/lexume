import CoreGraphics
import Vision

/// Batch OCR via the Vision framework's VNRecognizeTextRequest — lower-level
/// than VisionKit's Live Text, but built for exactly this: extracting a full
/// page of text rather than driving an interactive selection UI.
struct VisionOCRService: OCRService {
    func recognizeText(in image: CGImage) async throws -> String {
        try await Task.detached(priority: .userInitiated) {
            // No completion handler: it and `perform`'s own throw would both
            // report a failure, resuming a continuation twice (a fatal error).
            // `perform` is synchronous, so read the results straight after it.
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            // Without this, Vision silently defaults to English-only
            // recognition (and English-biased correction), which mangles
            // non-English text (accented characters, ß, etc.) instead of
            // reading it correctly.
            request.automaticallyDetectsLanguage = true

            let handler = VNImageRequestHandler(cgImage: image, options: [:])
            try handler.perform([request])
            let observations = request.results ?? []
            return Self.assembleText(from: observations)
        }.value
    }

    /// Joins recognized lines top-to-bottom, inserting a paragraph break
    /// wherever the vertical gap to the next line is unusually large —
    /// there's no AI available offline to reformat this more intelligently.
    private static func assembleText(from observations: [VNRecognizedTextObservation]) -> String {
        let lines: [(text: String, box: CGRect)] = observations.compactMap { observation in
            guard let candidate = observation.topCandidates(1).first else { return nil }
            return (candidate.string, observation.boundingBox)
        }
        // Vision's boundingBox origin is bottom-left, normalized 0...1; sort top to bottom.
        let sorted = lines.sorted { $0.box.origin.y > $1.box.origin.y }
        guard let first = sorted.first else { return "" }

        var result = first.text
        var previousY = first.box.origin.y
        var previousHeight = first.box.height

        for line in sorted.dropFirst() {
            let gap = previousY - (line.box.origin.y + line.box.height)
            result += gap > previousHeight * 0.6 ? "\n\n" : "\n"
            result += line.text
            previousY = line.box.origin.y
            previousHeight = line.box.height
        }
        return result
    }
}
