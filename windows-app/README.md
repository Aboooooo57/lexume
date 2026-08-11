# Lexume for Windows — native WPF/.NET Framework app

A native Windows rewrite of Lexume, matching the Mac/iPad/Android apps'
identity — not a port (Windows shares no code with the Swift or Kotlin
codebases) and not a wrapper around the separate web app (`../backend/` +
`../frontend/`). **Zero dependency on the web project or any Lexume-run
server**: the app talks directly to Google Gemini (text extraction),
ElevenLabs (narration with word timestamps), dictionaryapi.dev (dictionary),
and Google Translate — using your own API keys, stored securely on-device.

## Tech stack — and the Windows 7 decision

The user asked for this to work on **Windows 7 and later**. That single
requirement eliminates every actively-developed native UI toolkit: WinUI 3
needs Windows 10 1809+; modern .NET/WPF on `net6.0-windows`+ officially
supports only Windows 7 SP1 *through* Windows 10 depending on the exact
version and has been trending newer with each release; current Electron
requires Windows 10; Qt 6 requires Windows 10 1809+ (Qt 5.15 LTS was the
last release with real Windows 7 support, and Qt 5 itself is now EOL
upstream).

**This app targets WPF on .NET Framework 4.8, in C#.** Reasoning:

- It's still genuinely native (XAML + a real Windows UI framework, not a
  wrapper), matching the identity every other platform in this repo has.
- It actually runs on Windows 7 SP1 — huge amounts of real-world Windows
  software still ship this way.
- Unlike freezing an old release of an now-EOL toolkit (Qt 5.15 OSS, an old
  Electron pinned to a years-stale Chromium), .NET Framework 4.8 is still
  serviced by Microsoft as part of Windows itself — not a security dead end.
- The alternative that goes even further back (raw Win32 API + C++, no
  framework at all) has no EOL-framework risk either, but is a dramatically
  larger, slower build with zero shared design vocabulary with the rest of
  this project (no XAML/declarative UI, hand-rolled everything). WPF was
  judged the better tradeoff.

**This tech choice was made without the user confirming it against the
alternatives** (a scoping question was asked and not answered) — flagging
that plainly here. If Windows 7 support turns out not to matter in practice
(e.g. only Windows 10/11 actually needs covering), say so and this can move
to a more modern stack with less legacy baggage.

**Known Windows-7-specific consequence, for M4 (import/OCR) to handle
later**: Windows' own built-in OCR (`Windows.Media.Ocr`) is a WinRT API
requiring Windows 10 — not usable here. The on-device/offline OCR fallback
(the analog of Vision on Mac / ML Kit on Android) will need a bundled
library instead, most likely [Tesseract OCR](https://github.com/tesseract-ocr/tesseract)
via the `Tesseract` NuGet wrapper, which has no such version floor.

The project uses the **SDK-style `.csproj` format** (`<Project
Sdk="Microsoft.NET.Sdk">`) even though it targets `net48` — this is a
deliberate choice for this sandbox's constraints: SDK-style projects glob
`.cs`/`.xaml` files under the project folder automatically, so a new file on
disk is in the build without also hand-editing the project file. The old
per-file `<Compile Include="...">` project format doesn't do this, and
that exact class of drift (a file on disk, never added to the project) is
what broke the iPad Xcode target earlier in this project — there's no
compiler here to catch the equivalent mistake in a Windows project either,
so the format that structurally can't have that bug was chosen on purpose.

## Requirements

- **Visual Studio 2022** (Community is free) with the **.NET desktop
  development** workload, which includes the .NET Framework 4.8 targeting
  pack — or the `dotnet` CLI with that targeting pack installed separately.
  This project is scaffolded in a sandbox with no Visual Studio, no .NET
  Framework targeting pack, and no NuGet access, so **nothing has actually
  been built yet** — same situation this whole repo has had with Xcode and
  Android Studio from day one.
- Windows 7 SP1 or later to actually run the built app (development itself
  needs Windows 10/11, since that's what current Visual Studio requires —
  only the *output* needs to run on Windows 7).
- A Google Gemini API key (free, optional): https://aistudio.google.com/app/apikey
- An ElevenLabs API key (optional, needed for narration): https://elevenlabs.io/app/settings/api-keys

## Build & run

1. Open `windows-app/Lexume.sln` in Visual Studio.
2. Let it restore NuGet packages (none yet at M1 — this step becomes
   relevant starting M2/M4 once SQLite/HTTP/OCR packages are added).
3. **F5** (or Debug → Start Debugging) to build and run.
4. Report back anything that fails to open/restore/build/run — same process
   used for every Xcode/Android Studio build issue on the other platforms.

## Milestone status

| # | Milestone | Status |
|---|---|---|
| 1 | Project scaffold (WPF, .NET Framework 4.8, window shell) | 🚧 code written, never built — no Visual Studio in this sandbox |
| 2 | Data layer (SQLite) | ⬜ not started |
| 3 | Settings & secure key storage (Windows DPAPI) | ⬜ not started |
| 4 | Import & extraction (Gemini + Tesseract OCR fallback) | ⬜ not started |
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
- [ ] (If you have a Windows 7 VM/machine handy) confirm the built `.exe`
      actually launches there — this is the one thing that can't be
      verified any other way, and is the entire point of the tech choice
      above.

## Known placeholders (intentional, not bugs)

- No app icon yet — default WPF/.NET icon. Real branding is a later
  milestone (matches Mac/Android's own "polish milestone" placement).
- No `.sln`/`.csproj` here has ever been opened by a real IDE or built by a
  real compiler — every file was hand-authored the same way this whole
  project authors Swift/Kotlin/XML: carefully, structurally validated where
  possible (balanced braces, well-formed XML/XAML), but the first real
  Visual Studio open is the actual test, not this description of it.
