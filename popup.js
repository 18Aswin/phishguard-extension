import { idnCheck } from "./checks/idnCheck.js";
import { domainAgeCheck } from "./checks/domainAgeCheck.js";
import { blacklistCheck } from "./checks/blacklistCheck.js";

async function cachedDomainAgeCheck(url) {
    const hostname = new URL(url).hostname;
    const cacheKey = `domainAge_${hostname}`;
    const cache = await chrome.storage.local.get(cacheKey);

    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < 12*60*60*1000)) {
        return cache[cacheKey].result;
    }

    const result = await domainAgeCheck(url);
    await chrome.storage.local.set({ [cacheKey]: { result, timestamp: Date.now() } });
    return result;
}

async function cachedBlacklistCheck(url) {
    const cacheKey = `blacklistFeed`;
    const cache = await chrome.storage.local.get(cacheKey);

    let feedText;
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < 6*60*60*1000)) {
        feedText = cache[cacheKey].text;
    } else {
        const response = await fetch("https://openphish.com/feed.txt");
        feedText = await response.text();
        await chrome.storage.local.set({ [cacheKey]: { text: feedText, timestamp: Date.now() } });
    }

    return feedText.includes(url);
}

chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    const url = tabs[0].url;
    let suspicious = false;
    let reasons = [];

    // Basic checks
    if ((url.match(/-/g) || []).length > 5) {
        suspicious = true;
        reasons.push("Too many hyphens");
    }
    if (/\d+\.\d+\.\d+\.\d+/.test(url)) {
        suspicious = true;
        reasons.push("IP address in URL");
    }

    const keywords = ["login", "verify", "secure", "update", "account"];
    keywords.forEach(word => {
        if (url.toLowerCase().includes(word)) {
            suspicious = true;
            reasons.push(`Contains keyword: ${word}`);
        }
    });

    if (idnCheck(url)) {
        suspicious = true;
        reasons.push("IDN homograph detected");
    }

    // Inject content script to check for password forms
    chrome.scripting.executeScript(
        {
            target: {tabId: tabs[0].id},
            func: () => {
                return document.querySelectorAll("input[type='password']").length > 0;
            }
        },
        async (results) => {
            const hasPasswordForm = results && results[0].result;
            if (hasPasswordForm) {
                suspicious = true;
                reasons.push("Login form detected");
            }

            if (await cachedDomainAgeCheck(url)) {
                suspicious = true;
                reasons.push("Domain age < 30 days");
            }

            if (await cachedBlacklistCheck(url)) {
                suspicious = true;
                reasons.push("Listed in OpenPhish blacklist");
            }

            const statusEl = document.getElementById("status");
            if (suspicious) {
                statusEl.innerText = "‼️ Suspicious URL detected\nReasons:\n- " + reasons.join("\n- ");
            } else {
                statusEl.innerText = "✅ No obvious threats";
            }
        }
    );
});
