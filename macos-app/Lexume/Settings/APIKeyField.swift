import SwiftUI

/// Test-result state for an `APIKeyField`.
enum APIKeyTestStatus: Equatable {
    case idle, testing, ok
    case failed(String)
}

/// A titled API-key entry row: rounded-border secure field, inline Test
/// button, and a status icon/caption. Shared by `OnboardingSheet` and
/// `SettingsView` so both present keys the same, bounded way — a bare
/// `SecureField` dropped straight into a `Form` section (as Settings used
/// to do) lets its label and masked dots share one native row with no
/// width constraint, so a full-length key's dots can overflow the row.
struct APIKeyField: View {
    let title: String
    let subtitle: String
    @Binding var text: String
    let status: APIKeyTestStatus
    let test: () async -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.headline)
            HStack(spacing: 8) {
                SecureField("Paste key", text: $text)
                    .textFieldStyle(.roundedBorder)
                Button("Test") {
                    Task { await test() }
                }
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || status == .testing)

                switch status {
                case .idle:
                    EmptyView()
                case .testing:
                    ProgressView().controlSize(.small)
                case .ok:
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                case .failed:
                    Image(systemName: "xmark.circle.fill").foregroundStyle(.red)
                }
            }
            if case .failed(let reason) = status {
                Text(reason).font(.caption).foregroundStyle(.red)
            } else {
                Text(subtitle).font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}
