# Email Grabber

Chrome extension (Manifest V3) that highlights email addresses on any page, lets you save a title/note against them, and syncs saved entries to your own server.

## Load it

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this folder (`x-tension`)

## Configure sync

1. Click the extension icon → the gear icon → opens Settings
2. Enter your endpoint URL (required) and an optional `Authorization` header value
3. Save

## Use it

1. Browse any page — detected emails get a highlighted underline
2. Click a highlighted email → a small popup appears with the email pre-filled; add an optional title/note → Save
3. Click the toolbar icon to see all saved entries (badge shows the unsynced count)
4. Click "Sync All" to POST all saved entries as `{ "entries": [...] }` to your configured endpoint. On a `2xx` response, the synced entries are removed from local storage.

## Notes / limitations

- Emails inside iframes are not scanned (content script only runs in the main frame).
- No icon files are bundled; Chrome shows its default puzzle-piece icon. Drop `icon16.png` / `icon48.png` / `icon128.png` in this folder and add an `"icons"` entry to `manifest.json` if you want a custom one.
