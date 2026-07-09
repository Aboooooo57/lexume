# Lexis for macOS — fully native app

A standalone native SwiftUI rewrite of Lexis. **Zero dependency on the web
project**: no backend, no Next.js, no Docker. The app talks directly to
Google Gemini (text extraction), ElevenLabs (narration with word timestamps),
dictionaryapi.dev (dictionary), and Google Translate — using your own API
keys, stored in the macOS Keychain.

**No Gemini key? Lexis still works.** Without one, extraction falls back
automatically to on-device OCR — the same technology behind Preview/Quick
Look's Live Text — reading PDFs and photos entirely offline, for free, with
no account. You can pick which OCR engine to use (or compare both) in
Settings → API Keys → On-Device OCR.

Guiding UX: feel like **Preview.app** — open a document, read it in a clean
native window, and force-click / three-finger-tap / right-click / click any
word to get Lexis's full dictionary in a popover anchored at the word.

## Requirements

- macOS 14 (Sonoma) or newer
- Xcode 15.3 or newer
- A Google Gemini API key (free, optional — see above): https://aistudio.google.com/app/apikey
- An ElevenLabs API key (optional, needed for narration): https://elevenlabs.io/app/settings/api-keys

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
| 2 | Import (PDF page picker / TXT / MD / paste) + Gemini extraction + reader | ✅ |
| 3 | Preview-style dictionary popover (click / right-click / force-click) | ✅ |
| 4 | ElevenLabs narration + karaoke word highlighting | ✅ |
| 5 | Translation, key terms, paragraph bookmark/translate | ✅ |
| 6 | Library depth, voice picker, themes, focus mode | ✅ |
| 7 | "Open With Lexis" from Finder, menu commands, app icon, offline banner | ✅ |
| 8 | Google Drive backup/restore | ✅ |
| 9 | Original Layout reading mode (click words on the real page) | ✅ this build |

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

## Milestone 3 acceptance checklist

This is the "Preview.app moment" — the highest-risk piece of the whole rewrite, so test it thoroughly.

- [ ] **Force click** (or three-finger tap, if enabled in System Settings → Trackpad → Point & Click → "Look up & data detectors") any word → a Lexis popover appears anchored at that word, showing its definition, phonetic spelling, and (if available) a speaker icon that plays pronunciation audio — the system's own gray "Look Up" panel should **not** appear. (A plain click deliberately does nothing but text selection/focus, exactly like Preview.app — same gesture set in both the reflowed reader and Original Layout mode.)
- [ ] **Right-click** a word → a context menu appears with "Define '<word>'", Copy, and "Look Up '<word>' (System)"; the last one opens the real system Look Up panel as an escape hatch.
- [ ] Clicking a word **inside a definition or example sentence** looks that word up too, pushing it onto a breadcrumb trail at the top of the popover.
- [ ] Clicking a **synonym chip** does the same.
- [ ] The **breadcrumb** shows every word you've followed; clicking an earlier word in it jumps back to that lookup; the back arrow (‹) undoes one step; the reset arrow (↻) jumps back to the first word.
- [ ] Looking up a nonsense string (e.g. "asdkfj") shows a clean "No definition found" message, not a crash or infinite spinner.
- [ ] Selecting/dragging across multiple words (click-and-drag) selects text normally and does **not** pop up a definition (only a stationary click does).
- [ ] Quit and relaunch, open **Library → Vocabulary** — every word you looked up should have been logged (this view is still a placeholder until Milestone 6, but the underlying data is being written now; ask Claude if you want to peek at it via Xcode's SwiftData debugger in the meantime).

## On-device OCR acceptance checklist

- [ ] With **no Gemini key saved**, Settings → API Keys shows "Currently reading with: On-device OCR (no key needed)".
- [ ] With a Gemini key saved, it shows "Currently reading with: Google Gemini" instead.
- [ ] With no Gemini key, import a scanned/image-only PDF (or a plain photo of a page — JPG/PNG/HEIC now show up in **Open File…** and drag-and-drop) → the reader shows recognized text with no network call and no error, even offline.
- [ ] Switch the **OCR engine** picker (Settings → API Keys → On-Device OCR) between Vision framework and VisionKit, then import the **same file as a fresh session** for each (cached pages don't re-run OCR just because the setting changed) — compare the two outputs.
- [ ] Add a Gemini key back, import the same document again as a new session → it now gets AI-cleaned prose instead of raw OCR text, confirming the automatic fallback switches both ways.
- [ ] Translation works the same with or without a Gemini key, since its primary engine is the free Google Translate endpoint.

## Milestone 4 acceptance checklist

Requires an ElevenLabs key entered (Settings → API Keys). Voice, model, and stability/similarity/style/speed live in Settings → Models & Voice; audio mode (auto/manual/off) lives in Settings → Reading.

- [ ] With **audio mode = Manually**, opening a page shows a **Generate Audio** button instead of a player.
- [ ] Tapping it on a short page (<3000 characters) starts generating immediately (no dialog), then shows playback controls once done.
- [ ] Tapping it on a long page (>3000 characters, e.g. paste a long article) shows a confirmation dialog with the character count and an estimated cost before generating.
- [ ] Once audio exists: play/pause, restart (⟲), −15s / +15s skip, and click-anywhere-on-the-progress-bar-to-seek all work; the time labels update live.
- [ ] While playing, **words highlight one at a time** in sync with the audio — the current word gets a subtle pill background and accent color; words already spoken dim to a secondary color; upcoming words stay the normal reading color.
- [ ] The page **auto-scrolls** to keep the currently-speaking paragraph in view as playback moves down the page.
- [ ] With **audio mode = Automatically**, opening a page (with no cached audio) starts generating without you pressing anything (still gated by the long-page confirmation dialog if applicable).
- [ ] With **audio mode = Never**, no player/generate button appears at all — text-only reading.
- [ ] Quit and relaunch mid-playback on a page — reopening that same page/session resumes from close to where you left off (not from the very start), as long as you were more than a couple seconds in and not at the very end.
- [ ] Reaching the end of a page's audio **auto-advances to the next page** and (if that page already has cached audio, or audio mode is Automatic) **keeps playing** without you pressing play again.
- [ ] Reopening a page you already generated audio for shows the player instantly with no re-generation spinner (audio is cached like text).
- [ ] Switching pages or leaving the reader stops playback (it doesn't keep playing silently in the background).

**Known scope trim**: clicking a word to jump audio playback to that word ("click word to seek") was intentionally *not* added, since a plain click on a word already opens the dictionary popover from Milestone 3 — adding a second, conflicting meaning to the same click felt worse than omitting the feature. Tell Claude if you'd rather have seek-on-click and lose click-to-define, or want a different gesture (e.g. double-click) reserved for seeking.

## Milestone 5 acceptance checklist

Target language and translation engine (Google/Gemini) live in Settings → Reading → Translation.

- [ ] In the dictionary popover, the headword, every definition, and every example each show a small **Translate** button/link.
- [ ] Tapping one shows a spinner briefly, then the translated text appears inline right below — in the target language you picked in Settings.
- [ ] Set target language to **Persian** or **Arabic** (both RTL) — the translated text is right-aligned and reads right-to-left, while the surrounding English UI stays left-to-right.
- [ ] Switch translation engine to **Gemini** in Settings, translate something new (not already cached) — it still works (just via Gemini instead of the free Google endpoint).
- [ ] Hovering any paragraph in the reader reveals three small buttons to its right: **bookmark**, **translate**, **key terms** (sparkles).
- [ ] Clicking bookmark toggles it solid/outline immediately; the button stays visible (chrome doesn't disappear) on a bookmarked paragraph even when your mouse moves away.
- [ ] Clicking translate on a paragraph shows the whole paragraph's translation inline below it, with a left accent bar (or right, if RTL).
- [ ] Clicking the sparkles button shows a row of up to 6 suggested vocabulary chips below the paragraph; clicking a chip opens the same dictionary popover for that word.
- [ ] Turning a page clears the previous page's inline translations/key-term chips (they're re-requested per page, not carried over from the wrong page).
- [ ] Quit and relaunch — bookmarked paragraphs are still marked (persisted), though translations/key-terms are not (intentionally ephemeral, cheap to re-request).
- [ ] Without any Gemini key (on-device OCR mode), translation still works via the free Google endpoint, but the **key terms** button quietly returns nothing (no crash) since it needs Gemini.

**Fixed since first written**: translation wasn't working at all — the free Google endpoint call was a POST with a form body and no User-Agent header, which the endpoint silently rejects. It's a GET with `q` as a query parameter plus a browser User-Agent; also fixed the silent failure (a paragraph's Translate button used to just spin and revert with zero feedback) to show a real error message when both Google and Gemini fail.

## Milestone 6 acceptance checklist

Library, Vocabulary, and Bookmarks are all searchable now (⌘F-style search field in the toolbar of each).

- [ ] Type in the Library search field — the grid filters to matching session names live; clearing it restores the full grid.
- [ ] Right-click a session card → **Rename…** → change the name → it updates immediately and persists across relaunch.
- [ ] Right-click a session card → **Delete…** → confirm → the session (and its pages, bookmarks, vocabulary) disappears; canceling leaves it untouched.
- [ ] Each session card now shows **Page X/Y** and, once you have any, small bookmark/vocabulary counts.
- [ ] **Vocabulary** sidebar: search filters by word; each row shows which session it came from and an "Open" button that jumps into that session's reader; **Export CSV** in the toolbar prompts a save location and produces a valid CSV (word, date, session, definition) you can open in Numbers/Excel.
- [ ] **Bookmarks** sidebar (previously a placeholder) now lists every bookmarked paragraph across all sessions, searchable, with a tap-to-jump into that session.
- [ ] Settings → Models & Voice → click the refresh (⟳) button next to Voice ID — it fetches your real ElevenLabs voice library into a picker; selecting one fills in the Voice ID field. The manual text field still works if you'd rather paste an ID directly.
- [ ] In the reader, click the focus-mode icon in the toolbar (or ⌘⇧F) — the page-navigation bar disappears, leaving just the text and (if audio mode isn't Never) the player bar, plus a small ✕ button top-right.
- [ ] Press **Esc** while in focus mode — it exits back to the normal view (same as clicking ✕).
- [ ] Reading themes (system/light/dark/sepia) and font family/size were already wired in earlier milestones — confirm they still apply correctly in the reader (Settings → Reading).

## Milestone 7 acceptance checklist

- [ ] **App icon**: Lexis now has a real icon (blue-purple gradient, document + highlighted line + magnifying glass) in the Dock, Finder, and ⌘Tab switcher instead of the default Xcode placeholder.
- [ ] **Finder "Open With"**: right-click a PDF, `.txt`, `.md`, `.jpg`/`.png`/`.heic` file in Finder → "Open With" → Lexis should appear in the list (as an alternate handler, not the default — Preview/TextEdit stay the default double-click app). Choosing it launches Lexis (or brings it forward if already running) and immediately starts importing that file into a new session.
- [ ] Same test with Lexis already running and a session open — opening another file via Finder "Open With" adds a new session without disturbing the one you were reading.
- [ ] **Reader in a new window**: right-click a session card in the Library grid → **Open in New Window** → a separate standalone window opens showing just that reader (no sidebar), so you can have two sessions open side by side.
- [ ] **Menu bar → Playback**: with a reader window key and a page with generated audio, press **Space** — playback toggles play/pause (menu item label flips between "Play"/"Pause" too). Confirm this doesn't accidentally trigger while typing in a text field (e.g. the paste-text sheet or search box) — if it does, tell Claude, since Space here is intentionally scoped to reader windows only.
- [ ] **Menu bar → Playback → ⌘←/⌘→** moves to the previous/next page from any reader window (main or secondary); items gray out correctly on the first/last page.
- [ ] **Offline banner**: turn off Wi-Fi — a small yellow banner appears at the top of the Library ("You're offline — cached sessions are still readable…"); previously-read sessions still open and read fine; turning Wi-Fi back on makes the banner disappear within a few seconds.

**Known scope trim**: embedded PDF image extraction (pulling photos/figures out of a PDF page alongside the extracted text) was on the original M7 list but was dropped from this pass — it needs low-level CoreGraphics PDF parsing (`CGPDFDictionaryApplyBlock`, raw XObject decoding) whose exact API shapes can't be verified without a compiler in this environment, and a wrong guess there risks a broken build for a purely cosmetic feature. Say the word if you'd like Claude to attempt it anyway (you'd build/test it) or leave it out of scope permanently.

## Setting up Google Drive backup (Milestone 8)

Lexis can mirror every session (extracted text, narration audio, word timings, bookmarks, vocabulary) to a **"Lexis" folder in your own Google Drive**, so you can restore your library on another Mac. Drive access needs an OAuth client registered with Google — this is a **one-time developer setup you do once, in source code**, not something anyone running the app has to know about or type in. Once it's filled in and built, Settings just shows a plain **Sign in with Google** button.

**One-time setup** (do this once, before your first build with Drive backup):

1. Go to https://console.cloud.google.com/ and either pick an existing project or create a new one.
2. **APIs & Services → Library** → search "Google Drive API" → **Enable**.
3. **APIs & Services → OAuth consent screen**: choose **External** (unless you have a Workspace org), fill in the required app name/support email, and add yourself as a **Test user** (this keeps it out of Google's review process, since it's just for your own use — test-user tokens work indefinitely as long as you don't publish the app).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**. For **Application type**, choose **Desktop app**, name it anything (e.g. "Lexis Mac"), and click **Create**.
5. Copy the **Client ID** and **Client Secret** shown. Open `macos-app/Lexis/Services/Drive/DriveOAuthConfig.swift` in Xcode and replace the two placeholder strings (`clientID`/`clientSecret`) with your real values, then rebuild.
6. (Desktop-type clients don't need a redirect URI configured in the console — Lexis opens a temporary local web server on a random port and Google's loopback exception for installed apps handles the rest automatically.)

That's it — nobody using the built app (including future-you, day to day) ever sees or enters a Client ID/Secret. Settings → Backup just shows **Sign in with Google**; clicking it opens a normal Google consent screen in your browser, and Lexis only ever requests access to files it created itself (the `drive.file` scope — it cannot see the rest of your Drive).

If you'd rather your real Client ID/Secret never appear in git history, add `Lexis/Services/Drive/DriveOAuthConfig.swift` to `.gitignore` right after filling it in (Google documents Desktop-app client secrets as not confidential, so this is a precaution, not a requirement).

## Milestone 8 acceptance checklist

- [ ] Before filling in `DriveOAuthConfig.swift`: Settings → Backup shows "Google Drive backup isn't set up for this build yet." instead of a sign-in button.
- [ ] After filling in your real Client ID/Secret and rebuilding: Settings → Backup shows **Not connected** with a **Sign in with Google** button.
- [ ] Click **Sign in with Google** — your default browser opens straight to a Google sign-in/consent screen (no Lexis-side form to fill in first).
- [ ] After approving access, the browser tab shows "You're signed in. You can close this tab and return to Lexis." — switching back to Lexis, Settings now shows **Connected to Google Drive**.
- [ ] Click **Back Up Now** with a couple of sessions in your library (at least one with generated narration) — a status line reports "Backed up N sessions to Drive" and a "Last backup" timestamp appears.
- [ ] Open https://drive.google.com in a browser — a **Lexis** folder exists containing one `.json` file per session and one `.mp3` per narrated page.
- [ ] Click **Back Up Now** again — it should complete without creating duplicate files in the Drive folder (existing files are updated in place, not re-created).
- [ ] On the same Mac, click **Restore from Drive** — it should report "Nothing new to restore" (everything backed up is already local).
- [ ] To test an actual restore: note a session's name, delete it from the Library (Rename/Delete context menu → Delete), then **Restore from Drive** — that session (text, narration, bookmarks, vocabulary) reappears with a fresh `PersistentIdentifier` but the same content.
- [ ] Click **Disconnect** — Settings returns to **Not connected**; your local sessions are completely unaffected (disconnecting never deletes anything, locally or on Drive).
- [ ] Quit and relaunch Lexis — if you hadn't disconnected, Settings should still show **Connected to Google Drive** without needing to sign in again (the refresh token persists in Keychain across launches).

**Known limitation**: Back Up Now re-uploads every session's full metadata (and every narrated page's audio) each time rather than tracking per-file change state — fine for periodic manual backups of a personal library, but each backup's cost/time scales with your whole library rather than just what changed since the last one. Say the word if you'd like incremental backup tracking added later.

## Milestone 9 acceptance checklist

Original Layout mode shows the actual PDF page or photo — original fonts, columns, layout — with the same Preview-style dictionary popover anchored to each word's real position, instead of reflowed prose. **It's now the default view for PDF/image sessions**: opening one goes straight to Original Layout, and Gemini/OCR text extraction is deferred — it only runs the first time you switch to the reflowed-text view for a given session, so just reading the original page never costs an extraction call.

- [ ] Open a PDF or image session — it opens directly into Original Layout mode (not reflowed text), with a toolbar toggle (document-with-image icon) to switch to reflowed text. This toggle isn't present for a pasted-text session.
- [ ] The first time you view a given page this way, there's a brief "Reading page N…" spinner while on-device OCR computes word locations (subsequent visits to the same page are instant — cached).
- [ ] Force-click (or three-finger tap) a word directly on the page — the same Lexis dictionary popover appears (definition, phonetics, synonyms, breadcrumb), anchored cleanly at the word (not overlapping/covering it). Plain click does nothing on its own (see selection below), same as the reflowed reader.
- [ ] While the popover is open, the looked-up word carries a **yellow highlight** (same as the system Look Up's find indicator) that disappears when the popover closes — this works in **both** Original Layout mode and the reflowed-text reader, so you can always see which word you looked up.
- [ ] Right-click a word → "Define "..."" appears in the context menu and works the same way.
- [ ] The system's gray Look Up panel should never appear for the force-click/three-finger tap — only Lexis's own popover.
- [ ] **Click and drag** across some words — a blue selection highlight (same color as normal macOS text selection) appears over every word your drag touches. **⌘C** copies the selected words as plain text; paste it anywhere (TextEdit, Notes, a Vocabulary export) to confirm. Word order in the copy follows reading order (top-to-bottom, left-to-right) even if your drag was diagonal or messy.
- [ ] Click once without dragging — any existing selection clears (matches normal text-editing behavior) and nothing is copyable until you drag again.
- [ ] **Pinch to zoom** on the trackpad — the page zooms in/out smoothly; two-finger scroll pans around while zoomed in. Word lookups and drag-selection still work correctly at any zoom level.
- [ ] Looking up a word here still logs it to **Vocabulary** (check the sidebar) exactly like the reflowed reader does.
- [ ] Click the toolbar toggle to switch to reflowed text for the **first time** in a session — you should see the normal "Extracting page N…" spinner (this is the one-time extraction call this mode was deferring); after that, narration/translate/key-terms all work exactly as before.
- [ ] Switch back and forth between the two modes a few times — no repeated extraction calls (check nothing keeps spinning), and each mode's own content stays correct as you navigate pages in it.
- [ ] Try this with a **scanned/photo-based** PDF or a plain photo import (no embedded text layer) — words are still individually clickable, since this mode always uses on-device Vision OCR regardless of whether you have a Gemini key configured.
- [ ] Try a page with no readable text (e.g. a mostly-blank page or a photo of a landscape) — it shows the image with a small "No text detected on this page" note instead of crashing or hanging.
- [ ] Navigate to the next/previous page while still in Original Layout mode — it loads that page's image and words automatically (you don't need to re-toggle).

**Note**: the dictionary popover's anchor-above-the-word positioning bug fixed here also affects the reflowed-text reader (M3) — it should now anchor correctly there too, on every page, not just in Original Layout mode.

**Known scope cuts** (by design, not bugs): no narration/karaoke, per-paragraph translate, or key-terms chips in this mode (there's no paragraph structure over a raw page image — narration you already generated for the page still plays via the player bar, just without word-by-word highlighting since that's tied to the reflowed text view). Word boxes are cached per page like everything else, but aren't currently included in Google Drive backup/restore (M8) — they'll just be recomputed via OCR again if you view Original Layout mode on another Mac. Copied text's reading order is an approximation (rows grouped by vertical overlap, sorted top-to-bottom then left-to-right) since Vision's OCR doesn't give real line/paragraph structure the way a PDF's own text layer would — it should read correctly for ordinary single-column text but may reorder oddly on multi-column layouts or dense tables.

## UI/settings polish checklist

- [ ] The dictionary popover now shows a rounded pill breadcrumb bar, a bold headword with monospaced phonetic spelling, a circular pronunciation button, colored part-of-speech badges, numbered definitions, quoted italic examples, and outlined synonym chips — check it reads clearly and nothing is clipped at 380×440.
- [ ] An **✕ close button** in the popover's top-right closes it immediately (in addition to clicking away, which already worked).
- [ ] Settings now has a **General** tab: "Show Welcome Screen Again" replays onboarding without touching your saved keys; "Clear Cached Pages…" (with a confirmation dialog) deletes cached extracted text/audio so pages re-extract next time — this is now the easy way to compare OCR engines on the *same* file instead of creating a new session each time; "Reset All Settings to Defaults…" restores models/voice/reading/OCR preferences without touching API keys.

If anything fails to build, copy the Xcode error output back to Claude for a fix.

### Optional: enable unit tests

`macos-app/LexisTests/` has three test files covering pure logic — page range parsing (`PageRangeParserTests.swift`), the ElevenLabs character→word timing algorithm (`CharToWordTimingTests.swift`), and the karaoke TokenMap including its mismatched-timings fallback (`TokenMapTests.swift`) — but none are wired into a test target yet (hand-authoring an Xcode test target blind was judged too risky without a compiler to verify it). To run them: **File → New → Target… → macOS → Unit Testing Bundle** (name it `LexisTests`), then drag the existing files in `LexisTests/` into that new target in Xcode, and run with ⌘U.
