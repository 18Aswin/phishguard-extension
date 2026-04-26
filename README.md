# PhishGuard

A Chrome extension that automatically detects suspicious and phishing websites in real time — before you interact with them.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4f46e5?style=flat&logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-312e81?style=flat)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## Features

- **Automatic alerts** — Detects threats the moment a page loads, no clicking required
- **Multi-layer detection engine** using:
  - IP address in URL
  - Excessive hyphens in domain
  - Suspicious keyword matching
  - IDN homograph character detection
  - Domain age check via RDAP (flags domains < 30 days old)
  - Real-time blacklist check via [OpenPhish](https://openphish.com)
- **Risk scoring model** — Signals are weighted and scored; alerts only fire above a threshold to minimise false positives
- **Caching** — blacklist feed and domain age results are cached locally to avoid redundant API calls
- **Whitelist support** — trust a site permanently with one click from the popup

---

## Installation

> PhishGuard is not yet on the Chrome Web Store. Install it manually in developer mode.

1. Clone or download this repository
   ```bash
   git clone https://github.com/18Aswin/phishguard-extension.git
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (top-right toggle)

4. Click **Load unpacked** and select the `phishguard-extension` folder

5. Pin the extension from the 🧩 puzzle icon in your toolbar

---

## File Structure

```
phishguard-extension/
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── checks/
│   ├── blacklistCheck.js     # OpenPhish feed lookup with caching
│   ├── domainAgeCheck.js     # RDAP domain registration age check with caching
│   ├── formCheck.js          # Password form detection
│   └── idnCheck.js           # IDN homograph character detection
├── background.js             # Service worker — runs all checks, sets badge, fires notification
├── content.js                # Page-level script placeholder
├── manifest.json             # Extension manifest (MV3)
├── popup.html                # Popup UI markup
└── popup.js                  # Popup logic — shows risk score and whitelist controls
```

---

## How It Works

When you navigate to any page, `background.js` runs a series of checks against the URL:

| Check | Signal Strength | Score |
|---|---|---|
| IP address in URL | Strong | +3 |
| IDN homograph characters | Strong | +3 |
| Domain age < 30 days | Strong | +3 |
| Excessive hyphens (> 5) | Medium | +2 |
| Login form on page | Medium | +2 |
| OpenPhish blacklist hit | Definitive | +5 |
| Suspicious keywords | Weak | +1 |

If the total score reaches **3 or above**, PhishGuard fires:
1. A desktop notification (works on all pages)
2. A red `!` badge on the extension icon
3. A slide-in alert card inside the page (on reachable pages)

---

## Tech Stack

- **JavaScript (ES Modules)**
- **Chrome Extensions Manifest V3**
- **RDAP API** — for domain registration data
- **OpenPhish** — for live phishing URL feed
- **chrome.storage.local** — for caching and whitelist persistence

---

## Testing

| URL | Expected Result |
|---|---|
| `http://192.168.1.1` | 🔴 Suspicious — IP address |
| `http://secure-verify-login-update-account-test.com` | 🔴 Suspicious — hyphens + keywords |
| `https://google.com` | ✅ Clean |
| `https://wikipedia.org` | ✅ Clean |

---

## Roadmap

- [ ] ML-based URL classification
- [ ] Visual similarity detection against known brand domains
- [ ] Chrome Web Store release
- [ ] Firefox port (Manifest V2 compatible)

---

## Author

**Aswin**
[Substack](https://nymphadorus.substack.com)

---

## License

MIT License — free to use, modify, and distribute.
