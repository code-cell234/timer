/**
 * StudyPulse - Storage & State Management
 * 100% offline LocalStorage persistence with sample seed data & backup utilities
 */

const STORAGE_KEY = 'studypulse_state_v3';

// Clean initial starter state — starts fresh from the beginning
const DEFAULT_STATE = {
  settings: {
    theme: 'dark',
    timerSound: true,
    reminderSound: true,
    durations: {
      pomodoro: 25,
      shortBreak: 5,
      longBreak: 15,
      deepwork: 50
    },
    dailyTargetMins: 120
  },
  user: {
    xp: 0,
    level: 1,
    levelTitle: 'Lvl 1 Novice Scholar',
    streak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    scratchpad: ''
  },
  reminders: [],
  exams: [],
  spacedTopics: [],
  decks: [],
  habits: [
    { id: 'hab-1', title: 'Complete at least 2 Focus Sessions', icon: '🧠', streak: 0, doneToday: false },
    { id: 'hab-2', title: 'Review 1 Flashcard Deck', icon: '📖', streak: 0, doneToday: false },
    { id: 'hab-3', title: 'Solve 1 Problem Set / Coding Challenge', icon: '💻', streak: 0, doneToday: false },
    { id: 'hab-4', title: 'Drink 2L Water & Take Stretch Breaks', icon: '💧', streak: 0, doneToday: false }
  ],
  badges: [
    { id: 'b-first-step', name: 'First Step', desc: 'Complete your first study session', icon: '🌱', unlocked: false },
    { id: 'b-pomodoro-pro', name: 'Focus Master', desc: 'Complete 10 focus sessions', icon: '⏱️', unlocked: false },
    { id: 'b-streak-3', name: 'Consistency Cadet', desc: 'Maintain a 3-day study streak', icon: '🔥', unlocked: false },
    { id: 'b-streak-7', name: 'Week Warrior', desc: 'Maintain a 7-day study streak', icon: '⚡', unlocked: false },
    { id: 'b-deck-master', name: 'Active Recall Ace', desc: 'Master all cards in any deck', icon: '🃏', unlocked: false },
    { id: 'b-task-crusher', name: 'Task Crusher', desc: 'Complete 15 study reminders', icon: '🎯', unlocked: false },
    { id: 'b-night-owl', name: 'Centurion', desc: 'Log over 100 total study minutes', icon: '🏆', unlocked: false },
    { id: 'b-zen-master', name: 'Zen Specialist', desc: 'Use fullscreen focus mode', icon: '🧘', unlocked: false }
  ],
  studyHistory: [],
  academicCalendars: [],
  activeCalendarId: null
};

class StorageService {
  constructor() {
    this.state = this.load();
    this.listeners = new Set();
    this.checkDailyReset();
  }

  load() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
        this.save(fresh);
        return fresh;
      }
      const parsed = JSON.parse(serialized);
      // Deep merge: use default arrays when saved arrays are empty or missing
      const arrayFields = ['timetable', 'exams', 'spacedTopics', 'decks', 'habits', 'badges', 'reminders', 'studyHistory', 'academicCalendars'];
      const merged = { ...DEFAULT_STATE, ...parsed };
      arrayFields.forEach((field) => {
        if (!merged[field] || !Array.isArray(merged[field]) || merged[field].length === 0) {
          merged[field] = JSON.parse(JSON.stringify(DEFAULT_STATE[field]));
        }
      });
      if (!merged.activeCalendarId && merged.academicCalendars && merged.academicCalendars.length > 0) {
        merged.activeCalendarId = merged.academicCalendars[0].id;
      }
      // Deep merge settings
      merged.settings = { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) };
      return merged;
    } catch (e) {
      console.error('Failed to load StudyPulse data from localStorage:', e);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  save(stateToSave = this.state) {
    try {
      this.state = stateToSave;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notify();
    } catch (e) {
      console.error('Failed to save StudyPulse state:', e);
    }
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.state);
      } catch (err) {
        console.error('Subscriber error in StorageService:', err);
      }
    });
  }

  // Academic Calendar Management
  saveAcademicCalendar(calendar) {
    if (!this.state.academicCalendars) this.state.academicCalendars = [];
    const idx = this.state.academicCalendars.findIndex((c) => c.id === calendar.id);
    if (idx !== -1) {
      this.state.academicCalendars[idx] = calendar;
    } else {
      this.state.academicCalendars.unshift(calendar);
    }
    this.state.activeCalendarId = calendar.id;
    this.save();
    return calendar;
  }

  getActiveCalendar() {
    if (!this.state.academicCalendars || this.state.academicCalendars.length === 0) {
      return null;
    }
    const found = this.state.academicCalendars.find((c) => c.id === this.state.activeCalendarId);
    return found || this.state.academicCalendars[0];
  }

  setActiveCalendar(calendarId) {
    this.state.activeCalendarId = calendarId;
    this.save();
  }

  deleteAcademicCalendar(calendarId) {
    if (!this.state.academicCalendars) return;
    this.state.academicCalendars = this.state.academicCalendars.filter((c) => c.id !== calendarId);
    if (this.state.activeCalendarId === calendarId) {
      this.state.activeCalendarId = this.state.academicCalendars.length ? this.state.academicCalendars[0].id : null;
    }
    this.save();
  }

  deleteCalendarEvent(calendarId, eventId) {
    if (!this.state.academicCalendars) return;
    const cal = this.state.academicCalendars.find((c) => c.id === calendarId) || this.getActiveCalendar();
    if (cal && cal.events) {
      cal.events = cal.events.filter((e) => e.id !== eventId);
      this.save();
    }
  }

  clearAllCalendarEvents(calendarId) {
    if (!this.state.academicCalendars) return;
    const cal = this.state.academicCalendars.find((c) => c.id === calendarId) || this.getActiveCalendar();
    if (cal) {
      cal.events = [];
      this.save();
    }
  }

  resetToDefaultCalendar() {
    this.state.academicCalendars = JSON.parse(JSON.stringify(DEFAULT_STATE.academicCalendars));
    this.state.activeCalendarId = this.state.academicCalendars[0] ? this.state.academicCalendars[0].id : null;
    this.save();
  }

  clearAcademicCalendars() {
    this.state.academicCalendars = [];
    this.state.activeCalendarId = null;
    this.save();
  }

  // Daily streak check & midnight habit uncheck
  checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = this.state.user.lastActiveDate;

    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastActive === yesterday && this.state.user.streak > 0) {
        // Continuous streak
        this.state.user.streak += 1;
      } else if (!lastActive) {
        this.state.user.streak = 0;
      } else {
        // Streak broken
        const daysDiff = (new Date(today) - new Date(lastActive)) / (1000 * 3600 * 24);
        if (daysDiff > 1) {
          this.state.user.streak = 0;
        }
      }

      this.state.user.lastActiveDate = today;

      // Reset daily habits
      this.state.habits = this.state.habits.map((h) => ({
        ...h,
        doneToday: false
      }));

      this.save();
    }
  }

  // XP & Leveling
  addXP(amount) {
    this.state.user.xp += amount;
    const nextLevelXP = this.state.user.level * 100;

    if (this.state.user.xp >= nextLevelXP) {
      this.state.user.level += 1;
      this.state.user.xp -= nextLevelXP;
      
      const titles = [
        'Novice',
        'Focused Scholar',
        'Deep Work Apprentice',
        'Productivity Master',
        'Academic Titan',
        'Grandmaster Scholar'
      ];
      const titleIndex = Math.min(this.state.user.level - 1, titles.length - 1);
      this.state.user.levelTitle = `Lvl ${this.state.user.level} ${titles[titleIndex]}`;
    }

    this.save();
  }

  // Export JSON backup
  exportJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `studypulse-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // Import JSON backup
  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        this.save(parsed);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  // Reset all data
  resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.save();
  }
}

export const storage = new StorageService();
