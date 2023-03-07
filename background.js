chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if ((changeInfo.status === 'complete')) {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function (tabs) {
            if (tabs[0].url.includes("currentJobId=")) {
                chrome.tabs.sendMessage(tabs[0].id, {from: 'background', subject: 'urlChanged'});
            }
        });
    }
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.subject === 'checkCompany') {
        sendResponse({});
        fetch("https://docs.google.com/spreadsheets/d/1vAjibxwMZ2n0AE91NageAMCwwDAfUICjTj8BiaPa8NE/export?format=csv", {
            method: 'GET'
        }).then(response => response.text()).then(data => {
            let items = data.split("\r\n");
            for (let i = 0; i < items.length; i++) {
                if (items[i].trim().toLowerCase() == msg.company_name.toLowerCase()) {
                    chrome.tabs.query({
                        active: true,
                        currentWindow: true
                    }, function (tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, {from: 'background', subject: 'loadListed'});
                    });                    
                    break;
                }
            }
        }).catch(error => {
            console.log(error);
        });
    }
});