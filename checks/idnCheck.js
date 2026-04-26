export function idnCheck(url) {
    try {
        const hostname = new URL(url).hostname;
        return /[^\x00-\x7F]/.test(hostname);
    } catch {
        return false;
    }
}