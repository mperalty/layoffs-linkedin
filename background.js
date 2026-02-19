const CSV_URL = 'https://docs.google.com/spreadsheets/d/1vAjibxwMZ2n0AE91NageAMCwwDAfUICjTj8BiaPa8NE/export?format=csv';
const CACHE_KEY = 'layoffsCsvCache';
const SETTINGS_KEY = 'userSettings';

const DEFAULT_SETTINGS = {
    fuzzyMatching: true,
    removeSuffixes: true,
    cacheTtlMinutes: 60
};

async function getSettings() {
    const data = await chrome.storage.sync.get(SETTINGS_KEY);
    return {
        ...DEFAULT_SETTINGS,
        ...(data[SETTINGS_KEY] || {})
    };
}

function normalizeCompanyName(name, removeSuffixes = true) {
    if (!name) {
        return '';
    }

    let normalized = name
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!removeSuffixes) {
        return normalized;
    }

    const suffixPattern = /\b(inc|llc|ltd|limited|corp|corporation|co|company|plc|gmbh|sa|nv|holdings?)\b/g;
    normalized = normalized.replace(suffixPattern, '').replace(/\s+/g, ' ').trim();
    return normalized;
}

function levenshteinDistance(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

function isFuzzyMatch(target, candidate) {
    if (!target || !candidate) {
        return false;
    }

    if (target === candidate || target.includes(candidate) || candidate.includes(target)) {
        return true;
    }

    const maxLen = Math.max(target.length, candidate.length);
    const distance = levenshteinDistance(target, candidate);
    return distance <= Math.max(1, Math.floor(maxLen * 0.15));
}

async function getCachedCsvData(settings) {
    const cacheData = await chrome.storage.local.get(CACHE_KEY);
    const cache = cacheData[CACHE_KEY];
    const now = Date.now();
    const ttlMs = Number(settings.cacheTtlMinutes) * 60 * 1000;

    if (cache && now - cache.timestamp < ttlMs && Array.isArray(cache.items)) {
        return cache.items;
    }

    const response = await fetch(CSV_URL, { method: 'GET' });
    const data = await response.text();
    const items = parseCsvCompanyNames(data);

    await chrome.storage.local.set({
        [CACHE_KEY]: {
            timestamp: now,
            items
        }
    });

    return items;
}

function parseCsvLine(line) {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            current += '"';
            i += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    cells.push(current.trim());
    return cells;
}

function parseCsvCompanyNames(csvText) {
    const lines = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (!lines.length) {
        return [];
    }

    const headerCells = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
    const companyColumnIndex = headerCells.findIndex((cell) =>
        ['company', 'company name', 'name'].includes(cell)
    );

    const startIndex = companyColumnIndex === -1 ? 0 : 1;
    const names = lines
        .slice(startIndex)
        .map((line) => {
            const cells = parseCsvLine(line);
            if (companyColumnIndex === -1) {
                return cells[0];
            }

            return cells[companyColumnIndex];
        })
        .map((name) => name?.trim())
        .filter(Boolean);

    return [...new Set(names)];
}

function getCompanyMatch(companyName, csvItems, settings) {
    const normalizedTarget = normalizeCompanyName(companyName, settings.removeSuffixes);

    return csvItems.some((item) => {
        const normalizedCandidate = normalizeCompanyName(item, settings.removeSuffixes);
        if (normalizedCandidate === normalizedTarget) {
            return true;
        }

        if (!settings.fuzzyMatching) {
            return false;
        }

        return isFuzzyMatch(normalizedTarget, normalizedCandidate);
    });
}

function sendMessageToTab(tabId, subject) {
    chrome.tabs.sendMessage(tabId, {
        from: 'background',
        subject
    }).catch(() => {
        // Ignore in case the tab isn't ready for messages yet.
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url || !tab.url.includes('linkedin.com/jobs')) {
        return;
    }

    sendMessageToTab(tabId, 'urlChanged');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.subject === 'checkCompany') {
        (async () => {
            try {
                const settings = await getSettings();
                const csvItems = await getCachedCsvData(settings);
                const isMatch = getCompanyMatch(msg.company_name, csvItems, settings);

                if (isMatch && sender.tab?.id) {
                    sendMessageToTab(sender.tab.id, 'loadListed');
                } else if (sender.tab?.id) {
                    sendMessageToTab(sender.tab.id, 'clearListed');
                }
            } catch (error) {
                console.error('Failed company lookup', error);
            }
        })();

        sendResponse({ ok: true });
    }

    if (msg.subject === 'refreshCache') {
        (async () => {
            try {
                await chrome.storage.local.remove(CACHE_KEY);
                const settings = await getSettings();
                await getCachedCsvData(settings);
                sendResponse({ ok: true });
            } catch (error) {
                sendResponse({ ok: false, error: error.message });
            }
        })();

        return true;
    }
});
