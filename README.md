# 📚 StudyPulse

> A premium focus & study companion — Pomodoro timers, AI academic calendar intelligence, smart reminders, active recall flashcards, habit tracking, and analytics. Built with Capacitor for native Android delivery.

---

## ✨ Features

| Module | What it does |
|---|---|
| 🤖 **AI Academic Calendar & Timetable** *(NEW in v1.2)* | Upload academic schedules in **Excel (.xlsx, .xls)**, **CSV**, **PDF**, **Images (OCR)**, or **Text Circulars**. Automatically sorts events by degree programs (B-Tech, BCA/MCA/MBA, B.A/B.Com/B.Sc/BBA, 1st Year) with 1-click sync to Timetable slots, Exam countdowns, and Push Reminders. |
| 🍅 **Pomodoro / Focus Timer** | Customisable focus intervals (Pomodoro, Short/Long Break, Deep Work, Custom), cycle counter, Zen fullscreen mode, scratchpad notes. |
| 🔔 **Smart Reminders** | Schedule tasks with date/time, subject, priority, recurrence (daily/weekdays/weekly), snooze, and native push alarms. |
| 📅 **Weekly Timetable & Planner** | Interactive weekly schedule grid with subject colour-coding and live slot management. |
| 🎯 **Exam Countdown & Milestones** | Track exam targets, target scores (e.g. Grade A+ / 95%+), and live relative day countdowns. |
| 🧠 **Spaced Repetition Reviews** | Scientific retention schedules tracking topics across 1d, 3d, 7d, and 30d milestones. |
| 🃏 **Flashcards (Active Recall)** | 3D flip study arena with self-assessment confidence ratings (`Again`, `Hard`, `Good`, `Easy`). |
| 🏆 **Habits & Gamification** | Daily habits checklist, dynamic XP leveling system, and achievement badges. |
| 📊 **Analytics & Heatmap** | Study-time charts, daily goal tracker, LeetCode-style study contribution heatmap. |
| 🎵 **Ambient Audio** | Procedural Web Audio soundscapes: rain shower, white/pink/brown noise, 40Hz binaural beats, coffee shop buzz. |
| 🌙 **Themes & Typography** | Dark, Light, Forest themes + Lexend, JetBrains Mono, DM Sans, and Plus Jakarta Sans font pairings. |

---

## 🤖 AI Academic Calendar & Timetable Intelligence (v1.2.0)

StudyPulse includes an offline-first **AI Schedule Intelligence Engine** designed specifically for university and college students:

### 1. Multi-Format Upload & Ingestion
- 📊 **Excel Spreadsheets (`.xlsx`, `.xls`)**: Client-side parsing powered by SheetJS extracts lecture tables, multi-day columns, and exam date matrices.
- 📑 **CSV / TSV Files (`.csv`, `.tsv`)**: Fast table row and column parsing.
- 🖼️ **PDFs & Images (`.pdf`, `.png`, `.jpg`, `.webp`)**: Multi-modal layout detection and neural table OCR (with optional Google Gemini Vision API key support).
- 📝 **Paste University Circulars**: Natural language parser extracts dates, days, start/end times, and program batches.

### 2. Intelligent Program & Course Filtering
- Filter milestones instantly by degree program:
  - `🌟 All Programs`
  - `💻 B-Tech (4 Years)`
  - `🖥️ BCA / MCA / MBA`
  - `📊 B.A / B.Com / B.Sc / BBA`
  - `🎓 1st Year (Freshers)`
  - Automatically adapts to all custom degree programs in your uploaded document!
- Category filter chips: `Exams`, `Registrations`, `Labs / Viva`, `Holidays`, `Vacations`, `Classes`.
- Live keyword search across subjects, HoD caution notices, and answer sheet display dates.

### 3. 1-Click Sync Engine
- **`+ Add Exam Target`**: 1-click sends any exam milestone to the **Exam & Milestone Deadlines** card with live countdown badges.
- **`+ Sync to Reminder`**: 1-click schedules notification reminders for attendance reviews, fee clearance, and result declarations.
- **`⚡ Sync Exams` / `🔔 Sync Reminders`**: Bulk-sync all filtered milestones at once.
- **`📅 Export .ics`**: Export customized schedules to Google Calendar, Apple Calendar, or Outlook.

### 4. Semester Analytics
- Instant metrics bar: Total Semester Days, Teaching Days, Exam Days, Holidays & Vacations, Non-Teaching Days.

---

## 🔔 Background & Lock Screen Notifications

StudyPulse uses **Capacitor `@capacitor/local-notifications`** to deliver exact-time native Android alarms — no internet connection required, and they fire even when:

- 📱 The phone is **locked** (screen off / Doze mode)  
- 📺 Another app is **open in the foreground** (YouTube, Chrome, WhatsApp, etc.)  
- 💤 The device is in **deep sleep**

### Notification Channels (Android 8.0+)

| Channel | Priority | Visibility |
|---|---|---|
| `studypulse_timers_channel` | `IMPORTANCE_HIGH` (heads-up floating banner) | `VISIBILITY_PUBLIC` (full content on lock screen) |
| `studypulse_reminders_channel` | `IMPORTANCE_HIGH` | `VISIBILITY_PUBLIC` |

---

## 🛠 Tech Stack

- **Frontend**: Vanilla HTML5 + CSS3 + ES Modules JavaScript
- **Spreadsheet Parsing**: [SheetJS (xlsx)](https://sheetjs.com/) v0.18.5
- **Native Wrapper**: [Capacitor](https://capacitorjs.com/) v8 (Android)
- **Notifications**: `@capacitor/local-notifications` v8.2.1
- **Audio**: Web Audio API (procedural synthesis — zero external audio files)
- **Storage**: `localStorage` (100% offline persistence)
- **PWA**: Service Worker with cache-first strategy + offline support

---

## 🚀 Development & Build Setup

```bash
# Install dependencies
npm install

# Prepare web assets (copies to www/)
npm run prepare-assets

# Sync Capacitor native Android project
npx cap sync android

# Build a release/debug APK
npm run build:apk
```

The compiled Android application package is output as [`StudyPulse.apk`](https://github.com/code-cell234/timer/raw/main/StudyPulse.apk) in the project root.

---

## 📁 Project Structure

```
pr1/
├── index.html              # Main app shell (all views, AI calendar hub & modals)
├── sw.js                   # Service Worker (cache-first, notification click handler)
├── manifest.json           # PWA manifest
├── capacitor.config.json   # Capacitor config (LocalNotifications plugin settings)
├── StudyPulse.apk          # Pre-built installable Android APK
├── js/
│   ├── app.js              # Master orchestrator (init, routing, settings)
│   ├── ai-calendar-parser.js # 🤖 AI multi-format parser (Excel, CSV, PDF, OCR, 1-click sync)
│   ├── notifications.js    # 🔔 Unified native + web notification engine
│   ├── timer.js            # Pomodoro/Focus timer (native alarm integration)
│   ├── reminders.js        # Smart reminders module
│   ├── planner.js          # Timetable, exam countdown & AI calendar controller
│   ├── flashcards.js       # Flashcard active recall engine
│   ├── habits.js           # Habit tracker & XP leveling system
│   ├── analytics.js        # Charts, session history & heatmap
│   ├── audio.js            # Web Audio API soundscape synthesis
│   ├── storage.js          # localStorage state persistence & calendar management
│   └── tilt3d.js           # Gyroscope 3D tilt effects
├── styles/
│   ├── main.css            # Design tokens & base styles
│   ├── components.css      # Reusable UI components
│   ├── views.css           # Per-view layouts & AI Calendar hub styling
│   └── effects3d.css       # 3D tilt, glassmorphism, animations
├── icons/                  # App icons (192px, 512px)
├── android/                # Capacitor-generated Android native project
└── www/                    # Built web distribution assets (auto-generated)
```

---

## 📝 Changelog

### v1.2.0 — AI Academic Calendar & Timetable Intelligence (2026-08-14)
- **[NEW]** **AI Academic Calendar & Course Hub** in the Timetable & Planner section.
- **[NEW]** **Excel (.xlsx, .xls) & CSV ingestion** via client-side SheetJS integration.
- **[NEW]** **Multi-modal OCR & Document parsing** supporting PDF files, Images (PNG, JPG, WebP), and Pasted Circular text.
- **[NEW]** **Program Sorting System**: Filter milestones by `B-Tech (4 Years)`, `BCA / MCA / MBA`, `B.A / B.Com / B.Sc / BBA`, and `1st Year (Freshers)`.
- **[NEW]** **Category Filters**: `Exams`, `Registrations`, `Labs / Viva`, `Holidays`, `Vacations`, and `Classes`.
- **[NEW]** **1-Click Sync to Timetable**: Automatically extracts lecture slots into the weekly study timetable grid.
- **[NEW]** **1-Click Sync to Exam Deadlines**: Send exam milestones (T1, T2, Mid Term, End Sem, Make-up) directly into the live countdown tracker.
- **[NEW]** **1-Click Sync to Smart Reminders**: Bulk-schedule notifications for attendance reviews, caution notices, and ERP result dates.
- **[NEW]** **iCal (.ics) Export**: Export customized program schedules directly to Apple Calendar, Google Calendar, and Microsoft Outlook.
- **[NEW]** Optional **Google Gemini Vision API Key** modal configuration.

### v1.1.0 — Background & Lock Screen Notifications (2026-08-14)
- **[NEW]** Native Android alarm scheduled on **timer start** — session-complete notification fires even when the phone is locked (`allowWhileIdle: true`).
- **[NEW]** Dual high-priority notification channels: `studypulse_timers_channel` and `studypulse_reminders_channel`.
- **[NEW]** Timer alarm automatically cancelled on pause, reset, and skip.
- **[NEW]** `visibilitychange` background sync handler.
- **[NEW]** Notification tap routing directly to the target view/reminder.
- **[NEW]** **🔔 Test Lock Screen Alert (5s)** diagnostic button in Settings.

### v1.0.0 — Initial Release
- Full Pomodoro & focus timer suite.
- Smart Reminders with recurrence & snooze.
- Study Planner, Flashcards, Habits, Analytics.
- Ambient audio soundscapes.
- Gamification (XP, badges).
