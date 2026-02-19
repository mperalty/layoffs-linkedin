const BADGE_ID = 'listed_on_layoffs';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.subject === 'urlChanged') {
        sendResponse({});
        getCompanyName();
    }

    if (msg.subject === 'loadListed') {
        sendResponse({});
        renderListedBadge();
    }

    if (msg.subject === 'clearListed') {
        sendResponse({});
        removeListedBadge();
    }
});

function removeListedBadge() {
    const existing = document.getElementById(BADGE_ID);
    if (existing) {
        existing.remove();
    }
}

function renderListedBadge() {
    removeListedBadge();

    const target = document.querySelector('.jobs-apply-button--top-card');
    if (!target || !target.parentElement) {
        return;
    }

    const badge = document.createElement('span');
    badge.id = BADGE_ID;
    badge.style.padding = '8px';
    badge.innerHTML = '<a href="https://www.layoffs.fyi" style="font-size:18px; color:#aa0000;" target="_blank" rel="noopener noreferrer">Listed on Layoffs.fyi</a>';

    target.parentElement.insertBefore(badge, target);
}

function extractCompanyName() {
    const selector = '.jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name a';
    const el = document.querySelector(selector);
    return el?.textContent?.trim();
}

function getCompanyName() {
    removeListedBadge();

    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(() => {
        const companyName = extractCompanyName();
        attempts += 1;

        if (companyName) {
            clearInterval(interval);
            chrome.runtime.sendMessage({
                from: 'content',
                subject: 'checkCompany',
                company_name: companyName
            });
        } else if (attempts >= maxAttempts) {
            clearInterval(interval);
        }
    }, 400);
}

function watchSpaTransitions() {
    let previousUrl = location.href;

    const onRouteChange = () => {
        if (location.href !== previousUrl) {
            previousUrl = location.href;
            getCompanyName();
        }
    };

    const wrapHistoryMethod = (methodName) => {
        const original = history[methodName];
        history[methodName] = function () {
            const result = original.apply(this, arguments);
            onRouteChange();
            return result;
        };
    };

    wrapHistoryMethod('pushState');
    wrapHistoryMethod('replaceState');

    window.addEventListener('popstate', onRouteChange);

    const observer = new MutationObserver(() => {
        onRouteChange();
    });

    observer.observe(document.body, {
        subtree: true,
        childList: true
    });
}

watchSpaTransitions();
getCompanyName();
