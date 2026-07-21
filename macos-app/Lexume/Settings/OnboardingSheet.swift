import SwiftUI

/// First-run sheet: collect the two optional API keys (verified with live
/// "Test" calls, stored in the Keychain) and the preferred translation
/// language. Without a Gemini key, Lexume still works — it reads PDFs and
/// photos with on-device OCR instead.
struct OnboardingSheet: View {
    @Environment(\.dismiss) private var dismiss

    private let secrets: SecretsStore = KeychainStore()

    @State private var geminiKey = ""
    @State private var elevenKey = ""
    @State private var geminiStatus: APIKeyTestStatus = .idle
    @State private var elevenStatus: APIKeyTestStatus = .idle
    @State private var saveError: String?

    // Written straight to UserDefaults as the user picks, so the choice
    // sticks even through "Skip for Now" — same key Settings → Reading uses.
    @AppStorage(AppSettings.targetLanguageKey) private var targetLanguage = "Persian"
    @AppStorage(AppSettings.hasDismissedOnboardingKey) private var hasDismissedOnboarding = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Welcome to Lexume")
                    .font(.largeTitle.weight(.semibold))
                Text("Lexume talks directly to Google Gemini (text extraction) and ElevenLabs (narration). Both are optional: without a Gemini key, Lexume reads PDFs and photos with on-device OCR instead — free, offline, no account needed. Keys you do add are stored only in your Mac's Keychain.")
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.bottom, 24)

            APIKeyField(
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

            APIKeyField(
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

            Divider()
                .padding(.vertical, 16)

            VStack(alignment: .leading, spacing: 6) {
                Text("Translation language").font(.headline)
                Picker("Translation language", selection: $targetLanguage) {
                    ForEach(TargetLanguage.all, id: \.displayName) { language in
                        Text(language.displayName).tag(language.displayName)
                    }
                }
                .labelsHidden()
                .frame(width: 240, alignment: .leading)
                Text("Word lookups and paragraph translations use this language. Change it any time in Settings → Reading.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if let saveError {
                Text(saveError)
                    .font(.callout)
                    .foregroundStyle(.red)
                    .padding(.top, 12)
            }

            Spacer(minLength: 24)

            HStack {
                Button("Don't Show Again") {
                    hasDismissedOnboarding = true
                    dismiss()
                }
                .help("Won't open automatically again — reopen any time from Settings → General → Show Welcome Screen Again.")

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
        .frame(width: 520, height: 500)
        .onAppear {
            geminiKey = secrets.get(.geminiAPIKey) ?? ""
            elevenKey = secrets.get(.elevenLabsAPIKey) ?? ""
        }
    }

    private func message(for result: KeyValidator.Result) -> String {
        if case .invalid(let reason) = result { return reason }
        return ""
    }

    private func saveAndClose() {
        do {
            try secrets.set(geminiKey, for: .geminiAPIKey)
            try secrets.set(elevenKey, for: .elevenLabsAPIKey)
            // Completing setup - even with just one of the two optional
            // keys - shouldn't keep re-prompting on every launch just
            // because the other key was left blank.
            hasDismissedOnboarding = true
            dismiss()
        } catch {
            saveError = "Couldn't save to Keychain: \(error.localizedDescription)"
        }
    }
}
