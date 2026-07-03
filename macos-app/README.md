# Lexis for macOS — fully native app

A standalone native SwiftUI rewrite of Lexis. **Zero dependency on the web
project**: no backend, no Next.js, no Docker. The app talks directly to
Google Gemini (text extraction), ElevenLabs (narration with word timestamps),
dictionaryapi.dev (dictionary), and Google Translate — using your own API
keys, stored in the macOS Keychain.

Guiding UX: feel like **Preview.app** — open a document, read it in a clean
native window, and force-click / three-finger-tap / right-click / click any
word to get Lexis's full dictionary in a popover anchored at the word.

## Requirements

- macOS 14 (Sonoma) or newer
- Xcode 15.3 or newer
- A Google Gemini API key (free): https://aistudio.google.com/app/apikey
- An ElevenLabs API key: https://elevenlabs.io/app/settings/api-keys

## Build & run

1. Open `macos-app/Lexis.xcodeproj` in Xcode.
2. Scheme **Lexis** → destination **My Mac** → **Run** (⌘R).
3. On first launch, the onboarding sheet asks for your two API keys.
   Use the **Test** buttons to verify each key live, then **Save & Start**.
   Keys can be changed any time in **Settings (⌘,) → API Keys**.

## Milestone status

| # | Milestone | Status |
|---|---|---|
| 1 | App shell, Keychain keys, onboarding, settings | ✅ |
| 2 | Import (PDF page picker / TXT / MD / paste) + Gemini extraction + reader | ✅ this build |
| 3 | Preview-style dictionary popover (click / right-click / force-click) | ⏳ next |
| 4 | ElevenLabs narration + karaoke word highlighting | planned |
| 5 | Translation, key terms, paragraph bookmark/translate | planned |
| 6 | Library depth, voice picker, themes, focus mode | planned |
| 7 | "Open With Lexis" from Finder, menu commands, app icon | planned |
| 8 | Google Drive backup/restore | planned |

## Milestone 1 acceptance checklist

- [ ] App launches to a Library window with a sidebar (Library / Vocabulary / Bookmarks) — no landing page.
- [ ] First launch shows the onboarding sheet.
- [ ] "Test" next to the Gemini field shows a green check with a valid key, a red X with a bogus key.
- [ ] Same for the ElevenLabs field.
- [ ] Save & Start, quit the app, relaunch — onboarding does **not** reappear (keys persisted in Keychain).
- [ ] Settings (⌘,) shows API Keys / Models & Voice / Reading tabs; values persist across relaunch.

## Milestone 2 acceptance checklist

Requires a valid Gemini key entered (Settings → API Keys).

- [ ] **Open File…** (or ⌘O) picks a PDF → a page picker sheet opens with thumbnails for every page.
- [ ] Clicking a thumbnail toggles its selection (blue outline + checkmark); the counter above updates.
- [ ] Typing `1-2` (or your own range) into the range field and clicking **Apply** selects exactly those pages; **Select All** / **Clear** work.
- [ ] Right-click (or context menu) → **Zoom In** shows a larger page preview with prev/next and a select/deselect toggle.
- [ ] **Start Reading** creates a session and immediately navigates into the reader, which shows "Extracting page 1…" then the extracted prose.
- [ ] Reopening the same session from the Library grid shows the cached page instantly (no re-extraction spinner).
- [ ] Prev/next page buttons move between pages; the counter reads "Page X of Y" correctly for a multi-page selection.
- [ ] **Open File…** on a `.txt` or `.md` file skips the page picker and goes straight to the reader (single page, reformatted prose, no Markdown symbols visible).
- [ ] **Paste Text** opens a sheet; pasting a paragraph and clicking **Create Session** behaves like the .txt case.
- [ ] Dragging a PDF/TXT/MD file onto the Library's dashed drop zone works the same as **Open File…**.
- [ ] Quit and relaunch the app — the session persists in the Library grid and reopens to the last page you were on.
- [ ] If your Gemini key is wrong/missing, the reader shows a readable error message with a **Retry** button instead of crashing or hanging.

If anything fails to build, copy the Xcode error output back to Claude for a fix.

### Optional: enable unit tests

`macos-app/LexisTests/PageRangeParserTests.swift` covers the "1-3,5" range-parsing logic but isn't wired into a test target yet (hand-authoring an Xcode test target blind was judged too risky without a compiler to verify it). To run it: **File → New → Target… → macOS → Unit Testing Bundle** (name it `LexisTests`), then drag the existing `LexisTests/PageRangeParserTests.swift` file into that new target in Xcode, and run with ⌘U.
