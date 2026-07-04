import SwiftUI

/// First-run sheet: collect the two optional API keys, verify them with
/// live "Test" calls, and store them in the Keychain. Without a Gemini key,
/// Lexis still works — it reads PDFs and photos with on-device OCR instead.
struct OnboardingSheet: View {
    @Environment(\.dismiss) private var dismiss

    private let secrets: SecretsStore = KeychainStore()

    @State private var geminiKey = ""
    @State private var elevenKey = ""
    @State private var geminiStatus: TestStatus = .idle
    @State private var elevenStatus: TestStatus = .idle
    @State private var saveError: String?

    enum TestStatus: Equatable {
        case idle, testing, ok
        case failed(String)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Welcome to Lexis")
                    .font(.largeTitle.weight(.semibold))
                Text("Lexis talks directly to Google Gemini (text extraction) and ElevenLabs (narration). Both are optional: without a Gemini key, Lexis reads PDFs and photos with on-device OCR instead — free, offline, no account needed. Keys you do add are stored only in your Mac's Keychain.")
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.bottom, 24)

            keyField(
                title: "Google Gemini API key",
                subtitle: "Free at aistudio.google.com/app/apikey",
                text: $geminiKey,
                status: geminiStatus,
                test: {
                    geminiStatus = .testing
                    let result = await KeyValidator.testGeminiKey(geminiKey.trimmingCharacters(in: .whitespacesAndNewlines))
                    geminiStatus = result == .valid ? .ok : .failed(message(for: result))
                }
            )
            .padding(.bottom, 18)

            keyField(
                title: "ElevenLabs API key",
                subtitle: "elevenlabs.io → Settings → API Keys",
                text: $elevenKey,
                status: elevenStatus,
                test: {
                    elevenStatus = .testing
                    let result = await KeyValidator.testElevenLabsKey(elevenKey.trimmingCharacters(in: .whitespacesAndNewlines))
                    elevenStatus = result == .valid ? .ok : .failed(message(for: result))
                }
            )

            if let saveError {
                Text(saveError)
                    .font(.callout)
                    .foregroundStyle(.red)
                    .padding(.top, 12)
            }

            Spacer(minLength: 24)

            HStack {
                Button("Skip for Now") { dismiss() }
                    .help("You can add keys any time in Settings (⌘,). Reading cached sessions works without keys.")
                Spacer()
                Button("Save & Start") { saveAndClose() }
                    .keyboardShortcut(.defaultAction)
                    .disabled(geminiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        && elevenKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding(28)
        .frame(width: 520, height: 420)
        .onAppear {
            geminiKey = secrets.get(.geminiAPIKey) ?? ""
            elevenKey = secrets.get(.elevenLabsAPIKey) ?? ""
        }
    }

    private func message(for result: KeyValidator.Result) -> String {
        if case .invalid(let reason) = result { return reason }
        return ""
    }

    @ViewBuilder
    private func keyField(
        title: String,
        subtitle: String,
        text: Binding<String>,
        status: TestStatus,
        test: @escaping () async -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.headline)
            HStack(spacing: 8) {
                SecureField("Paste key", text: text)
                    .textFieldStyle(.roundedBorder)
                Button("Test") {
                    Task { await test() }
                }
                .disabled(text.wrappedValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || status == .testing)

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

    private func saveAndClose() {
        do {
            try secrets.set(geminiKey, for: .geminiAPIKey)
            try secrets.set(elevenKey, for: .elevenLabsAPIKey)
            dismiss()
        } catch {
            saveError = "Couldn't save to Keychain: \(error.localizedDescription)"
        }
    }
}
