import Foundation

/// Parses/formats the "1-3,5,7-9" page range syntax used by the PDF page
/// picker. Input is 1-based and inclusive (matching the reference backend);
/// output indices are 0-based, sorted, deduped, and clamped to pageCount.
enum PageRangeParser {
    static func parse(_ text: String, pageCount: Int) -> [Int] {
        guard pageCount > 0 else { return [] }
        var indices = Set<Int>()
        for rawPart in text.split(separator: ",") {
            let part = rawPart.trimmingCharacters(in: .whitespaces)
            guard !part.isEmpty else { continue }
            if let dashIndex = part.firstIndex(of: "-") {
                let startText = part[part.startIndex..<dashIndex].trimmingCharacters(in: .whitespaces)
                let endText = part[part.index(after: dashIndex)...].trimmingCharacters(in: .whitespaces)
                guard let start = Int(startText), let end = Int(endText), start <= end else { continue }
                for page in start...end {
                    let index = page - 1
                    if index >= 0 && index < pageCount { indices.insert(index) }
                }
            } else if let page = Int(part) {
                let index = page - 1
                if index >= 0 && index < pageCount { indices.insert(index) }
            }
        }
        return indices.sorted()
    }

    static func format(_ indices: [Int]) -> String {
        let sorted = indices.sorted()
        guard !sorted.isEmpty else { return "" }

        var groups: [[Int]] = []
        for index in sorted {
            if let lastValue = groups.last?.last, lastValue == index - 1 {
                groups[groups.count - 1].append(index)
            } else {
                groups.append([index])
            }
        }
        return groups.map { group in
            let start = group.first! + 1
            let end = group.last! + 1
            return start == end ? "\(start)" : "\(start)-\(end)"
        }.joined(separator: ",")
    }
}
