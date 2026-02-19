# Layoff Check (LinkedIn Chrome Extension)

Layoff Check is a lightweight Chrome extension that helps job seekers quickly see whether the company on a LinkedIn job posting appears in the layoffs.fyi company tracker.

When you open a LinkedIn job page, the extension:

1. Detects the currently viewed job/company.
2. Fetches the layoffs.fyi tracker data (published as CSV from Google Sheets).
3. If the company name matches, injects a visible **"Listed on Layoffs.fyi"** indicator near the apply button.

## Features

- Works directly on LinkedIn Jobs pages.
- Checks company names against the public layoffs.fyi tracker.
- Adds a clear, clickable warning link to layoffs.fyi.
- Uses a Manifest V3 service worker.

## How it Works

### 1) Content script (`main.js`)

- Listens for background messages:
  - `urlChanged` to trigger a fresh company lookup.
  - `loadListed` to render the "Listed on Layoffs.fyi" badge in the page UI.
- Polls the LinkedIn job card area until the company name is available.
- Sends `checkCompany` to the background script with the extracted company name.

### 2) Background service worker (`background.js`)

- Watches tab updates and notifies the content script when a LinkedIn job URL changes (detected by `currentJobId=`).
- On `checkCompany`, downloads the layoffs tracker CSV from Google Sheets.
- Performs a case-insensitive exact-line match against the company name.
- If matched, sends `loadListed` back to the content script.

### 3) Extension manifest (`manifest.json`)

- Uses `manifest_version: 3`.
- Registers:
  - `background.js` as the service worker.
  - `jquery.min.js` + `main.js` as content scripts on `*://*.linkedin.com/jobs/*`.
- Requests:
  - `tabs` permission.
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
- `background.js` — service worker logic, CSV fetch, and matching.
- `main.js` — LinkedIn page integration and badge injection.
- `jquery.min.js` — bundled jQuery dependency used by the content script.
- `icons/` — extension icons.
- `Layoffsfyi_Tracker_layoffsfyitracker.2023-3-7.csv` — snapshot/reference CSV file.

## Notes & Limitations

- Matching is currently a strict case-insensitive string comparison.
  - Variants like punctuation, legal suffixes, or alternate naming may not match.
- The extension relies on LinkedIn DOM class names and layout, which can change over time.
- The data source is external and fetched at runtime; availability depends on Google Sheets and layoffs.fyi tracker updates.

## Privacy

- The extension reads company names from LinkedIn job pages to perform the lookup.
- It fetches a public CSV from Google Sheets.
- No backend server is used by this project.

## Future Improvements

- Fuzzy/normalized company name matching.
- Caching the CSV to reduce repeated network requests.
- Better handling of LinkedIn SPA route transitions.
- Optional popup/options page for user settings.

## License

No license file is currently included. Add a `LICENSE` file if you want to define usage and distribution terms.
