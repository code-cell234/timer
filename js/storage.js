/**
 * StudyPulse - Storage & State Management
 * 100% offline LocalStorage persistence with sample seed data & backup utilities
 */

const STORAGE_KEY = 'studypulse_state_v1';

// Initial starter seed data to make the app immediately rich and ready to use
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
    xp: 65,
    level: 1,
    levelTitle: 'Lvl 1 Focused Scholar',
    streak: 3,
    lastActiveDate: new Date().toISOString().split('T')[0],
    scratchpad: '📝 Session notes:\n- Review Calculus Theorem 4.2\n- Finish Chemistry equation balancing problem set\n- Prepare 10 flashcards for Bio Quiz'
  },
  reminders: [
    {
      id: 'rem-1',
      title: 'Submit Physics Lab Report - Waves & Optics',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      dueTime: '17:00',
      subject: 'Science',
      priority: 'high',
      recurrence: 'none',
      estPomodoros: 2,
      notes: 'Include all graphs and error analysis percentage table.',
      completed: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'rem-2',
      title: 'Active Recall Review: Linear Algebra Matrices',
      dueDate: new Date().toISOString().split('T')[0], // Today
      dueTime: '18:30',
      subject: 'Mathematics',
      priority: 'medium',
      recurrence: 'daily',
      estPomodoros: 1,
      notes: 'Focus on Eigenvalues and diagonalization.',
      completed: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'rem-3',
      title: 'Read 25 pages of Computer Networks (Ch 3)',
      dueDate: new Date().toISOString().split('T')[0], // Today
      dueTime: '20:00',
      subject: 'Coding',
      priority: 'low',
      recurrence: 'none',
      estPomodoros: 2,
      notes: 'TCP 3-way handshake and congestion control mechanisms.',
      completed: false,
      createdAt: new Date().toISOString()
    }
  ],
  timetable: [
    { id: 'tt-1', day: 'Monday', subject: 'Linear Algebra', startTime: '09:00', endTime: '10:30', color: 'blue' },
    { id: 'tt-2', day: 'Monday', subject: 'Data Structures', startTime: '14:00', endTime: '16:00', color: 'emerald' },
    { id: 'tt-3', day: 'Tuesday', subject: 'Physics Lecture', startTime: '10:00', endTime: '11:30', color: 'purple' },
    { id: 'tt-4', day: 'Wednesday', subject: 'Calculus Discussion', startTime: '09:00', endTime: '10:30', color: 'blue' },
    { id: 'tt-5', day: 'Thursday', subject: 'Algorithms Lab', startTime: '13:00', endTime: '15:30', color: 'amber' },
    { id: 'tt-6', day: 'Friday', subject: 'Organic Chemistry', startTime: '11:00', endTime: '12:30', color: 'rose' }
  ],
  exams: [
    {
      id: 'ex-1',
      title: 'Physics Midterm Examination',
      date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // 5 days away
      time: '10:00',
      targetScore: 'Grade A (92%+)'
    },
    {
      id: 'ex-2',
      title: 'Algorithms Final Project Presentation',
      date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0], // 14 days away
      time: '14:00',
      targetScore: '100% Complete Demo'
    }
  ],
  spacedTopics: [
    {
      id: 'sp-1',
      title: 'Cell Division: Mitosis vs Meiosis',
      subject: 'Biology',
      createdDate: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
      stages: [
        { label: 'Day 1', done: true },
        { label: 'Day 3', done: true },
        { label: 'Day 7', done: false },
        { label: 'Day 30', done: false }
      ]
    },
    {
      id: 'sp-2',
      title: 'Dynamic Programming: Knapsack & Subsets',
      subject: 'Coding',
      createdDate: new Date().toISOString().split('T')[0],
      stages: [
        { label: 'Day 1', done: true },
        { label: 'Day 3', done: false },
        { label: 'Day 7', done: false },
        { label: 'Day 30', done: false }
      ]
    }
  ],
  decks: [
    {
      id: 'deck-1',
      title: 'Computer Science Core Concepts',
      subject: 'Tech & CS',
      description: 'Key algorithms, big-O complexities, and data structures.',
      cards: [
        {
          id: 'c-1',
          front: 'What is the average and worst-case time complexity of QuickSort?',
          back: 'Average Case: O(N log N)\nWorst Case: O(N²) (occurs when pivots chosen are extremely unbalanced).',
          confidence: 'good'
        },
        {
          id: 'c-2',
          front: 'Explain the difference between a Process and a Thread.',
          back: 'A Process is an executing program with its own independent memory address space.\nA Thread is a lightweight subunit of a process that shares memory and resources with peer threads.',
          confidence: 'easy'
        },
        {
          id: 'c-3',
          front: 'What is the CAP Theorem in distributed databases?',
          back: 'A distributed system can guarantee at most TWO out of three properties:\n1. Consistency\n2. Availability\n3. Partition Tolerance',
          confidence: 'hard'
        }
      ]
    },
    {
      id: 'deck-2',
      title: 'Medical & Biology Essentials',
      subject: 'Biology',
      description: 'Cell biology, enzymes, and genetics fundamentals.',
      cards: [
        {
          id: 'c-4',
          front: 'What is the primary function of ATP Synthase in the Mitochondria?',
          back: 'It synthesizes ATP from ADP and inorganic phosphate (Pi) powered by the proton (H⁺) electrochemical gradient across the inner mitochondrial membrane.',
          confidence: 'good'
        },
        {
          id: 'c-5',
          front: 'What is the difference between Transcription and Translation?',
          back: 'Transcription: DNA → mRNA (in nucleus).\nTranslation: mRNA → Polypeptide protein chain (at ribosome).',
          confidence: 'easy'
        }
      ]
    }
  ],
  habits: [
    { id: 'hab-1', title: 'Complete at least 2 Focus Sessions', icon: '🧠', streak: 4, doneToday: true },
    { id: 'hab-2', title: 'Review 1 Flashcard Deck', icon: '📖', streak: 3, doneToday: false },
    { id: 'hab-3', title: 'Solve 1 Problem Set / Coding Challenge', icon: '💻', streak: 5, doneToday: true },
    { id: 'hab-4', title: 'Drink 2L Water & Take Stretch Breaks', icon: '💧', streak: 7, doneToday: false }
  ],
  badges: [
    { id: 'b-first-step', name: 'First Step', desc: 'Complete your first study session', icon: '🌱', unlocked: true },
    { id: 'b-pomodoro-pro', name: 'Focus Master', desc: 'Complete 10 focus sessions', icon: '⏱️', unlocked: true },
    { id: 'b-streak-3', name: 'Consistency Cadet', desc: 'Maintain a 3-day study streak', icon: '🔥', unlocked: true },
    { id: 'b-streak-7', name: 'Week Warrior', desc: 'Maintain a 7-day study streak', icon: '⚡', unlocked: false },
    { id: 'b-deck-master', name: 'Active Recall Ace', desc: 'Master all cards in any deck', icon: '🃏', unlocked: false },
    { id: 'b-task-crusher', name: 'Task Crusher', desc: 'Complete 15 study reminders', icon: '🎯', unlocked: false },
    { id: 'b-night-owl', name: 'Centurion', desc: 'Log over 100 total study minutes', icon: '🏆', unlocked: true },
    { id: 'b-zen-master', name: 'Zen Specialist', desc: 'Use fullscreen focus mode', icon: '🧘', unlocked: false }
  ],
  studyHistory: [
    { date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], minutes: 75, subject: 'Mathematics' },
    { date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], minutes: 50, subject: 'Science' },
    { date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0], minutes: 100, subject: 'Coding' },
    { date: new Date().toISOString().split('T')[0], minutes: 50, subject: 'General' }
  ]
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
        this.save(DEFAULT_STATE);
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
      const parsed = JSON.parse(serialized);
      // Merge with defaults in case of missing keys
      return { ...DEFAULT_STATE, ...parsed };
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

  // Daily streak check & midnight habit uncheck
  checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = this.state.user.lastActiveDate;

    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastActive === yesterday) {
        // Continuous streak
        this.state.user.streak += 1;
      } else if (!lastActive) {
        this.state.user.streak = 1;
      } else {
        // Streak broken
        const daysDiff = (new Date(today) - new Date(lastActive)) / (1000 * 3600 * 24);
        if (daysDiff > 1) {
          this.state.user.streak = 1;
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
