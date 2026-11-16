# Anchors

A small offline habit app for the phone. It shows the one next thing, counts the minimum as done, and keeps a trace of what you actually did.

- Plain HTML, CSS and JavaScript. No build step, no server, no account.
- Works offline once opened (service worker, cache-first).
- Everything you type stays in the browser's storage on your own device. Nothing personal is in this repository.

## Install on an iPhone

1. Open the site in Safari.
2. Tap Share, then Add to Home Screen, then Add.
3. Open Anchors from the home screen once while online. After that it works in airplane mode.

Save a backup from More every couple of weeks. The backup is one JSON file that you can restore on any phone.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The five screens: Today, Journal, Body, Progress, More |
| `styles.css` | The look, light and dark |
| `data.js` | The starting content: habits, blocks, routines, the free-time menu, special dates |
| `app.js` | All behaviour |
| `sw.js` | Offline cache. Bump `CACHE` on every change so phones pick up the new version |
| `test.js` | Smoke test with Playwright |

## Change the content

Edit `data.js`. Habits switch on by block: block 0 is always on, block 1 from its start date, later blocks at their dates. The wording of each habit, the times, the block dates and the free-time menu can also be changed inside the app, under More.

## Test

```
python3 -m http.server 8765
node test.js            # add SHOTS=some/folder to save screenshots
```
