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
- Min SDK 26 (Android 8.0+), compile/target SDK 36 (bumped from 35 after
  M7's Media3 1.11.0 turned out to require compiling against API 36+ - an
  "AAR metadata check" Gradle error caught this on a real build). Install
  the Android 16 (API 36) SDK Platform via Android Studio's SDK Manager if
  sync fails with an unresolved `android-36` target.
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
| 7 | Narration | 🚧 code written, verify with a real build |
| 8 | Library, Vocabulary, Bookmarks | 🚧 code written, verify with a real build |
| 9 | Google Drive backup/restore | 🚧 code written, verify with a real build |
| 10 | Distribution (direct APK, then Play Store) | 🚧 code written, verify with a real build |
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

## M7 acceptance checklist

Reached automatically when opening a session in the reader, once an
ElevenLabs key is configured (Settings → API Keys) and Settings → Reading →
Narration's "Generate audio" isn't set to "Never".

- [ ] Gradle sync succeeds after pulling this milestone (Media3
      ExoPlayer/common newly wired into `app/build.gradle.kts`).
- [ ] With "Generate audio" set to "Manually (ask me)" (the default): a
      "Generate Audio" button appears below the reader; tapping it shows
      "Generating narration…" then real playback controls (progress
      slider, restart, ±15s, play/pause, elapsed/remaining time).
- [ ] With "Generate audio" set to "Automatically per page": opening a
      page starts generating (and, once ready, playing) its narration
      with no button tap needed.
- [ ] **Long-page confirmation**: import/open a page over ~3,000
      characters with "Warn before narrating long pages" on (Settings →
      Reading) - tapping "Generate Audio" shows a cost-estimate
      confirmation dialog first. "Don't Ask Again" both generates this
      once *and* flips that setting off for next time (confirm in
      Settings).
- [ ] **Karaoke highlighting**: while playing, the currently-spoken word
      gets a background highlight and words already spoken so far in that
      paragraph dim, live, in sync with playback - confirms
      `TokenMap`/`PlaybackEngine`'s ~50ms tick loop and `ParagraphText`'s
      new `AnnotatedString` rendering both work.
- [ ] Dragging the progress slider seeks playback and updates the
      highlighted word immediately.
- [ ] Restart (↺) and ±15s controls work; pausing and resuming preserves
      position.
- [ ] **Auto-advance**: with a multi-page session and audio playing, let
      a page's narration play all the way to the end without touching
      anything - it should automatically load and *start playing* the
      next page's narration with no interaction needed
      (`PlaybackEngine.onFinished` → `ReaderViewModel.goToPage(...,
      autoPlay = true)`).
- [ ] Backgrounding the app (or navigating back out of the reader) mid-
      playback and reopening the same session resumes from close to where
      you left off (position persisted on pause / periodically / on
      screen exit).
- [ ] **Settings → Models & Voice**: the new refresh icon next to Voice ID
      fetches your real ElevenLabs voice library and turns the field into
      a picker by name; without a key (or on failure) it shows an error
      caption instead and the plain paste-in field still works.
- [ ] Setting "Generate audio" to "Never" hides narration entirely, even
      after previously generating audio for a page.

## M8 acceptance checklist

Reached from the app's home screen, which now has a bottom navigation bar
(Library / Vocabulary / Bookmarks — the Android analog of the Mac/iPad
sidebar's `SidebarItem`s) replacing M1's plain placeholder screen entirely.

- [ ] Gradle sync succeeds after pulling this milestone (no new
      dependencies — M8 is pure Compose UI + Room queries over M1-M7's
      existing layers).
- [ ] **Library tab**: shows a grid of session cards (source-type icon,
      name, created date, page count, and — once present — bookmark/
      vocabulary counts); empty state shows the "Read anything, learn
      every word" prompt with Open File/Paste Text buttons (same import
      flow M4 already exercised, now living here instead of the old
      placeholder).
  - [ ] The search field (visible once you have ≥1 session) filters the
        grid live by name; a "no sessions match" message shows for a
        query with no hits.
  - [ ] Each card's "⋮" menu offers Rename… (a dialog, pre-filled with the
        current name; saving with a blank/whitespace-only name is a
        no-op, matching `LibraryView.swift`) and Delete… (a confirmation
        dialog; confirming removes the session — and, via cascade delete,
        its pages/bookmarks/vocabulary — from the grid immediately).
  - [ ] Tapping a card opens that session in the reader (M5).
- [ ] **Vocabulary tab**: every word you've looked up (M6) appears here,
      grouped into a collapsed-by-default tree — one node per session,
      most recently active session on top, words within a session ordered
      oldest-first (the order you met them).
  - [ ] Tapping a group header's row toggles it open/closed; the
        chevron rotates. Tapping the group's open-in-new icon jumps
        straight to that session in the reader instead.
  - [ ] Typing in the search field filters by word and forces every
        surviving group open (matching `VocabularyListView.swift`'s
        search-forces-open behavior); clearing it collapses everything
        again.
  - [ ] The export icon (top bar) is disabled with zero vocabulary,
        otherwise opens Android's document-creation picker
        (`ACTION_CREATE_DOCUMENT`) — the Android analog of the Mac app's
        `NSSavePanel`/iOS's `.fileExporter` — and writes a CSV with header
        `word,date,session,definition`, one row per *currently filtered*
        word (search first, export second, same as Swift).
- [ ] **Bookmarks tab**: every bookmarked paragraph (M5) appears here,
      newest first, each row showing the paragraph text (4-line clamp),
      source session name, and date; search filters by paragraph text.
      Tapping a row jumps to that session in the reader (not a specific
      scroll position within it, matching `BookmarksListView.swift`).
- [ ] Deleting a session (Library tab) makes its rows disappear from both
      the Vocabulary and Bookmarks tabs too (cascade delete propagating
      through the same `observe*()` flows all three tabs share).

## Setting up Google Drive backup (M9)

Lexume can mirror every session (extracted text, narration audio, word
timings, bookmarks, vocabulary) to a **"Lexume" folder in your own Google
Drive**, so you can restore your library on another device - or read the
same library from both this app and the Mac/iPad apps, since the backup
JSON format is deliberately byte-for-byte compatible with theirs (see
`data/model/DriveModels.kt`'s doc comment). Drive access needs two OAuth
clients registered with Google - a **one-time developer setup you do once,
in source code**, not something anyone running the app has to know about or
type in. Once filled in and built, Settings → Backup just shows a plain
**Sign in with Google** button.

**One-time setup** (do this once, before your first build with Drive backup):

1. Go to https://console.cloud.google.com/ and either pick an existing
   project or create a new one (the same project as the Mac/iPad apps' own
   Drive setup works fine, if you have one).
2. **APIs & Services → Library** → search "Google Drive API" → **Enable**.
3. **APIs & Services → OAuth consent screen**: choose **External** (unless
   you have a Workspace org), fill in the required app name/support email,
   and add yourself as a **Test user** (keeps it out of Google's review
   process, since it's just for your own use).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**,
   **Application type: Android**. Package name: `com.aboooooo57.lexume`.
   SHA-1 certificate fingerprint: run
   `./gradlew signingReport` from `android-app/` and copy the SHA1 line for
   whichever build variant you're installing (debug for local testing;
   add a second Android-type client with your release keystore's SHA-1 once
   M10's signing config exists). This client carries no secret and isn't
   pasted anywhere - it exists purely so Google Sign-In's picker recognizes
   this specific app/build as legitimate.
5. **Create Credentials → OAuth client ID** again, this time **Application
   type: Web application** (no redirect URIs needed - `GoogleAuth.kt` never
   opens one; this client exists purely so `requestServerAuthCode` can mint
   a code redeemable for a refresh token, same shape as the Mac app's own
   Desktop-client flow). Name it anything (e.g. "Lexume Android").
6. Copy that Web client's **Client ID** and **Client Secret**. Open
   `app/src/main/java/com/aboooooo57/lexume/data/local/DriveOAuthConfig.kt`
   and replace the two placeholder strings (`WEB_CLIENT_ID`/`CLIENT_SECRET`)
   with your real values, then rebuild.

That's it - nobody using the built app (including future-you, day to day)
ever sees or enters a Client ID/Secret. Settings → Backup just shows **Sign
in with Google**; tapping it opens Google's own system sign-in/consent
Activity, and Lexume only ever requests access to files it created itself
(the `drive.file` scope - it cannot see the rest of your Drive).

If you'd rather your real Web client Client ID/Secret never appear in git
history, add `DriveOAuthConfig.kt` to `.gitignore` right after filling it in
(same precaution-not-requirement reasoning as the Mac app's own
`DriveOAuthConfig.swift`).

## M9 acceptance checklist

Reached via Settings → the new Backup tab.

- [ ] Gradle sync succeeds after pulling this milestone (Play Services Auth
      newly wired into `app/build.gradle.kts`).
- [ ] Before filling in `DriveOAuthConfig.kt`: the Backup tab shows "Google
      Drive backup isn't set up for this build yet." instead of a sign-in
      button.
- [ ] After filling in your real Web client ID/secret (and registering the
      matching Android-type client's SHA-1, see setup steps above) and
      rebuilding: the Backup tab shows **Not connected** with a **Sign in
      with Google** button.
- [ ] Tap **Sign in with Google** - Google's own system account-picker/
      consent screen opens (not a Lexume-drawn form); after approving
      access, control returns to Lexume and the tab shows **Connected to
      Google Drive**.
- [ ] Tap **Back Up Now** with a couple of sessions in your library (at
      least one with generated narration) - a status line reports "Backed
      up N sessions to Drive" and a "Last backup" timestamp appears.
- [ ] Open https://drive.google.com in a browser - a **Lexume** folder
      exists containing one `.json` file per session and one `.mp3` per
      narrated page.
- [ ] Tap **Back Up Now** again - it completes without creating duplicate
      files in the Drive folder (existing files are updated in place, not
      re-created).
- [ ] On the same device, tap **Restore from Drive** - it reports "Nothing
      new to restore" (everything backed up is already local).
- [ ] To test an actual restore: note a session's name, delete it (Library
      tab's "⋮" menu → Delete…), then **Restore from Drive** - that session
      (text, narration, bookmarks, vocabulary) reappears in the Library
      grid with the same content.
- [ ] Tap **Disconnect** - the tab returns to **Not connected**; local
      sessions are completely unaffected (disconnecting never deletes
      anything, locally or on Drive).
- [ ] Force-stop and relaunch the app - if you hadn't disconnected, the
      Backup tab should still show **Connected to Google Drive** without
      needing to sign in again (the refresh token persists in
      Keystore-encrypted storage across launches).
- [ ] If you also use the Mac/iPad apps with the same Google account and
      the same Drive folder: a session backed up from macOS/iPadOS should
      **Restore from Drive** successfully here (and vice versa) - confirms
      the cross-platform JSON compatibility `DriveModels.kt` was written
      for actually round-trips, not just Android-to-Android.

**Known limitation** (same one the Mac app's own README flags): Back Up Now
re-uploads every session's full metadata (and every narrated page's audio)
each time rather than tracking per-file change state - fine for periodic
manual backups of a personal library, but each backup's cost/time scales
with your whole library rather than just what changed since the last one.

## Signing releases (M10)

Android requires every APK to be cryptographically signed, even for direct
(non-Play-Store) distribution - unlike the Mac app's ad-hoc `codesign
--sign -`, which needs no stored identity at all, Android additionally
*enforces matching signatures* between versions before it'll let one
install over another in place. So a **stable, persistent signing key** is
worth setting up once, the same one-time-developer-setup spirit as the
Drive OAuth clients above - not because of any fee or store account (there
isn't one, same as macOS), purely so users can update between releases
without uninstalling and losing local data.

**One-time setup** (do this once, before you care about seamless updates
between releases):

1. Generate a keystore locally (needs a JDK - any recent one works,
   `keytool` ships with all of them):
   ```
   keytool -genkeypair -v -keystore lexume-release.keystore \
     -alias lexume -keyalg RSA -keysize 2048 -validity 10000
   ```
   Pick real passwords when prompted (not the placeholder `lexume-adhoc`
   the CI workflow falls back to when this isn't set up - see below).
   **Keep this file and its passwords safe and out of git** - anyone with
   it can sign updates that install over your users' installs of this app
   (already covered by `android-app/.gitignore`'s `*.keystore`/`*.jks`
   rule).
2. Base64-encode it for storing as a GitHub Actions secret:
   `base64 -i lexume-release.keystore | pbcopy` (macOS) or
   `base64 -w0 lexume-release.keystore` (Linux).
3. In this repo's GitHub settings → **Secrets and variables → Actions**,
   add four repository secrets:
   - `ANDROID_RELEASE_KEYSTORE_BASE64` - the base64 output from step 2.
   - `ANDROID_KEYSTORE_PASSWORD` - the keystore password you set in step 1.
   - `ANDROID_KEY_ALIAS` - `lexume` (or whatever `-alias` you used).
   - `ANDROID_KEY_PASSWORD` - the key password you set in step 1.

Once those four secrets exist, every release built by
`.github/workflows/release-apk.yml` signs with this same identity
automatically - no further action needed per release. **Without them**,
the workflow still runs and still publishes a real, installable APK - it
just generates a throwaway keystore fresh for that one run instead (the
release notes say so explicitly when this happens), so users can try the
app immediately, they just can't update-install a later release over it
without uninstalling first until the real secrets are in place.

Push a tag like `android-v0.1.0` to trigger a release (or run the workflow
manually via **Actions → Release Android APK → Run workflow** for an
unofficial `0.0.<run-number>` build) - mirrors the Mac app's own
`v*.*.*`-tag-triggered `release-dmg.yml`, just with an `android-v` prefix
so the two workflows don't both fire off the same tag.

## M10 acceptance checklist

- [ ] Push a tag matching `android-v*.*.*` (or run the workflow manually)
      and confirm **Actions → Release Android APK** runs green end to end.
      **This sandbox has no way to actually run GitHub Actions**, so this
      whole workflow file is unverified until you trigger it for real -
      treat it the same as every other "code written, verify with a real
      build" item, just for CI instead of a local Gradle build. If the
      build step fails on a missing Android SDK platform/build-tools
      component, that's the one part of this workflow most likely to need
      a fix (an explicit SDK-setup step) - report the exact error back.
- [ ] The published Release has one `Lexume-<version>.apk` asset attached.
- [ ] Download and install that APK on a real device (enabling "Install
      unknown apps" for whichever app you downloaded it with, per the
      release notes) - it installs and launches correctly.
- [ ] Without the four signing secrets configured: the release notes
      explicitly call out the throwaway-key/no-seamless-update caveat.
- [ ] After following "Signing releases" above and pushing a second tag:
      the release notes no longer mention a throwaway key, and installing
      that APK **over** the previous one (same device, no uninstall)
      succeeds - confirms the persistent signing identity actually works
      across releases.
- [ ] A manual `workflow_dispatch` run (no tag pushed) publishes a release
      tagged `android-v0.0.<run-number>`, not something derived from a
      branch name - confirms the tag-vs-manual-run detection in "Resolve
      version from tag" works the same way it does for the Mac workflow.
- [ ] Google Play Store listing is an **explicit, separate, later step**
      (not part of this milestone) - needs a one-time $25 Google Play
      developer account, a data-safety form, and target-API-level policy
      compliance. Flagged here as your own action to take when ready, same
      as the Apple Developer Program decision was for macOS/iPad.

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
- There's no Original Layout mode (the Mac app's page-image + tap-exact-word
  view) - same Phase 2 deferral the plan always called for; PDF/image
  sessions read as reflowed text only for now.
- The progress bar in the player (M7) is a plain Material3 `Slider`, not a
  hand-rolled drag gesture over a `Capsule` the way `PlayerBarView.swift`
  does it - same seek behavior, much less code, no functional difference.
- The ±15s narration buttons use generic "fast rewind/forward" icons
  (`Icons.Filled.FastRewind`/`FastForward`) rather than an exact "15" glyph
  - Material Icons has no `Replay15`/`Forward15` the way SF Symbols has
  `gobackward.15`/`goforward.15`; only `Replay10`/`Forward10`/`Replay30`/
  `Forward30` exist, none of which are the actual 15s behavior, so a
  generic (correctly-labeled via contentDescription) icon was the more
  honest choice over a wrong number.
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
- M1's plain "Lexume" placeholder screen (`ScaffoldPlaceholder` in
  `LexumeNavHost.kt`, referenced in the M1/M4 checklists above as the
  historical record of what those milestones actually looked like when
  verified) is gone as of M8 - replaced by `HomeScreen.kt`'s bottom-nav'd
  Library/Vocabulary/Bookmarks, with the import flow (Paste Text/Open File)
  now living in the Library tab's own top bar instead.
- Vocabulary CSV export (M8) uses Storage Access Framework's
  `ActivityResultContracts.CreateDocument("text/csv")` - the Android
  analog of the Mac app's `NSSavePanel` and iOS's `.fileExporter`; the CSV
  string itself (`support/VocabularyCsvExporter.kt`) is a verbatim port of
  `VocabularyListView.swift`'s `exportCSV`/`csvField`, same header/ISO8601
  dates/quote-escaping.
- Library/Vocabulary/Bookmarks each nest their own `Scaffold` (own
  `TopAppBar`) inside `HomeScreen`'s outer `Scaffold` (own `bottomBar`) -
  a standard, supported Compose pattern, not a workaround.
- Google Drive backup (M9) uses the classic `GoogleSignInClient`
  (`com.google.android.gms.auth.api.signin`), not the newer Credential
  Manager - Credential Manager (still declared in `libs.versions.toml`,
  still unused) covers identity/passkeys, not requesting Drive-scope
  authorization; `requestServerAuthCode` remains Google's own documented
  path to a refresh-token-yielding code for an app with its own OAuth
  client, the same shape this app already uses for Gemini/ElevenLabs.
- Drive backup/restore doesn't carry Original Layout mode's cached word
  boxes (`SessionPageEntity.wordBoxesJson`/`pageImagesJson`) - matches the
  Mac app's own M8 backup scope exactly (it doesn't back those up either);
  irrelevant anyway until this app has an Original Layout mode of its own
  to restore into (not currently planned - see the M5 placeholder note
  above).
- There's no background/periodic Drive sync - Back Up Now/Restore from
  Drive are both manual taps, matching the Mac app's own design (a
  WorkManager-based periodic backup would be a reasonable M9-follow-up
  idea, not part of this milestone's scope).
- `release-apk.yml` (M10) falls back to a freshly-generated, throwaway
  signing key when the four `ANDROID_*` signing secrets aren't configured,
  so the workflow produces a real installable APK on its very first run
  with zero setup - see README → "Signing releases" for turning that into
  a persistent identity (needed for releases to upgrade-install over each
  other, not needed just to try the app once).
- No ProGuard/R8 shrinking (`isMinifyEnabled = false`) - same as the debug
  builds so far; revisit if release APK size becomes worth optimizing.

## Distribution

Direct APK first (self-signed/ad-hoc, matching the Mac DMG's philosophy —
users enable "install unknown apps" once, no store review), a Google Play
Store listing later as an explicit separate step (needs a one-time $25
developer account + a data-safety form + target-API-level compliance). See
M10 above.
