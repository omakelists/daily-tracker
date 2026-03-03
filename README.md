# Daily Tracker

A no-build-step PWA for tracking daily, weekly, monthly, and biweekly tasks across multiple games.

![Preview](preview.png)

## Features

- **Task types** — Daily · Weekly · Monthly · Biweekly · Web Daily (each with independent reset time)
- **Accordion cards** — Tap ▼ on any game to collapse its daily tasks; auto-collapses when all daily tasks are checked; unchecked periodic tasks remain visible even when collapsed
- **Drag & drop reordering** — Reorder games and individual tasks freely inside Settings
- **Yesterday indicator** — Thin colored bar on each daily task shows prior-period completion
- **Sound effects** — Subtle audio feedback on check / all-done
- **PWA installable** — Works offline after first load (Service Worker caches all assets + CDN)
- **UTC time storage** — All reset times stored as UTC; Settings UI displays and accepts your local timezone
- **CSS design tokens** — All layout measurements and palette colors live in `style.css` as `--custom-properties`

## Supported Languages

| Code | Language |
|------|----------|
| `en` | English |
| `ja` | 日本語 |
| `zh-Hans` | 简体中文 |
| `zh-Hant` | 繁體中文 |
| `ko` | 한국어 |
| `es` | Español |

Language is detected automatically from `navigator.language`.  
Traditional Chinese loads for `zh-Hant`, `zh-TW`, `zh-HK`, `zh-MO`, and `zh-hant` script-tag variants; all other `zh-*` codes use Simplified Chinese.

## Time Zone Handling

Reset times are **stored internally as UTC**. The Settings UI converts UTC to your local browser time for display, and converts back to UTC when you save. This ensures consistent behavior regardless of where a device is used.

> **Example:** A Japanese player setting "05:00" local time (JST = UTC+9) sees "05:00" in Settings. The stored value is "20:00 UTC". Another device in UTC+0 shows "20:00".

## Deployment

### GitHub Pages

1. Push the repository contents to a branch (e.g. `main`)
2. Enable **Pages** in repository Settings → Source: `main` / `/ (root)`
3. Access via `https://<user>.github.io/<repo>/`

### Local development

```bash
python -m http.server 8080   # Python 3
npx serve .                  # Node.js
```

Open `http://localhost:8080`. Service Worker requires HTTP (not `file://`).

## File Structure

```
├── index.html          # Import map + entry point
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (cache-first)
├── style.css           # Global styles + CSS design tokens (:root variables)
├── preview.png         # README preview image
├── icon-192.png
├── icon-512.png
├── locales/
│   ├── en.json
│   ├── ja.json
│   ├── zh-Hans.json      # Simplified Chinese
│   ├── zh-Hant.json      # Traditional Chinese
│   ├── ko.json
│   └── es.json
└── src/
    ├── main.js         # Entry — i18n init → render
    ├── App.js          # Root component, state management
    ├── GameCard.js     # Game card with accordion
    ├── TaskRow.js      # Individual task row
    ├── Settings.js     # Settings modal with drag & drop
    ├── Calendar.js     # History calendar modal
    ├── UI.js           # Shared primitives (Row, Modal, …)
    ├── i18n.js         # Locale loading & t()
    ├── storage.js      # localStorage wrapper
    ├── helpers.js      # UTC date / countdown / sound helpers
    └── constants.js    # Task types, UTC utils, default data
```

## CSS Design Tokens

All magic numbers and palette colors are declared as CSS custom properties in `style.css`:

```css
:root {
  --row-pl: 14px;         /* Row left padding */
  --bar-slot: 18px;       /* Width of accordion/prev-bar slot */
  --cb-w: 26px;           /* Checkbox size */
  --type-daily: #58a6ff;  /* Task type colors */
  --cd-urgent: #f85149;   /* Countdown urgency colors */
  /* … */
}
```

## Browser Requirements

- Import maps: Chrome 89+, Firefox 108+, Safari 16.4+
- No Babel, no build tools
