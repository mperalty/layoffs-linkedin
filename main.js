chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.subject === 'urlChanged') {
        sendResponse({});
        get_company_name();
    }

    if (msg.subject === 'loadListed') {
        sendResponse({});
        if ($("#listed_on_layoffs").length) {
            $("#listed_on_layoffs").remove();
        }
        $('<span id="listed_on_layoffs" style="padding:8px;"><a href="https://www.layoffs.fyi" style="font-size:18px; color:#aa0000;" target="_blank">Listed on Layoffs.fyi</a></span>').insertBefore($('.jobs-apply-button--top-card').eq(0));
    }
});

function get_company_name() {
    let interval = setInterval(function () {
        if ($('.jobs-unified-top-card__company-name').length && $('.jobs-unified-top-card__company-name').text()) {
            clearInterval(interval);
            let company_name = $('.jobs-unified-top-card__company-name a').text().trim();
            chrome.runtime.sendMessage({
                from: 'content',
                subject: 'checkCompany',
                company_name: company_name
            });
        }
    }, 1000);
}