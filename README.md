# Daily Tracker

A progressive web app for tracking daily, weekly, and periodic tasks in games — with per-game reset times, yesterday's check history, and offline support.

> **Note:** This project was generated with the assistance of [Claude](https://claude.ai) by Anthropic.

---

## Features

- **Multiple game groups** — each with its own daily reset time and color
- **Task types** — Daily, Weekly, Web Daily (separate reset time), Monthly (custom reset day), and Biweekly (1st & 16th)
- **Master checkbox** — checks/unchecks all daily tasks in a group at once
- **Yesterday indicator** — a subtle colored bar on the left of each row shows whether yesterday's tasks were completed (green = done, red = missed)
- **Countdown timer** — shows time remaining until the next reset; turns yellow under 6 hours, red under 3 hours
- **Auto-sort** — fully completed game groups slide to the bottom automatically
- **Check-off sound** — audio feedback on task completion, with a fanfare when all tasks are done
- **Calendar history** — review past completion by game and task in a monthly calendar view
- **Multilingual** — automatically adapts to the browser's language setting: English, Japanese (日本語), Chinese (中文), Korean (한국어), and Spanish (Español)
- **PWA / installable** — works offline and can be installed to the desktop or home screen
- **localStorage persistence** — all data is stored locally in the browser; no account or server required

---

## File Structure

```
daily-tracker/
├── index.html      # Full application (React + Babel, loaded from CDN)
├── manifest.json   # PWA manifest (name, icons, display mode)
├── sw.js           # Service Worker (offline caching)
├── icon-192.png    # App icon (192×192)
└── icon-512.png    # App icon (512×512)
```

---

## Deploying to GitHub Pages

1. Create a new GitHub repository (e.g. `daily-tracker`)
2. Upload all five files to the repository root
3. Go to **Settings → Pages → Source**, select the `main` branch and `/ (root)`, then click **Save**
4. Your app will be available at `https://<your-username>.github.io/daily-tracker/`
5. Visit the URL in Chrome or Edge — an install button will appear in the address bar

---

## Local Usage

No build step is required. Simply open `index.html` in a browser.

```bash
# Option 1: open directly
open index.html

# Option 2: serve locally (recommended for PWA install prompt)
npx serve .
# or
python3 -m http.server 8080
```

> The Service Worker and PWA install prompt require the page to be served over HTTPS or `localhost`. Opening as a plain `file://` URL disables those features but the app itself will still work.

---

## Task Types

| Type | Label | Reset schedule |
|---|---|---|
| `daily` | Daily | Every day at the game's reset time |
| `weekly` | Weekly | Every Monday at the game's reset time |
| `webdaily` | Web Daily | Every day at a separately configured reset time |
| `monthly` | Monthly | On a configurable day of the month (default: 1st) |
| `halfmonthly` | Biweekly | On the 1st and 16th of each month |

---

## Data Storage

All game configurations and check history are stored in the browser's `localStorage` under the keys:

- `dailytracker:games` — game and task configuration
- `dailytracker:checks` — per-period check records

No data is sent to any server.

---

## Supported Languages

The UI language is selected automatically based on `navigator.language`:

| Language | Code |
|---|---|
| English | `en` (default) |
| Japanese | `ja` |
| Chinese (Simplified) | `zh` |
| Korean | `ko` |
| Spanish | `es` |

---

## Technology

- [React 18](https://react.dev) — UI rendering (loaded via CDN, no build required)
- [Babel Standalone](https://babeljs.io/docs/babel-standalone) — JSX transpilation in the browser
- Web Audio API — check-off sounds
- Service Worker API — offline caching
- localStorage — persistent data storage

---

## License

MIT — free to use, modify, and distribute.

---

*Generated with [Claude](https://claude.ai) by Anthropic.*
