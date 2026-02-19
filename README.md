# Layoff Check (LinkedIn Chrome Extension)

Layoff Check is a lightweight Chrome extension that helps job seekers quickly see whether the company on a LinkedIn job posting appears in the layoffs.fyi company tracker.

When you open a LinkedIn job page, the extension:

1. Detects the currently viewed job/company.
2. Fetches the layoffs.fyi tracker data (published as CSV from Google Sheets).
3. If the company name matches, injects a visible **"Listed on Layoffs.fyi"** indicator near the apply button.

## Features

- Works directly on LinkedIn Jobs pages.
- Normalized + fuzzy matching for company names.
- Cached CSV lookups using extension storage.
- Better LinkedIn SPA handling via route-change detection.
- Popup and options pages for user configuration.
- Uses a Manifest V3 service worker.

## How it Works

### 1) Content script (`main.js`)

- Listens for background messages:
  - `urlChanged` to trigger a fresh company lookup.
  - `loadListed` to render the "Listed on Layoffs.fyi" badge in the page UI.
  - `clearListed` to remove the badge when there is no match.
- Extracts company name from LinkedIn job pages.
- Handles LinkedIn SPA route transitions through History API hooks and DOM observation.
- Sends `checkCompany` to the background script with the extracted company name.

### 2) Background service worker (`background.js`)

- Watches tab updates and notifies the content script when a LinkedIn job URL changes.
- On `checkCompany`, reads user settings and cached CSV data.
- Downloads and caches CSV data in `chrome.storage.local` based on a TTL setting.
- Performs normalized matching and optional fuzzy matching.
- Sends `loadListed` or `clearListed` back to the content script.

### 3) Settings UI (`popup.html`, `options.html`)

- Popup provides a quick link to settings.
- Options page allows users to control:
  - Fuzzy matching toggle.
  - Legal suffix stripping toggle.
  - Cache TTL in minutes.
  - Manual cache refresh.

### 4) Extension manifest (`manifest.json`)

- Uses `manifest_version: 3`.
- Registers:
  - `background.js` as the service worker.
  - `jquery.min.js` + `main.js` as content scripts on `*://*.linkedin.com/jobs/*`.
  - Popup and options pages.
- Requests:
  - `tabs` and `storage` permissions.
  - Google Sheets host permission for CSV fetches.

## Install (Developer Mode)

1. Clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder.
6. Open a LinkedIn job posting and test.

## Project Structure

- `manifest.json` — Chrome extension manifest and permissions.
- `background.js` — service worker logic, CSV cache, and matching.
- `main.js` — LinkedIn page integration, route handling, and badge rendering.
- `popup.html` / `popup.js` — extension popup entrypoint.
- `options.html` / `options.js` — configurable extension settings.
- `jquery.min.js` — bundled jQuery dependency used by the content script.
- `icons/` — extension icons.
- `Layoffsfyi_Tracker_layoffsfyitracker.2023-3-7.csv` — snapshot/reference CSV file.

## Notes & Limitations

- LinkedIn DOM class names and layout can change over time.
- Fuzzy matching may still miss uncommon aliases or over-match rare edge cases.
- The data source is external and fetched at runtime; availability depends on Google Sheets and layoffs.fyi tracker updates.

## Potential Improvements

- Add a confidence indicator (exact/fuzzy/alias) in the LinkedIn badge to explain why a company matched.
- Provide an allowlist/blocklist for company aliases in Options to reduce false positives.
- Add optional retry + timeout handling for CSV fetches and show a user-facing status when the data source is unavailable.
- Introduce automated tests for matching logic and CSV parsing with fixture data from layoffs.fyi.
- Consider publishing a lightweight changelog in the popup so users can see recent improvements and matching updates.

## Privacy

- The extension reads company names from LinkedIn job pages to perform the lookup.
- It fetches a public CSV from Google Sheets.
- Settings and cache are stored locally via Chrome extension storage.
- No backend server is used by this project.

## License

No license file is currently included. Add a `LICENSE` file if you want to define usage and distribution terms.
