import SwiftData
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
            GeneralSettingsTab()
                .tabItem { Label("General", systemImage: "gearshape") }
            BackupSettingsTab()
                .tabItem { Label("Backup", systemImage: "icloud.and.arrow.up") }
        }
        #if os(macOS)
        // Fixed size matching the macOS Preferences-window convention; on
        // iPad this is presented in a sheet, which sizes itself instead.
        .frame(width: 560, height: 420)
        #endif
    }
}

private struct APIKeysSettingsTab: View {
    private let secrets: SecretsStore = KeychainStore()

    @State private var geminiKey = ""
    @State private var elevenKey = ""
    @State private var geminiStatus: APIKeyTestStatus = .idle
    @State private var elevenStatus: APIKeyTestStatus = .idle
    @State private var errorText: String?
    @State private var saveStatusMessage: String?
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
                APIKeyField(
                    title: "Gemini API key",
                    subtitle: "Free at aistudio.google.com/app/apikey",
                    text: $geminiKey,
                    status: geminiStatus,
                    test: {
                        geminiStatus = .testing
                        let r = await KeyValidator.testGeminiKey(geminiKey.trimmingCharacters(in: .whitespacesAndNewlines))
                        geminiStatus = statusFrom(r)
                    }
                )
            } header: {
                Text("Google Gemini")
            } footer: {
                Text("Used for text extraction, key terms, and translation fallback.")
            }

            Section {
                APIKeyField(
                    title: "ElevenLabs API key",
                    subtitle: "elevenlabs.io → Settings → API Keys",
                    text: $elevenKey,
                    status: elevenStatus,
                    test: {
                        elevenStatus = .testing
                        let r = await KeyValidator.testElevenLabsKey(elevenKey.trimmingCharacters(in: .whitespacesAndNewlines))
                        elevenStatus = statusFrom(r)
                    }
                )
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
                if let saveStatusMessage {
                    Text(saveStatusMessage).font(.caption).foregroundStyle(.secondary)
                }
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

    private func statusFrom(_ result: KeyValidator.Result) -> APIKeyTestStatus {
        switch result {
        case .valid: return .ok
        case .invalid(let reason): return .failed(reason)
        }
    }

    private func save() {
        do {
            try secrets.set(geminiKey, for: .geminiAPIKey)
            try secrets.set(elevenKey, for: .elevenLabsAPIKey)
            errorText = nil
            saveStatusMessage = "Saved."
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

    @State private var voices: [Voice] = []
    @State private var isLoadingVoices = false
    @State private var voicesError: String?

    var body: some View {
        Form {
            Section("Gemini") {
                Picker("Extraction model", selection: $geminiModel) {
                    Text("Gemini 3.5 Flash (recommended)").tag("gemini-3.5-flash")
                    Text("Gemini 3.1 Pro").tag("gemini-3.1-pro-preview")
                    Text("Gemini 3.1 Flash Lite").tag("gemini-3.1-flash-lite")
                    Text("Gemini 2.5 Flash").tag("gemini-2.5-flash")
                    Text("Gemini 2.5 Pro").tag("gemini-2.5-pro")
                    Text("Gemini 2.5 Flash Lite").tag("gemini-2.5-flash-lite")
                    Text("Gemini 2.0 Flash").tag("gemini-2.0-flash")
                }
            }
            Section("ElevenLabs") {
                Picker("Voice model", selection: $elevenModel) {
                    Text("Multilingual v2 (recommended)").tag("eleven_multilingual_v2")
                    Text("Turbo v2.5").tag("eleven_turbo_v2_5")
                    Text("Flash v2.5").tag("eleven_flash_v2_5")
                }

                if !voices.isEmpty {
                    Picker("Voice", selection: $voiceID) {
                        ForEach(voices) { voice in
                            Text(voice.name).tag(voice.id)
                        }
                        if !voices.contains(where: { $0.id == voiceID }) {
                            Text("Custom (\(voiceID))").tag(voiceID)
                        }
                    }
                }

                HStack {
                    TextField("Voice ID", text: $voiceID)
                    Button {
                        Task { await loadVoices() }
                    } label: {
                        if isLoadingVoices {
                            ProgressView().controlSize(.small)
                        } else {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                    .disabled(isLoadingVoices)
                    .help("Fetch your ElevenLabs voice library")
                }
                if let voicesError {
                    Text(voicesError).font(.caption).foregroundStyle(.secondary)
                } else {
                    Text("Fetch your voice library above, or paste any voice ID directly (elevenlabs.io/voice-library).")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
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

    private func loadVoices() async {
        isLoadingVoices = true
        voicesError = nil
        defer { isLoadingVoices = false }
        do {
            voices = try await ElevenLabsClient().voices()
        } catch {
            voicesError = error.localizedDescription
        }
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
    @AppStorage(AppSettings.warnBeforeLongPageAudioKey) private var warnBeforeLongPageAudio = true

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
                    ForEach(TargetLanguage.all, id: \.displayName) { language in
                        Text(language.displayName).tag(language.displayName)
                    }
                }
                Picker("Engine", selection: $translationEngine) {
                    Text("Google (fast)").tag("google")
                    Text("Gemini (accurate)").tag("gemini")
                }
            }
            Section {
                Picker("Generate audio", selection: $audioMode) {
                    Text("Automatically per page").tag("auto")
                    Text("Manually (ask me)").tag("manual")
                    Text("Never").tag("off")
                }
                Toggle("Warn before narrating long pages", isOn: $warnBeforeLongPageAudio)
            } header: {
                Text("Narration")
            } footer: {
                Text("Pages over 3,000 characters cost more to narrate with ElevenLabs; Lexume asks first unless you turn this off (or choose \u{201C}Don\u{2019}t Ask Again\u{201D} on that prompt).")
            }
        }
        .formStyle(.grouped)
    }
}

@MainActor
private struct BackupSettingsTab: View {
    @Environment(\.modelContext) private var modelContext

    // Kept Optional and constructed in `.task` rather than
    // `= DriveSyncService()`: a @State property's default-value expression
    // is evaluated in a nonisolated context even though DriveSyncService's
    // initializer is main-actor-isolated (same reasoning documented on
    // DriveSyncService.init's own `auth` parameter).
    @State private var driveSync: DriveSyncService?

    var body: some View {
        Group {
            if let driveSync {
                content(driveSync)
            } else {
                ProgressView()
            }
        }
        .task {
            if driveSync == nil {
                driveSync = DriveSyncService()
            }
        }
    }

    @ViewBuilder
    private func content(_ driveSync: DriveSyncService) -> some View {
        Form {
            Section {
                Label(
                    driveSync.isSignedIn ? "Connected to Google Drive" : "Not connected",
                    systemImage: driveSync.isSignedIn ? "checkmark.icloud" : "icloud.slash"
                )
                .foregroundStyle(.secondary)
                if let lastBackupDate = driveSync.lastBackupDate {
                    Text("Last backup: \(lastBackupDate.formatted(date: .abbreviated, time: .shortened))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if !driveSync.isSignedIn {
                Section {
                    if DriveOAuthConfig.isConfigured {
                        Button("Sign in with Google") {
                            Task { await driveSync.connect() }
                        }
                        .disabled(driveSync.isSyncing)
                    } else {
                        Text("Google Drive backup isn't set up for this build yet.")
                            .foregroundStyle(.secondary)
                    }
                } footer: {
                    Text("A browser tab opens for you to approve access to a private \u{201C}Lexume\u{201D} folder in your Drive \u{2014} Lexume can't see anything else in your Drive.")
                }
            } else {
                Section {
                    Button("Back Up Now") {
                        Task { await driveSync.backupNow(container: modelContext.container) }
                    }
                    .disabled(driveSync.isSyncing)

                    Button("Restore from Drive") {
                        Task { await driveSync.restoreNow(container: modelContext.container) }
                    }
                    .disabled(driveSync.isSyncing)

                    Button("Disconnect", role: .destructive) {
                        driveSync.disconnect()
                    }
                    .disabled(driveSync.isSyncing)
                } header: {
                    Text("Sync")
                } footer: {
                    Text("Backs up every session's text, narration, bookmarks, and vocabulary to a \u{201C}Lexume\u{201D} folder in your Google Drive. Restore adds back any sessions found there that aren't already on this Mac — it never overwrites or deletes local sessions.")
                }
            }

            if driveSync.isSyncing {
                HStack {
                    ProgressView().controlSize(.small)
                    Text(driveSync.statusMessage ?? "Working\u{2026}")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else if let statusMessage = driveSync.statusMessage {
                Text(statusMessage)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
    }
}

private struct GeneralSettingsTab: View {
    @Environment(\.modelContext) private var modelContext

    @State private var isReplayingOnboarding = false
    @State private var isShowingGuidedTour = false
    @State private var isClearCacheConfirming = false
    @State private var isResetConfirming = false
    @State private var statusMessage: String?
    @State private var isClearingCache = false

    var body: some View {
        Form {
            Section {
                Button {
                    isReplayingOnboarding = true
                } label: {
                    Label("Show Welcome Screen Again", systemImage: "sparkles")
                }
                Button {
                    isShowingGuidedTour = true
                } label: {
                    Label("Show Guided Tour Again", systemImage: "questionmark.circle")
                }
            } header: {
                Text("Help")
            } footer: {
                Text("The Welcome Screen replays the first-run introduction to API keys and on-device OCR; the Guided Tour walks through how to use Lexume's reading, lookup, narration, and translation features. Also reachable any time from the Help menu. Your saved keys are not affected by either.")
            }

            Section {
                Button(role: .destructive) {
                    isClearCacheConfirming = true
                } label: {
                    Label("Clear Cached Pages…", systemImage: "arrow.counterclockwise")
                }
                .disabled(isClearingCache)
            } header: {
                Text("Cache")
            } footer: {
                Text("Deletes cached extracted text and audio for every session so pages re-extract next time you read them — useful after switching the OCR engine, Gemini model, or voice settings. Your sessions and library stay intact.")
            }

            Section {
                Button(role: .destructive) {
                    isResetConfirming = true
                } label: {
                    Label("Reset All Settings to Defaults…", systemImage: "arrow.uturn.backward")
                }
            } header: {
                Text("Reset")
            } footer: {
                Text("Restores every preference on the Models & Voice and Reading tabs to its default. Saved API keys are not affected.")
            }

            if let statusMessage {
                Text(statusMessage)
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .sheet(isPresented: $isReplayingOnboarding) {
            OnboardingSheet()
        }
        .sheet(isPresented: $isShowingGuidedTour) {
            GuidedTourSheet()
        }
        .confirmationDialog(
            "Clear all cached pages?",
            isPresented: $isClearCacheConfirming,
            titleVisibility: .visible
        ) {
            Button("Clear Cached Pages", role: .destructive) { clearCache() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Every session will re-extract its text (and re-narrate its audio) the next time you open it.")
        }
        .confirmationDialog(
            "Reset all settings?",
            isPresented: $isResetConfirming,
            titleVisibility: .visible
        ) {
            Button("Reset to Defaults", role: .destructive) { resetSettings() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This resets models, voice tuning, reading appearance, translation, and OCR engine choices. It does not remove your API keys.")
        }
    }

    private func clearCache() {
        isClearingCache = true
        statusMessage = nil
        let container = modelContext.container
        Task {
            do {
                let persistence = PersistenceActor(modelContainer: container)
                try await persistence.clearAllCachedPages()
                statusMessage = "Cache cleared."
            } catch {
                statusMessage = "Couldn't clear cache: \(error.localizedDescription)"
            }
            isClearingCache = false
        }
    }

    private func resetSettings() {
        AppSettings.resetAllToDefaults()
        statusMessage = "Settings reset to defaults."
    }
}
