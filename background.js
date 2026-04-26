import { idnCheck } from "./checks/idnCheck.js";
import { domainAgeCheck } from "./checks/domainAgeCheck.js";
import { blacklistCheck } from "./checks/blacklistCheck.js";

const SKIP_PREFIXES = ["chrome://", "chrome-extension://", "about:", "file://", "edge://", "moz-extension://"];

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        if (SKIP_PREFIXES.some(p => tab.url.startsWith(p))) return;
        runChecks(tab.url, tabId);
    }
});

async function runChecks(url, tabId) {
    const { whitelist = [] } = await chrome.storage.local.get("whitelist");
    try {
        const hostname = new URL(url).hostname;
        if (whitelist.includes(hostname)) {
            clearBadge(tabId);
            return;
        }
    } catch { return; }

    let score = 0;
    let reasons = [];

    if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(url)) {
        score += 3;
        reasons.push("IP address used instead of domain");
    }

    if ((url.match(/-/g) || []).length > 5) {
        score += 2;
        reasons.push("Excessive hyphens in URL");
    }

    const keywords = ["login", "verify", "secure", "update", "account"];
    const matched = keywords.filter(w => url.toLowerCase().includes(w));
    if (matched.length > 0) {
        score += 1;
        reasons.push(`Suspicious keyword(s): ${matched.join(", ")}`);
    }

    if (idnCheck(url)) {
        score += 3;
        reasons.push("IDN homograph characters detected");
    }

    if (await domainAgeCheck(url)) {
        score += 3;
        reasons.push("Domain registered less than 30 days ago");
    }

    if (await blacklistCheck(url)) {
        score += 5;
        reasons.push("URL found in OpenPhish blacklist");
    }

    const suspicious = score >= 3;

    if (suspicious) {
        // 1. Red badge on icon — works on ALL pages including error pages
        chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
        chrome.action.setBadgeText({ tabId, text: "!" });
        chrome.action.setTitle({ tabId, title: `⚠️ PhishGuard: Suspicious site! Risk score: ${score}` });

        // 2. Desktop notification — pops up automatically, no page injection needed
        chrome.notifications.create(`phishguard-${tabId}-${Date.now()}`, {
            type: "basic",
            iconUrl: "icons/icon-128.png",
            title: "⚠️ PhishGuard: Suspicious Site Detected",
            message: reasons.join("\n"),
            priority: 2
        });

        // 3. Try to inject slide-in card (works on reachable pages)
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                func: showPhishGuardCard,
                args: [score, reasons]
            });
        } catch (_) {
            // Page may be unreachable or script-restricted — badge + notification already fired
        }
    } else {
        clearBadge(tabId);
    }
}

function clearBadge(tabId) {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({ tabId, title: "PhishGuard — No threats detected" });
}

// Self-contained — injected directly into the page context
function showPhishGuardCard(score, reasons) {
    if (document.getElementById("phishguard-card")) return;

    const hasPassword = document.querySelectorAll("input[type='password']").length > 0;
    if (hasPassword) reasons.push("Login form detected on page");

    const style = document.createElement("style");
    style.textContent = `
        @keyframes pg-in  { from { transform:translateY(120%); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes pg-out { from { transform:translateY(0); opacity:1; } to { transform:translateY(120%); opacity:0; } }
    `;
    document.head.appendChild(style);

    const card = document.createElement("div");
    card.id = "phishguard-card";
    card.style.cssText = `
        position:fixed; bottom:24px; right:24px; width:320px;
        background:#1e1b4b; color:#e0e7ff; border-radius:12px;
        box-shadow:0 8px 32px rgba(0,0,0,0.55); font-family:Arial,sans-serif;
        font-size:13px; z-index:2147483647; overflow:hidden;
        border:1px solid rgba(165,180,252,0.25);
        animation:pg-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
    `;

    const header = document.createElement("div");
    header.style.cssText = `display:flex; align-items:center; justify-content:space-between;
        background:#dc2626; padding:10px 14px;`;
    header.innerHTML = `
        <span style="font-weight:700;font-size:14px;">⚠️ PhishGuard Alert</span>
        <span style="font-size:11px;background:rgba(0,0,0,0.25);padding:2px 8px;
                     border-radius:99px;font-weight:700;">Risk: ${score}</span>
    `;

    const body = document.createElement("div");
    body.style.cssText = "padding:12px 14px;";

    const sub = document.createElement("p");
    sub.style.cssText = "margin:0 0 10px 0;color:#c7d2fe;font-size:12px;line-height:1.5;";
    sub.textContent = "This site shows signs of a phishing attempt. Proceed with caution.";

    const list = document.createElement("ul");
    list.style.cssText = "margin:0;padding:0;list-style:none;";
    reasons.forEach(r => {
        const li = document.createElement("li");
        li.style.cssText = `padding:5px 10px;margin-bottom:5px;background:rgba(220,38,38,0.15);
            border-left:3px solid #f87171;border-radius:4px;font-size:12px;
            color:#fca5a5;line-height:1.4;`;
        li.textContent = r;
        list.appendChild(li);
    });

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;margin-top:12px;";

    const dismissBtn = document.createElement("button");
    dismissBtn.textContent = "Dismiss";
    dismissBtn.style.cssText = `flex:1;padding:7px;background:#312e81;color:#e0e7ff;
        border:none;border-radius:6px;cursor:pointer;font-size:12px;`;
    dismissBtn.onclick = () => {
        card.style.animation = "pg-out 0.3s ease forwards";
        setTimeout(() => card.remove(), 300);
    };

    const leaveBtn = document.createElement("button");
    leaveBtn.textContent = "← Leave site";
    leaveBtn.style.cssText = `flex:1;padding:7px;background:#dc2626;color:white;
        border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;`;
    leaveBtn.onclick = () => window.history.back();

    btnRow.appendChild(dismissBtn);
    btnRow.appendChild(leaveBtn);
    body.appendChild(sub);
    body.appendChild(list);
    body.appendChild(btnRow);
    card.appendChild(header);
    card.appendChild(body);
    document.body.appendChild(card);
}