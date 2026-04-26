export async function domainAgeCheck(url) {
    try {
        const hostname = new URL(url).hostname;
        const cacheKey = `domainAge_${hostname}`;
        const cache = await chrome.storage.local.get(cacheKey);
 
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
 
        if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < TWELVE_HOURS)) {
            return cache[cacheKey].result;
        }
 
        const response = await fetch(`https://rdap.org/domain/${hostname}`);
        const data = await response.json();
 
        let result = false;
        if (data.events) {
            const regEvent = data.events.find(e => e.eventAction === "registration");
            if (regEvent) {
                const regDate = new Date(regEvent.eventDate);
                const ageDays = (Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24);
                result = ageDays < 30;
            }
        }
 
        await chrome.storage.local.set({
            [cacheKey]: { result, timestamp: Date.now() }
        });
 
        return result;
    } catch (e) {
        console.error("Domain age check failed", e);
        return false;
    }
}