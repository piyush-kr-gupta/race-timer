# Race Timer — Local-First Progressive Web App (PWA)

**Race Timer** is a production-quality, local-first Progressive Web App designed for focused work, interview preparation, system design practice, workouts, study sessions, routines, and chores.

> **Create a race consisting of tasks, assign a duration to every task, then start the race and work through the tasks while continuously seeing how much time remains.**

---

## ⚡ Core Highlights

- **100% Local-First & Zero Backend**: All application data, race templates, runs, notes, and preferences remain strictly on the user's device in browser **IndexedDB**. No server, no accounts, no telemetry, no network calls.
- **Drift-Free Timestamp Engine**: Elapsed and remaining times are mathematically calculated from epoch timestamps (`currentTime - startedAt - accumulatedPausedTime`) rather than unreliable `setInterval` decrements.
- **Interruption Recovery**: If your browser closes, computer sleeps, or the tab crashes, Race Timer detects the active race upon reopening and lets you immediately resume, restart, or discard with exact elapsed time preservation.
- **Fixed / Sticky High-Urgency Timer**: The timer remains pinned to the top of the viewport during scrolling, rendering large typography readable across a room.
- **Dual Timers**: Distinct current task timer (e.g. `08:32`) alongside the overall race timer (`42:18 remaining`).
- **Overtime & Time-Overrun Mode**: Never cuts you off abruptly. Tracks both task overtime (`+02:17`) and overall race overtime (`+05:42`) with distinct visual feedback.
- **Audio Synthesizer (Native Web Audio API)**: Zero audio asset network requests or missing files. Generates crisp, offline dual-tone warnings, task completion chimes, and victory fanfare chords.
- **Screen Wake Lock API**: Prevents screen dimming or device sleep during active races, with automatic reacquisition when returning to the tab.
- **Distraction-Free Focus Mode & Fullscreen**: Maximizes focus by hiding secondary chrome and highlighting the dominant timer.
- **Keyboard Shortcuts**: Effortless control via `Space` (Play/Pause), `Enter` (Complete), `S` (Skip), `R` (Restart Task), `F` (Focus Mode), and `Esc`.
- **Installable PWA**: Includes a full Web App Manifest, Service Worker offline caching via Workbox, custom responsive icons, and standalone app display.

---

## 💾 Local Data Management & Backups

In accordance with strict local data ownership:

1. **Seed Data Always Available**: Ships pre-loaded with realistic races across multiple categories:
   - *Google L5 Coding & Algorithms Practice* (65 min)
   - *System Design: Distributed URL Shortener* (50 min)
   - *Classic Pomodoro Sprint* (30 min)
   - *90-Minute Deep Work Routine* (90 min)
   - *15-Minute HIIT Circuit* (15 min)
   - *Apartment Power Clean* (30 min)
   - Can be reset at any time from **Settings → Reset Seed Data** without overwriting custom user-created races.
2. **Bulk Export as ZIP**: Packs a full backup into a single `.zip` file containing:
   - `backup.json`: Structured, versioned JSON dataset.
   - `race_templates.csv`: Spreadsheet view of all races, categories, tags, and tasks.
   - `race_history.csv`: Spreadsheet log of historical runs, actual vs. allocated times, and overtime.
   - `metadata.json`: Export timestamp and schema versioning.
   - `README.txt`: Plaintext instructions for local restoration.
3. **Bulk Export as JSON**: 1-click structured JSON download.
4. **Export as CSV**: Separate CSV downloads for Templates and Execution History.
5. **Bulk Import from JSON / CSV / ZIP**:
   - Automatic schema validation and preview of template and run counts before import.
   - **Never silently overwrites data**. Offers clear **Merge** (appends new races without touching existing data) or **Replace** (complete wipe and restore) options with confirmation.
6. **Last Backup Indicator**: Displays `Last backup: [date/time]` to encourage safe local hygiene.

---

## 🏗️ Architecture

```text
race_timer/
├── public/                     # Static PWA assets (favicon.svg, manifest, PNG icons)
├── src/
│   ├── types/
│   │   └── race.ts             # Domain models (RaceTemplate, Task, RaceRun, TaskRun, Settings)
│   ├── services/
│   │   ├── storage/
│   │   │   ├── indexedDb.ts    # Promisified typed IndexedDB database service
│   │   │   └── seedData.ts     # Realistic demo templates and sample runs
│   │   ├── timer/
│   │   │   ├── timerEngine.ts  # Pure timestamp-based state machine & calculations
│   │   │   ├── audioService.ts # Native Web Audio API synthesizer
│   │   │   ├── wakeLock.ts     # Screen Wake Lock API service with visibility listeners
│   │   │   └── notificationService.ts # Browser notification manager
│   │   └── data/
│   │       ├── csvHelper.ts    # RFC 4180 CSV serializer and parser
│   │       ├── exportService.ts# JSON, CSV, and JSZip export generator
│   │       └── importService.ts# JSON, CSV, and ZIP parser with validation and preview
│   ├── utils/
│   │   └── duration.ts         # Intuitive duration parser ("5", "5m", "05:00", "1h", "90")
│   ├── hooks/
│   │   ├── useSettings.ts      # Settings state and theme manager (System / Dark / Light)
│   │   ├── useRaces.ts         # Templates, runs CRUD, duplication, archiving
│   │   ├── useTimerEngine.ts   # Connects React to TimerEngine and persistence callbacks
│   │   └── useKeyboardShortcuts.ts # Space, Enter, S, R, F, Esc shortcuts
│   └── components/
│       ├── common/             # Header, ConfirmDialog, Toast, ProgressBar, ShortcutsModal
│       ├── dashboard/          # RaceDashboard, RaceCard, QuickStartModal
│       ├── editor/             # RaceEditor, TaskItem, DurationInput
│       ├── player/             # RacePlayer, StickyTimerHeader, TaskTimeline, InterruptionModal
│       ├── results/            # RaceResults (variance, fastest/slowest, task audit table)
│       ├── history/            # RaceHistoryView (execution logs, run again, delete)
│       └── settings/           # SettingsView, DataManagementSection, ImportPreviewModal
```

---

## ⏱️ Drift-Free Timer Math

The timer never subtracts a second per interval tick. Instead:

$$\text{Elapsed} = \text{CurrentTime} - \text{StartedAt} - \text{AccumulatedPausedTime}$$

$$\text{Remaining} = \max(0, \text{AllocatedDuration} - \text{Elapsed})$$

$$\text{Overtime} = \max(0, \text{Elapsed} - \text{AllocatedDuration})$$

This guarantees that whether a mobile device sleeps for 45 minutes or the user switches tabs, reopening the application immediately recalculates the exact time without a single millisecond of drift.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`Space`** | Play / Pause timer |
| **`Enter`** | Complete current task and advance |
| **`S`** | Skip current task |
| **`R`** | Restart current task's timer |
| **`F`** | Toggle Distraction-free Focus Mode |
| **`Esc`** | Exit Focus Mode / Close modal dialog |

*(Shortcuts are automatically suspended when typing in text fields or can be disabled in Settings.)*

---

## 🚀 Development & Build Commands

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

### Run Vitest test suite
```bash
npm run test
```

### Build production PWA bundle
```bash
npm run build
```

### Preview production build locally
```bash
npm run preview
```

---

## 🌐 Browser Support & Known Limitations

- **Storage**: IndexedDB is supported across all modern browsers (Chrome, Edge, Firefox, Safari, iOS Safari, Android Chrome). Storage quotas typically exceed several gigabytes.
- **Wake Lock API**: Supported on Chromium-based browsers (Chrome, Edge, Opera) and Safari 16.4+. On older or unsupported browsers, the app functions normally without throwing errors.
- **Audio Autoplay**: Modern browsers require one user interaction (such as tapping Play) before playing synthesized audio.
- **PWA Installation**: Supported natively on Android, Windows, macOS, and iOS (via Safari "Add to Home Screen").
