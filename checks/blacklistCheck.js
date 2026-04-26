export async function blacklistCheck(url) {
    try {
        const cacheKey = "blacklistFeed";
        const cache = await chrome.storage.local.get(cacheKey);
 
        let feedText;
        const SIX_HOURS = 6 * 60 * 60 * 1000;
 
        if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < SIX_HOURS)) {
            feedText = cache[cacheKey].text;
        } else {
            const response = await fetch("https://openphish.com/feed.txt");
            feedText = await response.text();
            await chrome.storage.local.set({
                [cacheKey]: { text: feedText, timestamp: Date.now() }
            });
        }
 
        return feedText.includes(url);
    } catch (e) {
        console.error("Blacklist check failed", e);
        return false;
    }
}