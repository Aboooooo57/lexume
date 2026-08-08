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
  project was scaffolded in a sandbox with no Android SDK and no access to
  Google's Maven repo (`dl.google.com`), so **M1 has never actually been
  built here**. Opening it in real Android Studio is the first real compile
  check, the same role the first Xcode build played for the Mac app.
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
| 1 | Project scaffold (Gradle, Compose, nav stub) | 🚧 code written, unverified — first real Android Studio sync is the test |
| 2 | Room data layer | ⬜ not started |
| 3 | Settings & secure key storage | ⬜ not started |
| 4 | Import & extraction | ⬜ not started |
| 5 | Reader, Phase 1 (reflowed text) | ⬜ not started |
| 6 | Dictionary & translation | ⬜ not started |
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
- Room, DataStore, ML Kit, Retrofit/OkHttp, Media3, and Credential
  Manager/Play Services Auth are all already declared in
  `gradle/libs.versions.toml` (so the whole planned stack is visible in one
  place) but deliberately **not yet added to `app/build.gradle.kts`'s
  dependencies** — each gets wired in during the milestone that first uses
  it, not pulled in unused ahead of time.

## Distribution

Direct APK first (self-signed/ad-hoc, matching the Mac DMG's philosophy —
users enable "install unknown apps" once, no store review), a Google Play
Store listing later as an explicit separate step (needs a one-time $25
developer account + a data-safety form + target-API-level compliance). See
M10 above.
