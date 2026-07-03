# Lexis.app (macOS wrapper) — Milestone 1

A minimal native macOS shell for Lexis: a SwiftUI window embedding a WKWebView
pointed at your locally running frontend. It does **not** start the backend
or frontend for you yet — that's Milestone 2 (process auto-start/stop),
described in the plan.

## Run it

1. Start the existing web app first, from the repo root:

   ```bash
   docker compose up --build
   ```

   (or run backend/frontend manually per the main [README](../README.md) —
   either way, the frontend must be reachable at `http://localhost:3000`.)

2. Open `macos-app/Lexis.xcodeproj` in Xcode.
3. Select the **Lexis** scheme → **My Mac** as the run destination.
4. Press **Run** (⌘R).

You should get a native window showing the Lexis dashboard. If it can't
reach `localhost:3000`, you'll see a native "Can't reach Lexis" screen
instead of a blank page.

## Known risk to test

Google Sign-In may behave differently inside a WKWebView than in a regular
browser tab — Google sometimes blocks OAuth flows in embedded webviews it
detects as non-standard. Try signing in once the app is running. If it's
blocked, the fix is to swap the in-page OAuth redirect for
`ASWebAuthenticationSession` (opens the system browser/passkey flow instead
of authenticating inside the embedded WKWebView) — flag it and this can be
addressed in the next iteration.

## What's next (not implemented yet)

- **M2**: `ProcessManager` to launch `backend/` (python) and `frontend/`
  (`npm run start` against a production build) as child processes on app
  launch, with a health-check loading screen, and clean shutdown on quit.
- **M3**: In-app settings screen for API keys (Gemini, ElevenLabs, Google
  OAuth), stored in Keychain, written to `backend/.env`.
- **M4**: App icon, menu bar controls (restart backend, view logs, open
  data folder).
