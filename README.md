# Quiet Progress 2.0

An iPhone-first habit, task, mood and weight tracker, built from the original
`quiet-progress-tracker.html`. It installs to the Home Screen, opens full-screen
like a native app and works offline. All data stays on the device.

## What's in it

| Tab | What you do there |
|---|---|
| **Today** | Tick habits, plan/finish tasks and log weight. A ring shows how much of the day is done, a week strip lets you jump between days, and unfinished tasks from earlier days show up under "Carried over". |
| **Brief** | Write a short brief for each day: a main focus plus free text, with one-tap starters (Top 3, Watch out for, Wins…). It saves as you type, and shows the day's habits and scheduled tasks at a glance, a writing streak, and a searchable list of past briefs. |
| **Habits** | Daily or 1–6× per week habits with icons and colours. Streaks (current and best), 30-day rate, 16-week heatmap, a full-year detail view (tap a square to fix a missed tick), archive or delete. **Month grid** is the classic spreadsheet view. |
| **Tasks** | A Mon–Sun week board with a progress ring and chart, search across every task, and quick-add shortcuts: `9:30 gym`, `7pm dinner !!` (time at the start; `!` / `!!` / `!!!` at the end sets priority). Each task has notes, a priority, and can be moved to the next day, next week or any date. |
| **Weight** | Enter weights for any date. You get a 7-day smoothed trend, rate per week, 30-day change, an estimated goal date, optional BMI, range filters (1M–All), monthly averages and history with delete. |
| **Insights** | A yearly dashboard: month-by-month habit % and task completion, a heatmap of every day, a habit leaderboard, your strongest/weakest weekday, and whether days with a brief get more done. |
| **Settings** (gear) | Auto/dark/light theme, kg/lb (with conversion), height, backup/restore, CSV export, erase. |

Deletes show an **Undo** toast. Backups from the original HTML tracker are converted automatically when restored.

## Live app

**https://markidis-altus.github.io/quiet-progress/**

Every push to `main` builds the app and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`). Installed copies pick up the new version the
next time they're opened online; data on the phone is untouched.

## Put it on your iPhone

1. Open the link above in **Safari** (not Chrome).
2. Tap **Share → Add to Home Screen → Add**.
3. Open the app **from the new icon**. The Home Screen app has its own storage, separate from Safari.

### Bring your existing data across
1. On the computer, open the old `quiet-progress-tracker.html` and press **Backup**.
2. Put that `.json` file in iCloud Drive (or AirDrop it to the phone → Save to Files).
3. In the installed app: **Settings → Restore from a backup file** and pick it.

### Keep it safe
iPhone can clear website data, so use **Settings → Back up** now and then.
On iPhone it opens the share sheet: choose **Save to Files** and pick iCloud Drive.
The Today screen reminds you if it's been more than a week since your last backup.

## On a computer
`dist/index.html` is a single self-contained file. Double-click it to use the app in
any browser (offline caching needs https, but everything else works).

## Development
```bash
npm run dev      # live-reload dev server (also reachable from your phone on the same Wi-Fi)
npm run build    # type-check + build into dist/
npm run icons    # regenerate the app icons
```
Stack: React 18 + TypeScript + Vite, no runtime dependencies beyond React. Charts are hand-written SVG.
The data model is in `src/lib/types.ts`, the v1 → v2 import is in `src/lib/migrate.ts`, and scoring/streaks are in `src/lib/stats.ts`.
