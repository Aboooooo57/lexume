cask "lexume" do
  version "0.0.1-alpha"
  sha256 "637c77355ebcc1f76b7092a97b7eb15847c9032be8c498fdc14395b8d7ab6692"

  url "https://github.com/Aboooooo57/lexume/releases/download/v#{version}/Lexume-#{version}.dmg"
  name "Lexume"
  desc "Native macOS reader: tap-to-define, narrated, offline-capable"
  homepage "https://github.com/Aboooooo57/lexume"

  # Bump on every release: set `version` to the new tag (without the
  # leading "v") and `sha256` to that release's DMG asset digest — visible
  # on the release's asset list via the GitHub API, or from
  # `shasum -a 256 Lexume-<version>.dmg` after downloading it yourself.
  # There's no paid Apple Developer account behind these builds, so the
  # app inside is ad-hoc signed, not notarized — see the main README for
  # what that means. Homebrew downloads don't pick up the quarantine flag
  # that browsers add, so this install path skips the Gatekeeper prompt
  # that direct-DMG-download users see.
  auto_updates false

  app "Lexume.app"

  zap trash: [
    "~/Library/Application Support/com.aboooooo57.lexume",
    "~/Library/Caches/com.aboooooo57.lexume",
    "~/Library/Preferences/com.aboooooo57.lexume.plist",
  ]
end
