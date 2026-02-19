const SETTINGS_KEY = 'userSettings';

const DEFAULT_SETTINGS = {
  fuzzyMatching: true,
  removeSuffixes: true,
  cacheTtlMinutes: 60
};

async function loadSettings() {
  const data = await chrome.storage.sync.get(SETTINGS_KEY);
  const settings = { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) };

  document.getElementById('fuzzyMatching').checked = settings.fuzzyMatching;
  document.getElementById('removeSuffixes').checked = settings.removeSuffixes;
  document.getElementById('cacheTtlMinutes').value = settings.cacheTtlMinutes;
}

async function saveSettings() {
  const payload = {
    fuzzyMatching: document.getElementById('fuzzyMatching').checked,
    removeSuffixes: document.getElementById('removeSuffixes').checked,
    cacheTtlMinutes: Math.min(1440, Math.max(1, Number(document.getElementById('cacheTtlMinutes').value || 60)))
  };

  await chrome.storage.sync.set({ [SETTINGS_KEY]: payload });
  document.getElementById('status').textContent = 'Settings saved.';
}

function refreshCache() {
  chrome.runtime.sendMessage({ subject: 'refreshCache' }, (response) => {
    if (response?.ok) {
      document.getElementById('status').textContent = 'Cache refreshed.';
    } else {
      document.getElementById('status').textContent = 'Cache refresh failed.';
    }
  });
}

document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('refreshCacheBtn').addEventListener('click', refreshCache);

loadSettings();
