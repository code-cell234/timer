/**
 * StudyPulse - Focus & Pomodoro Timer Module
 * Handles accurate interval countdowns, session transitions, audio cues, and zen mode.
 */

import { storage } from './storage.js';
import { audioService } from './audio.js';

export class TimerModule {
  constructor(appCoordinator) {
    this.app = appCoordinator;
    this.mode = 'pomodoro'; // 'pomodoro' | 'shortBreak' | 'longBreak' | 'deepwork' | 'custom'
    this.isRunning = false;
    this.cycle = 1; // 1 to 4
    this.totalSeconds = 25 * 60;
    this.remainingSeconds = 25 * 60;
    this.timerInterval = null;
    this.endTime = null;

    // DOM Elements
    this.displayEl = document.getElementById('timer-display');
    this.sessionLabelEl = document.getElementById('timer-session-label');
    this.cycleCounterEl = document.getElementById('timer-cycle-counter');
    this.progressRingEl = document.getElementById('timer-ring-progress');
    this.toggleBtn = document.getElementById('timer-toggle-btn');
    this.toggleText = document.getElementById('timer-toggle-text');
    this.playIcon = document.getElementById('timer-play-icon');
    this.pauseIcon = document.getElementById('timer-pause-icon');
    this.resetBtn = document.getElementById('timer-reset-btn');
    this.skipBtn = document.getElementById('timer-skip-btn');
    this.fullscreenBtn = document.getElementById('timer-fullscreen-btn');
    this.taskInput = document.getElementById('focus-task-input');
    this.subjectSelect = document.getElementById('focus-subject-tag');
    this.modeTabs = document.querySelectorAll('.mode-tab');

    // Scratchpad Elements
    this.scratchpad = document.getElementById('session-scratchpad');
    this.scratchpadStatus = document.getElementById('scratchpad-status');
    this.clearScratchpadBtn = document.getElementById('clear-scratchpad-btn');
    this.copyScratchpadBtn = document.getElementById('copy-scratchpad-btn');

    // Mini Header Timer
    this.miniTimerPill = document.getElementById('mini-timer-pill');
    this.miniTimerLabel = document.getElementById('mini-timer-label');
    this.miniTimerTime = document.getElementById('mini-timer-time');

    // Zen Overlay Elements
    this.zenOverlay = document.getElementById('zen-focus-overlay');
    this.zenDigits = document.getElementById('zen-timer-digits');
    this.zenSessionType = document.getElementById('zen-session-type');
    this.zenTaskTitle = document.getElementById('zen-task-title');
    this.zenToggleBtn = document.getElementById('zen-toggle-btn');
    this.zenSkipBtn = document.getElementById('zen-skip-btn');
    this.exitZenBtn = document.getElementById('exit-zen-btn');

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadScratchpad();
    this.setMode('pomodoro');
    this.updateDailyGoalUI();
  }

  bindEvents() {
    // Mode switcher
    this.modeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.setMode(tab.dataset.mode);
      });
    });

    // Main controls
    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.skipBtn.addEventListener('click', () => this.skip());
    this.fullscreenBtn.addEventListener('click', () => this.enterZenMode());

    // Scratchpad events
    let debounceTimer;
    this.scratchpad.addEventListener('input', () => {
      this.scratchpadStatus.textContent = 'Saving...';
      this.scratchpadStatus.style.color = 'var(--text-muted)';
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const state = storage.getState();
        state.user.scratchpad = this.scratchpad.value;
        storage.save(state);
        this.scratchpadStatus.textContent = 'Saved';
        this.scratchpadStatus.style.color = 'var(--color-success)';
      }, 500);
    });

    this.clearScratchpadBtn.addEventListener('click', () => {
      if (confirm('Clear all session notes?')) {
        this.scratchpad.value = '';
        const state = storage.getState();
        state.user.scratchpad = '';
        storage.save(state);
      }
    });

    this.copyScratchpadBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(this.scratchpad.value);
      this.app.showToast('Copied!', 'Scratchpad notes copied to clipboard.', 'success');
    });

    // Zen mode controls
    this.zenToggleBtn.addEventListener('click', () => this.toggle());
    this.zenSkipBtn.addEventListener('click', () => this.skip());
    this.exitZenBtn.addEventListener('click', () => this.exitZenMode());

    // Mini timer click -> jump to Focus Session
    this.miniTimerPill.addEventListener('click', () => {
      this.app.switchView('focus-view');
    });
  }

  loadScratchpad() {
    const state = storage.getState();
    if (state.user && state.user.scratchpad) {
      this.scratchpad.value = state.user.scratchpad;
    }
  }

  setMode(mode) {
    if (this.isRunning) {
      if (!confirm('A timer is currently active. Switch interval and reset?')) {
        return;
      }
      this.pause();
    }

    this.mode = mode;
    this.modeTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
      tab.setAttribute('aria-selected', tab.dataset.mode === mode ? 'true' : 'false');
    });

    const settings = storage.getState().settings.durations;
    let mins = 25;

    switch (mode) {
      case 'pomodoro':
        mins = settings.pomodoro || 25;
        this.sessionLabelEl.textContent = 'Focus Session';
        this.sessionLabelEl.style.color = 'var(--color-primary)';
        if (this.progressRingEl) this.progressRingEl.style.stroke = 'var(--color-primary)';
        break;
      case 'shortBreak':
        mins = settings.shortBreak || 5;
        this.sessionLabelEl.textContent = 'Short Break';
        this.sessionLabelEl.style.color = 'var(--color-success)';
        if (this.progressRingEl) this.progressRingEl.style.stroke = 'var(--color-success)';
        break;
      case 'longBreak':
        mins = settings.longBreak || 15;
        this.sessionLabelEl.textContent = 'Long Break';
        this.sessionLabelEl.style.color = 'var(--color-purple)';
        if (this.progressRingEl) this.progressRingEl.style.stroke = 'var(--color-purple)';
        break;
      case 'deepwork':
        mins = settings.deepwork || 50;
        this.sessionLabelEl.textContent = 'Deep Work Session';
        this.sessionLabelEl.style.color = 'var(--color-primary)';
        if (this.progressRingEl) this.progressRingEl.style.stroke = 'var(--color-primary)';
        break;
      case 'custom':
        const customMins = parseInt(prompt('Enter focus session duration in minutes:', '45'), 10);
        mins = isNaN(customMins) || customMins <= 0 ? 25 : customMins;
        this.sessionLabelEl.textContent = `Custom (${mins}m)`;
        break;
    }

    this.totalSeconds = mins * 60;
    this.remainingSeconds = this.totalSeconds;
    this.updateDisplay();
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    this.isRunning = true;
    this.endTime = Date.now() + this.remainingSeconds * 1000;

    this.toggleText.textContent = 'Pause';
    this.playIcon.classList.add('hidden');
    this.pauseIcon.classList.remove('hidden');
    this.zenToggleBtn.textContent = 'Pause';

    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const diffSeconds = Math.round((this.endTime - now) / 1000);

      if (diffSeconds <= 0) {
        this.remainingSeconds = 0;
        this.updateDisplay();
        this.completeSession();
      } else {
        this.remainingSeconds = diffSeconds;
        this.updateDisplay();
      }
    }, 500);

    this.updateDisplay();
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.timerInterval);
    this.timerInterval = null;

    this.toggleText.textContent = 'Resume Focus';
    this.playIcon.classList.remove('hidden');
    this.pauseIcon.classList.add('hidden');
    this.zenToggleBtn.textContent = 'Resume';
    this.updateDisplay();
  }

  reset() {
    this.pause();
    this.toggleText.textContent = 'Start Focus';
    this.remainingSeconds = this.totalSeconds;
    this.updateDisplay();
  }

  skip() {
    if (confirm('Skip to next interval?')) {
      this.pause();
      this.advanceInterval();
    }
  }

  advanceInterval() {
    if (this.mode === 'pomodoro' || this.mode === 'deepwork' || this.mode === 'custom') {
      if (this.cycle < 4) {
        this.setMode('shortBreak');
      } else {
        this.setMode('longBreak');
      }
    } else {
      // Finished a break, back to pomodoro
      if (this.mode === 'longBreak') {
        this.cycle = 1;
      } else {
        this.cycle = (this.cycle % 4) + 1;
      }
      this.cycleCounterEl.textContent = `Session ${this.cycle} of 4`;
      this.setMode('pomodoro');
    }
  }

  completeSession() {
    this.pause();
    const isFocusInterval = this.mode === 'pomodoro' || this.mode === 'deepwork' || this.mode === 'custom';

    // Play chime sound if enabled
    const state = storage.getState();
    if (state.settings.timerSound) {
      audioService.playTimerChime();
    }

    if (isFocusInterval) {
      const minsStudied = Math.round(this.totalSeconds / 60);
      const subject = this.subjectSelect.value || 'General';

      // Record study history log
      const today = new Date().toISOString().split('T')[0];
      state.studyHistory.push({
        date: today,
        minutes: minsStudied,
        subject: subject
      });

      // Award XP
      storage.addXP(30);

      // Check Badges
      this.app.habitsModule.checkBadges();

      this.app.showToast(
        'Focus Session Completed! 🎉',
        `Awesome work! You logged ${minsStudied} mins in ${subject} (+30 XP). Time for a well-deserved break!`,
        'success'
      );

      // Send Web Notification
      this.app.sendBrowserNotification('Session Complete! 🏆', {
        body: `Great job completing your ${minsStudied}-min focus session in ${subject}. Take a break now!`,
        icon: 'favicon.ico'
      });
    } else {
      this.app.showToast(
        'Break Ended! ⚡',
        'Ready to jump back into your flow state? Let\'s focus!',
        'info'
      );

      this.app.sendBrowserNotification('Break Over! ⚡', {
        body: 'Time to start your next study interval and crush your goals.',
        icon: 'favicon.ico'
      });
    }

    this.advanceInterval();
    this.updateDailyGoalUI();
  }

  updateDisplay() {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    this.displayEl.textContent = formatted;
    this.zenDigits.textContent = formatted;
    this.miniTimerTime.textContent = formatted;

    // Browser title sync
    const taskName = this.taskInput.value.trim();
    document.title = `${formatted} - ${this.isRunning ? '🔥 Focus' : 'StudyPulse'}${taskName ? ` (${taskName})` : ''}`;

    // SVG Circular Progress bar (circumference = 2 * PI * 140 ~= 880)
    const circumference = 2 * Math.PI * 140;
    const progress = (this.totalSeconds - this.remainingSeconds) / this.totalSeconds;
    const offset = circumference - progress * circumference;

    if (this.progressRingEl) {
      this.progressRingEl.style.strokeDashoffset = offset;
    }

    // Mini timer visibility
    const activeView = document.querySelector('.view-panel.active');
    if (activeView && activeView.id !== 'focus-view' && this.isRunning) {
      this.miniTimerPill.classList.remove('hidden');
    } else {
      this.miniTimerPill.classList.add('hidden');
    }
  }

  updateDailyGoalUI() {
    const state = storage.getState();
    const today = new Date().toISOString().split('T')[0];
    const targetMins = state.settings.dailyTargetMins || 120;

    const todayMins = state.studyHistory
      .filter((h) => h.date === today)
      .reduce((sum, h) => sum + (h.minutes || 0), 0);

    const goalMetric = document.getElementById('daily-goal-metric');
    const goalFill = document.getElementById('daily-goal-fill');

    if (goalMetric && goalFill) {
      goalMetric.textContent = `${todayMins} / ${targetMins} mins`;
      const pct = Math.min(100, Math.round((todayMins / targetMins) * 100));
      goalFill.style.width = `${pct}%`;
    }
  }

  enterZenMode() {
    const task = this.taskInput.value.trim() || 'General Focus Session';
    this.zenTaskTitle.textContent = task;
    this.zenSessionType.textContent = this.sessionLabelEl.textContent;
    this.zenOverlay.classList.remove('hidden');

    // Unlock zen badge
    const state = storage.getState();
    const zenBadge = state.badges.find((b) => b.id === 'b-zen-master');
    if (zenBadge && !zenBadge.unlocked) {
      zenBadge.unlocked = true;
      storage.save(state);
      this.app.showToast('Achievement Unlocked! 🧘', 'Zen Specialist: Mastered distraction-free focus!', 'warning');
    }
  }

  exitZenMode() {
    this.zenOverlay.classList.add('hidden');
  }
}
