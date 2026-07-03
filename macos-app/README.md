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
| 1 | App shell, Keychain keys, onboarding, settings | ✅ this build |
| 2 | Import (PDF page picker / TXT / MD / paste) + Gemini extraction + reader | ⏳ next |
| 3 | Preview-style dictionary popover (click / right-click / force-click) | planned |
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

If anything fails to build, copy the Xcode error output back to Claude for a fix.
