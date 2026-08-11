# Lexume for Windows — native WPF/.NET app

A native Windows rewrite of Lexume, matching the Mac/iPad/Android apps'
identity — not a port (Windows shares no code with the Swift or Kotlin
codebases) and not a wrapper around the separate web app (`../backend/` +
`../frontend/`). **Zero dependency on the web project or any Lexume-run
server**: the app talks directly to Google Gemini (text extraction),
ElevenLabs (narration with word timestamps), dictionaryapi.dev (dictionary),
and Google Translate — using your own API keys, stored securely on-device.

## Tech stack

Targets **Windows 10 and later** (superseded an earlier Windows-7-floor
decision — see git history if curious). With Windows 10 as the floor, the
choice is straightforward: **WPF on modern .NET, in C#**, currently
`net10.0-windows` (the current .NET LTS). This is:

- Genuinely native (XAML + a real Windows UI framework, not a wrapper),
  matching every other platform in this repo.
- Actively maintained and current — no legacy-framework tradeoffs to
  reason about, unlike the Windows-7 path this replaced.
- Able to call WinRT APIs directly via the `windows10.0.19041.0`-suffixed
  target, which matters for M4: **`Windows.Media.Ocr`** (Windows' own
  built-in OCR, requires Windows 10) is now usable as the on-device/offline
  extraction fallback — the direct analog of Vision on Mac and ML Kit on
  Android, and no third-party OCR library (e.g. Tesseract) needed.

The project uses the **SDK-style `.csproj` format** (`<Project
Sdk="Microsoft.NET.Sdk">`) — a deliberate choice for this sandbox's
constraints: SDK-style projects glob `.cs`/`.xaml` files under the project
folder automatically, so a new file on disk is in the build without also
hand-editing the project file. The old per-file `<Compile Include="...">`
project format doesn't do this, and that exact class of drift (a file on
disk, never added to the project) is what broke the iPad Xcode target
earlier in this project — there's no compiler here to catch the equivalent
mistake in a Windows project either, so the format that structurally can't
have that bug was chosen on purpose.

`TargetPlatformMinVersion` is set to `10.0.17763.0` (Windows 10 1809)
separately from the `10.0.19041.0` SDK the project compiles against, so the
built app runs on any Windows 10 feature update from 1809 onward, not only
the newest ones.

## Requirements

- **Visual Studio 2022** (Community is free) with the **.NET desktop
  development** workload, plus the **.NET 10 SDK** (Visual Studio installs
  this automatically once a project asks for it, or grab it directly from
  https://dotnet.microsoft.com/download). This project is scaffolded in a
  sandbox with no Visual Studio, no .NET SDK, and no NuGet access, so
  **nothing has actually been built yet** — same situation this whole repo
  has had with Xcode and Android Studio from day one.
- Windows 10 or later, both to develop on and to run the built app.
- A Google Gemini API key (free, optional): https://aistudio.google.com/app/apikey
- An ElevenLabs API key (optional, needed for narration): https://elevenlabs.io/app/settings/api-keys

## Build & run

1. Open `windows-app/Lexume.sln` in Visual Studio.
2. Let it restore NuGet packages (none yet at M1 — this step becomes
   relevant starting M2/M4 once SQLite/HTTP packages are added).
3. **F5** (or Debug → Start Debugging) to build and run.
4. Report back anything that fails to open/restore/build/run — same process
   used for every Xcode/Android Studio build issue on the other platforms.

## Milestone status

| # | Milestone | Status |
|---|---|---|
| 1 | Project scaffold (WPF, .NET 10, window shell) | 🚧 code written, never built — no Visual Studio in this sandbox |
| 2 | Data layer (SQLite) | ⬜ not started |
| 3 | Settings & secure key storage (Windows DPAPI) | ⬜ not started |
| 4 | Import & extraction (Gemini + Windows.Media.Ocr fallback) | ⬜ not started |
| 5 | Reader, Phase 1 (reflowed text) | ⬜ not started |
| 6 | Dictionary & translation | ⬜ not started |
| 7 | Narration | ⬜ not started |
| 8 | Library, Vocabulary, Bookmarks | ⬜ not started |
| 9 | Google Drive backup/restore | ⬜ not started |
| 10 | Distribution (installer) | ⬜ not started |
| 11 | Polish | ⬜ not started |
| 12 | Original Layout mode | ⬜ not started |

## M1 acceptance checklist

- [ ] `windows-app/Lexume.sln` opens in Visual Studio 2022 without errors.
- [ ] NuGet restore succeeds (nothing to restore yet at M1, but this
      confirms the SDK-style project resolves correctly).
- [ ] **F5** builds and runs, showing a plain "Lexume" placeholder window —
      not a real Library yet, just confirmation the scaffold is sound (same
      role `ScaffoldPlaceholder` played for Android's M1 and the first
      Xcode build did for macOS).
- [ ] The window resizes down to its `MinWidth`/`MinHeight` without content
      clipping oddly (there's almost no content yet, but worth a glance).

## Known placeholders (intentional, not bugs)

- No app icon yet — default WPF/.NET icon. Real branding is a later
  milestone (matches Mac/Android's own "polish milestone" placement).
- No `.sln`/`.csproj` here has ever been opened by a real IDE or built by a
  real compiler — every file was hand-authored the same way this whole
  project authors Swift/Kotlin/XML: carefully, structurally validated where
  possible (balanced braces, well-formed XML/XAML), but the first real
  Visual Studio open is the actual test, not this description of it.
