# Lexume for Android — native Kotlin/Compose app

A native Android rewrite of Lexume, matching the Mac/iPad apps' identity —
not a port (Android shares no code with the Swift codebase) and not a
wrapper around the separate web app (`../backend/` + `../frontend/`).
**Zero dependency on the web project or any Lexume-run server**: the app
talks directly to Google Gemini (text extraction), ElevenLabs (narration
with word timestamps), dictionaryapi.dev (dictionary), and Google Translate —
using your own API keys, stored securely on-device. Optional on-device OCR
(ML Kit) lets it work fully offline for PDFs/photos with no Gemini key, same
as the Mac app's Vision-framework fallback.

See the plan this was built from for the full architecture rationale
(build-approach and backend-strategy decisions, tech stack research, and the
milestone breakdown below) — this README tracks *build* status; the plan
carries the *why*.

## Requirements

- Android Studio (current stable) with an Android SDK installed — this
  project is scaffolded/coded in a sandbox with no Android SDK and no access
  to Google's Maven repo (`dl.google.com`), so nothing past M1 has been
  built there yet. M1 itself is confirmed working (builds and runs on a real
  device) as of this note; treat every later milestone the same way until
  you've built and run it — same role the first Xcode build played for the
  Mac app, just repeated per milestone here.
- If Gradle can't find a matching JDK (`Cannot find a Java installation...`),
  set **Gradle JDK** to a bundled JBR ≤24 in Android Studio's Settings →
  Build, Execution, Deployment → Build Tools → Gradle — Gradle 8.14.3
  doesn't support JDK 25+ yet. `kotlin { jvmToolchain(17) }`
  (`app/build.gradle.kts`) plus the Foojay resolver plugin
  (`settings.gradle.kts`) handle the rest automatically.
- Min SDK 26 (Android 8.0+), compile/target SDK 35.
- A Google Gemini API key (free, optional): https://aistudio.google.com/app/apikey
- An ElevenLabs API key (optional, needed for narration): https://elevenlabs.io/app/settings/api-keys

## Build & run

1. Open `android-app/` in Android Studio (File → Open, point at this folder).
2. Let Gradle sync — this resolves the Android Gradle Plugin, Kotlin, and
   Compose from Google's/Maven Central's repos, none of which this sandbox
   could reach, so this sync is the first time any of it has actually been
   fetched and checked.
3. Run ▶ on a device or emulator (API 26+).
4. Report back anything that fails to sync/build/run — same process used for
   every Xcode build issue on the Mac/iPad apps.

## Milestone status

| # | Milestone | Status |
|---|---|---|
| 1 | Project scaffold (Gradle, Compose, nav stub) | ✅ confirmed — builds and runs on-device |
| 2 | Room data layer | 🚧 code written, verify with a real build |
| 3 | Settings & secure key storage | 🚧 code written, verify with a real build |
| 4 | Import & extraction | 🚧 code written, verify with a real build |
| 5 | Reader, Phase 1 (reflowed text) | 🚧 code written, verify with a real build |
| 6 | Dictionary & translation | 🚧 code written, verify with a real build |
| 7 | Narration | ⬜ not started |
| 8 | Library, Vocabulary, Bookmarks | ⬜ not started |
| 9 | Google Drive backup/restore | ⬜ not started |
| 10 | Distribution (direct APK, then Play Store) | ⬜ not started |
| 11 | Polish (guided tour, offline banner, real icon) | ⬜ not started |

## M1 acceptance checklist

- [ ] `android-app/` opens in Android Studio and Gradle sync succeeds (the
      one thing this sandbox couldn't verify — no Android SDK, and
      `dl.google.com` is blocked here, so AGP/Compose/etc. were never
      actually resolved before now).
- [ ] App builds and runs on a device/emulator, showing a plain "Lexume"
      placeholder screen (`ScaffoldPlaceholder` in `LexumeNavHost.kt`) — not
      a real Library yet, just confirmation the scaffold is sound.
- [ ] App icon shows correctly (a plain "L" monogram placeholder for now —
      real branding is M11's job).

## M2 acceptance checklist

- [ ] Gradle sync succeeds after pulling this milestone (Room + KSP newly
      wired into `app/build.gradle.kts`).
- [ ] App still builds and runs, showing the same M1 placeholder screen —
      M2 adds a data layer with nothing wired to the UI yet, so there's no
      new visible behavior to check, just confirm nothing broke.
- [ ] (Optional, for anyone poking at internals) `Room.databaseBuilder(...)`
      in `LexumeDatabase.kt` should create `lexume.db` on first access via
      `LexumeApplication.database` — no UI hits this yet, so there's nothing
      to click; a debugger/log statement would be the only way to observe
      it right now.

## M3 acceptance checklist

- [ ] Gradle sync succeeds after pulling this milestone (DataStore newly
      wired into `app/build.gradle.kts`; no other new dependencies).
- [ ] First launch after a fresh install shows the onboarding screen
      (`OnboardingScreen.kt`) automatically, on top of the M1 placeholder —
      welcome text, Gemini/ElevenLabs key fields with working "Test" buttons,
      and a target-language picker.
- [ ] "Save & Start" (enabled once at least one key field is non-blank)
      saves the keys and returns to the placeholder screen; relaunching the
      app does **not** show onboarding again.
- [ ] "Skip for Now" returns to the placeholder screen too, but relaunching
      the app **does** show onboarding again (matches `OnboardingSheet.swift`
      exactly — only "Don't Show Again"/"Save & Start" set the dismissed
      flag).
- [ ] The gear icon in the placeholder screen's top bar opens Settings
      (`SettingsScreen.kt`) with 4 tabs: API Keys, Models & Voice, Reading,
      General.
- [ ] API Keys tab: previously-saved keys reappear (round-trip through
      `SecureKeyStore`'s Keystore-backed encryption), "Test" buttons work,
      "Save" persists changes.
- [ ] Models & Voice tab: Gemini/ElevenLabs model dropdowns and the 4 voice
      tuning sliders persist across app restarts (DataStore-backed).
- [ ] Reading tab: theme/font/font-size, target language, translation
      engine, and audio-mode controls all persist across restarts.
- [ ] General tab: "Show Welcome Screen Again" re-opens onboarding; "Clear
      Cached Pages…" and "Reset All Settings to Defaults…" each show a
      confirmation dialog before acting.
- [ ] (No build-breaking regression check) App still builds and runs even
      though the Library/Reader screens themselves haven't changed — this
      milestone's visible surface is entirely onboarding + Settings.

## M4 acceptance checklist

M4 has no real Library (M8) yet, so it's exercised entirely from the two new
icons in the placeholder screen's top bar (next to the Settings gear) — a
paste-clipboard icon and an upload-file icon. As of M5, the "Imported"
result dialog's "Read Now" button opens the new reader on the freshly
created session.

- [ ] Gradle sync succeeds after pulling this milestone (ML Kit + OkHttp
      newly wired into `app/build.gradle.kts`).
- [ ] **Paste Text**: tapping the clipboard icon opens a dialog with a
      multi-line field; "Create Session" is disabled until you type
      something. Confirming shows a "Creating session…" dialog, then
      "Extracting…", then either "Imported" (with the extracted title) or an
      error - this exercises `reformat()` (Gemini if a key is set in
      Settings, otherwise pass-through since there's no AI to reformat with
      offline).
- [ ] **Open File → image** (JPEG/PNG/HEIC/HEIF): same Creating → Extracting
      → Imported/error flow, this time exercising `extractImage()` - with a
      Gemini key set, real OCR/cleanup; without one, ML Kit on-device OCR.
- [ ] **Open File → plain text/.md**: same flow as Paste Text, reading the
      file's contents directly.
- [ ] **Open File → PDF**: opens the "Choose Pages" screen instead - a
      thumbnail grid (all pages selected by default), a "1-3,5"-style range
      field with an Apply button, Select All/Clear, and a live "N of M pages
      selected" count. Thumbnails render lazily (a spinner while each one is
      still being rasterized). "Start Reading" (disabled with nothing
      selected) creates the session from just the selected pages, then runs
      the same Creating → Extracting → Imported/error flow on the first
      selected page specifically (rendered via `PdfRenderer`, then routed
      through the same `extractImage()` path as a standalone image - see
      `ExtractionService.kt`'s doc comment for why there's no separate
      single-page-PDF-upload path the way the Mac app has).
- [ ] Without a Gemini key configured (Settings → API Keys), every import
      above still works end-to-end via on-device ML Kit OCR (image/PDF
      sources) or verbatim pass-through (text sources) - confirms the
      no-key/offline path, not just the Gemini path.
- [ ] Cancelling the page selector (system back or tapping outside the
      dialog) discards the pending PDF and returns cleanly to the
      placeholder screen - no partial session should be created.

## M5 acceptance checklist

Reached via "Read Now" on a successful import's result dialog (M4).

- [ ] Gradle sync succeeds after pulling this milestone (no new
      dependencies - M5 is pure Compose UI over M2-M4's existing layers).
- [ ] The reader opens showing the session's title (if any) and its
      paragraphs, with a back arrow (top-left) and a focus-mode icon
      (top-right).
- [ ] **Tap-to-define**: tapping any word shows a dialog with that exact
      word (tapping whitespace/punctuation between words does nothing) -
      confirms the `BreakIterator` word hit-testing works; the dialog itself
      is a placeholder ("Dictionary lookup arrives in M6"), not a real
      lookup yet.
- [ ] **Bookmarks**: the bookmark icon next to each paragraph toggles
      filled/outline immediately (optimistic update) and persists - leaving
      and reopening the reader (or the app) keeps bookmarked paragraphs
      marked.
- [ ] **Page navigation**: the bottom pager's ◀/▶ buttons move between
      pages (disabled at the first/last page), each triggering its own
      Extracting-if-needed → display cycle; "Page N of M" updates
      correctly. Revisiting an already-extracted page is instant (cache
      hit, no re-extraction).
- [ ] **Focus mode**: the top-right icon hides the top bar and pager,
      leaving just the text and a small ✕ in the corner to exit.
- [ ] **Reading appearance** (Settings → Reading, from M3): changing
      theme/font/font-size there and returning to an open reader screen
      updates its appearance live (all three are collected as State, no
      re-open needed). Try all 4 themes (System/Light/Dark/Sepia) and all
      3 fonts (Sans/Serif/Mono).
- [ ] A page that fails to extract (e.g. no Gemini key and unsupported
      script, or a network error) shows an error message with a Retry
      button instead of the paragraph list.

## M6 acceptance checklist

Reached by tapping any word in the reader (opens the real dictionary now,
replacing M5's placeholder), plus a new translate icon on each paragraph.

- [ ] Gradle sync succeeds after pulling this milestone (ML Kit Language
      Identification newly wired into `app/build.gradle.kts`).
- [ ] Tapping a common English word opens a bottom sheet: breadcrumb bar
      (back arrow / word chips / reset / close), the word with its
      phonetic spelling (if the API has one) and a speaker icon, a
      "Translate" link under the word, then numbered definitions grouped
      under part-of-speech pills, with synonym chips at the bottom of any
      meaning that has them.
- [ ] Tapping any word *inside* a definition or example (not just the
      original paragraph) looks that word up too, pushing it onto the
      breadcrumb - confirms `ParagraphText`'s tap-to-define is genuinely
      reused inside the dictionary, not just the reader.
- [ ] Tapping a synonym chip looks it up the same way.
- [ ] Breadcrumb: back arrow steps back one lookup, tapping any earlier
      chip jumps straight to it (trimming everything after), the reset
      icon (↺) collapses back to the very first word looked up this
      session, close (✕) dismisses the sheet.
- [ ] Speaker icon: for a word with a recorded pronunciation clip, plays
      it; for one without (common - the free API's audio coverage is
      inconsistent), speaks it on-device instead (confirms
      `PronunciationService`'s ML Kit language-ID + TextToSpeech fallback
      works, and picks a non-English voice for a non-English word).
- [ ] "Translate" under the headword (and under any definition/example)
      fetches a translation into Settings → Reading's configured target
      language and shows it below, right-aligned for an RTL language
      (Persian/Arabic/Hebrew/Urdu/Pashto/Kurdish) - try both an LTR and
      an RTL target language.
- [ ] Looking up a word with no dictionary entry (e.g. a made-up string)
      shows "No definition found" - and, with a Gemini key configured,
      try a non-English word from a non-English source document to
      confirm the Gemini fallback (`FallbackDictionaryClient`) kicks in
      where the free English-only API has nothing.
- [ ] **Reader paragraph translate**: the new globe icon next to each
      paragraph's bookmark button translates that whole paragraph in
      place (shown indented below it, RTL-aware same as above); tapping
      it again while already translated does nothing (disabled once
      translated, matching the dictionary's own translate-once behavior).

## Known placeholders (intentional, not bugs)

- The launcher icon (`res/drawable/ic_launcher_*.xml`) is a flat-color
  background + a plain "L" monogram, generated as vector XML since this
  sandbox has no image-resizing tooling (no ImageMagick/PIL) to produce a
  proper multi-density PNG set from the Mac app's real icon. Works correctly
  as an adaptive icon (min SDK 26 already requires API 26+, so no legacy
  density fallback is needed), just not final branding — swap in M11.
- Material color palette (`ui/theme/Color.kt`) is a placeholder tonal scheme,
  not the app's real brand colors.
- `gradle/libs.versions.toml` dependency versions were current as of this
  milestone's research (Aug 2026) but **never actually resolved** in this
  sandbox (Google's Maven is unreachable here) — Android Studio's dependency
  upgrade prompts on first sync are the real check; bump anything it flags.
- Retrofit, Media3, and Credential Manager/Play Services Auth are all already
  declared in `gradle/libs.versions.toml` (so the whole planned stack is
  visible in one place) but deliberately **not yet added to
  `app/build.gradle.kts`'s dependencies** — each gets wired in during the
  milestone that first uses it, not pulled in unused ahead of time. Room
  (M2), DataStore (M3), and ML Kit/OkHttp (M4) are the ones actually wired
  in so far.
- There is no `ocrEngine` setting/picker on the API Keys tab, unlike the Mac
  app — Android's on-device OCR (M4) uses only ML Kit's Latin-script
  recognizer so far, so there's nothing to choose between yet.
  Chinese/Japanese/Korean/Devanagari need their own ML Kit model artifacts,
  not wired in yet; a configured Gemini key covers those scripts in the
  meantime.
- The "fetch my ElevenLabs voice library" button (Mac app's Models tab) isn't
  on the Models & Voice tab yet — it needs a working `ElevenLabsClient`,
  which arrives in M7. Voice ID is a plain paste-in text field for now.
- There's no Original Layout mode (the Mac app's page-image + tap-exact-word
  view) - same Phase 2 deferral the plan always called for; PDF/image
  sessions read as reflowed text only for now.
- The reader has no narration/player bar yet (M7) - tapping the dictionary's
  speaker icon still works (on-device `PronunciationService`, or the free
  API's own clip when it has one), that's independent of full page
  narration.
- "Key terms" (the Mac app's Gemini-suggested dictionary-worthy-word chips
  under each paragraph) isn't ported and isn't currently planned - it's a
  nice-to-have AI suggestion layered on top of the dictionary/translate
  primitives M6 actually builds, not part of the plan's own M6 scope.
  Revisit if it turns out to matter.
- `DictionaryCache`/in-flight dedup is per-process only (an in-memory map,
  cleared on app restart) - matches `FreeDictionaryClient.swift`'s own
  `DictionaryCache` actor exactly, not a shortcut specific to Android.
- The PDF page selector has no "Zoom In" affordance (the Mac app's version
  does, via right-click) - Android has no equivalent convention, and the
  grid thumbnails are already reasonably legible without one; revisit if
  that turns out wrong on a real device.

## Distribution

Direct APK first (self-signed/ad-hoc, matching the Mac DMG's philosophy —
users enable "install unknown apps" once, no store review), a Google Play
Store listing later as an explicit separate step (needs a one-time $25
developer account + a data-safety form + target-API-level compliance). See
M10 above.
