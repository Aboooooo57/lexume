import SwiftUI

struct SettingsView: View {
    var body: some View {
        TabView {
            APIKeysSettingsTab()
                .tabItem { Label("API Keys", systemImage: "key") }
            ModelsSettingsTab()
                .tabItem { Label("Models & Voice", systemImage: "waveform") }
            ReadingSettingsTab()
                .tabItem { Label("Reading", systemImage: "textformat.size") }
        }
        .frame(width: 560, height: 400)
    }
}

private struct APIKeysSettingsTab: View {
    private let secrets: SecretsStore = KeychainStore()

    @State private var geminiKey = ""
    @State private var elevenKey = ""
    @State private var geminiStatus = ""
    @State private var elevenStatus = ""
    @State private var errorText: String?
    @State private var hasGeminiKeySaved = false

    @AppStorage(AppSettings.ocrEngineKey) private var ocrEngineRaw = AppSettings.defaultOCREngine

    var body: some View {
        Form {
            Section {
                Label(
                    hasGeminiKeySaved ? "Currently reading with: Google Gemini" : "Currently reading with: On-device OCR (no key needed)",
                    systemImage: hasGeminiKeySaved ? "sparkles" : "text.viewfinder"
                )
                .foregroundStyle(.secondary)
            }

            Section {
                SecureField("Gemini API key", text: $geminiKey)
                HStack {
                    Button("Test") {
                        geminiStatus = "Testing…"
                        Task {
                            let r = await KeyValidator.testGeminiKey(geminiKey.trimmingCharacters(in: .whitespacesAndNewlines))
                            geminiStatus = statusText(r)
                        }
                    }
                    .disabled(geminiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    Text(geminiStatus).font(.caption).foregroundStyle(.secondary)
                }
            } header: {
                Text("Google Gemini")
            } footer: {
                Text("Used for text extraction, key terms, and translation fallback. Get one free at aistudio.google.com/app/apikey.")
            }

            Section {
                SecureField("ElevenLabs API key", text: $elevenKey)
                HStack {
                    Button("Test") {
                        elevenStatus = "Testing…"
                        Task {
                            let r = await KeyValidator.testElevenLabsKey(elevenKey.trimmingCharacters(in: .whitespacesAndNewlines))
                            elevenStatus = statusText(r)
                        }
                    }
                    .disabled(elevenKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    Text(elevenStatus).font(.caption).foregroundStyle(.secondary)
                }
            } header: {
                Text("ElevenLabs")
            } footer: {
                Text("Used for narration audio. Keys are stored only in your Mac's Keychain.")
            }

            Section {
                Picker("OCR engine", selection: $ocrEngineRaw) {
                    ForEach(OCREngine.allCases, id: \.rawValue) { engine in
                        Text(engine.displayName).tag(engine.rawValue)
                    }
                }
            } header: {
                Text("On-Device OCR")
            } footer: {
                Text("Used automatically in place of Gemini whenever no Gemini key is set — reads PDFs and photos for free, entirely on your Mac. Switch engines to compare results; re-import or re-generate a page to see the new engine's output (cached pages don't re-run automatically).")
            }

            if let errorText {
                Text(errorText).foregroundStyle(.red).font(.callout)
            }

            HStack {
                Spacer()
                Button("Save") { save() }
                    .keyboardShortcut(.defaultAction)
            }
        }
        .formStyle(.grouped)
        .onAppear {
            geminiKey = secrets.get(.geminiAPIKey) ?? ""
            elevenKey = secrets.get(.elevenLabsAPIKey) ?? ""
            hasGeminiKeySaved = !geminiKey.isEmpty
        }
    }

    private func statusText(_ result: KeyValidator.Result) -> String {
        switch result {
        case .valid: return "✓ Key works"
        case .invalid(let reason): return reason
        }
    }

    private func save() {
        do {
            try secrets.set(geminiKey, for: .geminiAPIKey)
            try secrets.set(elevenKey, for: .elevenLabsAPIKey)
            errorText = nil
            geminiStatus = "Saved"
            elevenStatus = "Saved"
            hasGeminiKeySaved = !geminiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        } catch {
            errorText = "Couldn't save to Keychain: \(error.localizedDescription)"
        }
    }
}

private struct ModelsSettingsTab: View {
    @AppStorage(AppSettings.geminiModelKey) private var geminiModel = AppSettings.defaultGeminiModel
    @AppStorage(AppSettings.elevenModelKey) private var elevenModel = AppSettings.defaultElevenModel
    @AppStorage(AppSettings.voiceIDKey) private var voiceID = AppSettings.defaultVoiceID
    @AppStorage(AppSettings.stabilityKey) private var stability = 0.5
    @AppStorage(AppSettings.similarityBoostKey) private var similarityBoost = 0.75
    @AppStorage(AppSettings.styleKey) private var style = 0.0
    @AppStorage(AppSettings.speedKey) private var speed = 1.0

    var body: some View {
        Form {
            Section("Gemini") {
                Picker("Extraction model", selection: $geminiModel) {
                    Text("Gemini 2.0 Flash (recommended)").tag("gemini-2.0-flash")
                    Text("Gemini 2.5 Flash").tag("gemini-2.5-flash")
                    Text("Gemini 2.5 Pro").tag("gemini-2.5-pro")
                    Text("Gemini 2.5 Flash Lite").tag("gemini-2.5-flash-lite")
                }
            }
            Section("ElevenLabs") {
                Picker("Voice model", selection: $elevenModel) {
                    Text("Multilingual v2 (recommended)").tag("eleven_multilingual_v2")
                    Text("Turbo v2.5").tag("eleven_turbo_v2_5")
                    Text("Flash v2.5").tag("eleven_flash_v2_5")
                }
                TextField("Voice ID", text: $voiceID)
                    .help("Browse voices at elevenlabs.io/voice-library and paste the voice ID. A voice picker arrives in a later milestone.")
            }
            Section("Voice tuning") {
                LabeledSlider(label: "Stability", value: $stability, range: 0...1)
                LabeledSlider(label: "Similarity", value: $similarityBoost, range: 0...1)
                LabeledSlider(label: "Style", value: $style, range: 0...1)
                LabeledSlider(label: "Speed", value: $speed, range: 0.5...2)
            }
        }
        .formStyle(.grouped)
    }
}

private struct LabeledSlider: View {
    let label: String
    @Binding var value: Double
    let range: ClosedRange<Double>

    var body: some View {
        HStack {
            Text(label)
            Slider(value: $value, in: range)
            Text(value, format: .number.precision(.fractionLength(2)))
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 36, alignment: .trailing)
        }
    }
}

private struct ReadingSettingsTab: View {
    @AppStorage(AppSettings.readingThemeKey) private var readingTheme = "system"
    @AppStorage(AppSettings.fontFamilyKey) private var fontFamily = "sans"
    @AppStorage(AppSettings.fontSizeKey) private var fontSize = 18.0
    @AppStorage(AppSettings.targetLanguageKey) private var targetLanguage = "Persian"
    @AppStorage(AppSettings.translationEngineKey) private var translationEngine = "google"
    @AppStorage(AppSettings.audioModeKey) private var audioMode = "manual"

    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Reading theme", selection: $readingTheme) {
                    Text("System").tag("system")
                    Text("Light").tag("light")
                    Text("Dark").tag("dark")
                    Text("Sepia").tag("sepia")
                }
                Picker("Font", selection: $fontFamily) {
                    Text("Sans-serif").tag("sans")
                    Text("Serif").tag("serif")
                    Text("Monospace").tag("mono")
                }
                HStack {
                    Text("Font size")
                    Slider(value: $fontSize, in: 12...42, step: 1)
                    Text("\(Int(fontSize)) pt")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                        .frame(width: 44, alignment: .trailing)
                }
            }
            Section("Translation") {
                Picker("Target language", selection: $targetLanguage) {
                    ForEach(
                        ["Persian", "Spanish", "French", "German", "Chinese",
                         "Japanese", "Russian", "Arabic", "Turkish", "Italian"],
                        id: \.self
                    ) { Text($0).tag($0) }
                }
                Picker("Engine", selection: $translationEngine) {
                    Text("Google (fast)").tag("google")
                    Text("Gemini (accurate)").tag("gemini")
                }
            }
            Section("Narration") {
                Picker("Generate audio", selection: $audioMode) {
                    Text("Automatically per page").tag("auto")
                    Text("Manually (ask me)").tag("manual")
                    Text("Never").tag("off")
                }
            }
        }
        .formStyle(.grouped)
    }
}
