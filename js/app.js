/**
 * StudyPulse - Master App Controller
 * Orchestrates modules, routing, theme engine, keyboard shortcuts, toasts & ambient audio.
 */

import { storage } from './storage.js';
import { audioService } from './audio.js';
import { TimerModule } from './timer.js';
import { RemindersModule } from './reminders.js';
import { PlannerModule } from './planner.js';
import { FlashcardsModule } from './flashcards.js';
import { HabitsModule } from './habits.js';
import { AnalyticsModule } from './analytics.js';
import { Tilt3DEngine } from './tilt3d.js';

class StudyPulseApp {
  constructor() {
    this.currentViewId = 'focus-view';

    // Sub-modules
    this.timerModule = null;
    this.remindersModule = null;
    this.plannerModule = null;
    this.flashcardsModule = null;
    this.habitsModule = null;
    this.analyticsModule = null;

    this.init();
  }

  init() {
    this.initTheme();
    this.initModules();
    this.bindGlobalEvents();
    this.initAmbientAudioControls();
    this.initSettings();
    this.checkNotificationPermission();
  }

  initModules() {
    this.timerModule = new TimerModule(this);
    this.remindersModule = new RemindersModule(this);
    this.plannerModule = new PlannerModule(this);
    this.flashcardsModule = new FlashcardsModule(this);
    this.habitsModule = new HabitsModule(this);
    this.analyticsModule = new AnalyticsModule(this);

    // 3D spatial tilt engine — fires after all DOM is settled
    this.tilt3d = new Tilt3DEngine();
  }

  initTheme() {
    const state = storage.getState();
    const savedTheme = state.settings.theme || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const themeSelect = document.getElementById('theme-selector-setting');
    if (themeSelect) themeSelect.value = savedTheme;

    this.initFont();
  }

  initFont() {
    const state = storage.getState();
    const savedFont = state.settings.font || 'lexend';
    document.documentElement.setAttribute('data-font', savedFont);
    const fontSelect = document.getElementById('font-selector-setting');
    if (fontSelect) fontSelect.value = savedFont;
  }

  setFont(fontName) {
    document.documentElement.setAttribute('data-font', fontName);
    const state = storage.getState();
    state.settings.font = fontName;
    storage.save(state);
    this.showToast('Typography Updated 🍃', 'Calming font applied.', 'info');
  }

  setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    const state = storage.getState();
    state.settings.theme = themeName;
    storage.save(state);
    this.showToast('Theme Applied', `Switched theme to ${themeName}.`, 'info');
  }

  bindGlobalEvents() {
    // 1. Navigation switching (Desktop Sidebar & Mobile Bottom Nav)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const viewId = btn.dataset.view;
        this.switchView(viewId);
      });
    });

    const mobNavItems = document.querySelectorAll('.mob-nav-item[data-view]');
    mobNavItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const viewId = btn.dataset.view;
        this.switchView(viewId);
      });
    });

    // View switch links in subcomponents
    document.querySelectorAll('[data-switch-view]').forEach((link) => {
      link.addEventListener('click', () => {
        this.switchView(link.dataset.switchView);
      });
    });

    // 2. Mobile Sidebar & Backdrop Toggle
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const mobMenuBtn = document.getElementById('mob-nav-menu');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');

    const openSidebar = () => {
      if (sidebar) sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
    };

    const closeSidebar = () => {
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('active');
    };

    if (menuToggleBtn) menuToggleBtn.addEventListener('click', openSidebar);
    if (mobMenuBtn) mobMenuBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (backdrop) backdrop.addEventListener('click', closeSidebar);

    // 3. Header Theme Quick Switcher Toggle
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const nextTheme = current === 'dark' ? 'light' : current === 'light' ? 'forest' : 'dark';
        this.setTheme(nextTheme);
        const themeSelect = document.getElementById('theme-selector-setting');
        if (themeSelect) themeSelect.value = nextTheme;
      });
    }

    // 4. Modal Dialog Light-Dismiss (Clicking outside modal closes it) & [data-close-dialog] buttons
    document.querySelectorAll('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (e) => {
        const dialogDimensions = dialog.getBoundingClientRect();
        if (
          e.clientX < dialogDimensions.left ||
          e.clientX > dialogDimensions.right ||
          e.clientY < dialogDimensions.top ||
          e.clientY > dialogDimensions.bottom
        ) {
          dialog.close();
        }
      });

      dialog.querySelectorAll('[data-close-dialog]').forEach((btn) => {
        btn.addEventListener('click', () => dialog.close());
      });
    });

    // 5. Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing inside inputs or textareas
      const activeTag = document.activeElement.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      // Spacebar
      if (e.code === 'Space') {
        e.preventDefault();
        // If flashcard study arena open, flip card
        if (this.currentViewId === 'flashcards-view' && this.flashcardsModule.activeDeck) {
          this.flashcardsModule.flipCard();
        } else {
          // Toggle focus timer
          this.timerModule.toggle();
        }
      }

      // 'F' -> Fullscreen Zen Focus Mode
      if (e.key === 'f' || e.key === 'F') {
        if (!document.getElementById('zen-focus-overlay').classList.contains('hidden')) {
          this.timerModule.exitZenMode();
        } else {
          this.timerModule.enterZenMode();
        }
      }

      // 'R' -> Reset Timer
      if (e.key === 'r' || e.key === 'R') {
        this.timerModule.reset();
      }

      // 'S' -> Skip Timer
      if (e.key === 's' || e.key === 'S') {
        this.timerModule.skip();
      }

      // 'N' -> Quick Add Reminder
      if (e.key === 'n' || e.key === 'N') {
        this.remindersModule.openAddModal();
      }

      // 'Escape' -> Close zen mode if open
      if (e.key === 'Escape') {
        this.timerModule.exitZenMode();
      }
    });
  }

  switchView(viewId) {
    this.currentViewId = viewId;

    // Update sidebar navigation active state
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === viewId);
    });

    // Update mobile bottom nav active state
    document.querySelectorAll('.mob-nav-item[data-view]').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === viewId);
    });

    // Show active panel
    document.querySelectorAll('.view-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === viewId);
    });

    // Close mobile sidebar and backdrop if open
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');

    // Update Header Title & Subtitle
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    const headers = {
      'focus-view': { title: 'Focus Session', sub: 'Maximize flow and conquer your study goals' },
      'reminders-view': { title: 'Smart Reminders & Tasks', sub: 'Keep track of deadlines, recurring tasks, and checklists' },
      'planner-view': { title: 'Timetable & Exam Planner', sub: 'Organize your weekly schedule and spaced repetition reviews' },
      'flashcards-view': { title: 'Flashcard Decks', sub: 'Master definitions and concepts through active recall' },
      'habits-view': { title: 'Habits & Achievements', sub: 'Build unbreakable daily consistency and earn XP badges' },
      'analytics-view': { title: 'Insights & Study Analytics', sub: 'Track your focus minutes, subject breakdown, and heatmaps' },
      'settings-view': { title: 'Settings & Data Backup', sub: 'Customize durations, themes, sound alerts, and export data' }
    };

    if (headers[viewId] && pageTitle && pageSubtitle) {
      pageTitle.textContent = headers[viewId].title;
      pageSubtitle.textContent = headers[viewId].sub;
    }

    // Refresh display in timer module (e.g. mini timer visibility)
    if (this.timerModule) {
      this.timerModule.updateDisplay();
    }

    // Re-bind 3D tilt engine to any newly visible cards in this view
    if (this.tilt3d) {
      // Small delay allows view animation to start before we bind
      setTimeout(() => this.tilt3d.refresh(), 60);
    }
  }

  // Ambient Audio Controls
  initAmbientAudioControls() {
    const ambientSelect = document.getElementById('ambient-sound-select');
    const ambientToggleBtn = document.getElementById('toggle-ambient-btn');
    const ambientSlider = document.getElementById('ambient-volume-slider');
    const zenAmbientLabel = document.getElementById('zen-ambient-label');

    if (ambientSelect && ambientToggleBtn && ambientSlider) {
      ambientSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'none') {
          audioService.stopAmbient();
          ambientToggleBtn.textContent = 'Off';
          if (zenAmbientLabel) zenAmbientLabel.textContent = 'Ambient Sound: Silent';
        } else {
          audioService.startAmbient(val);
          ambientToggleBtn.textContent = 'On';
          const text = ambientSelect.options[ambientSelect.selectedIndex].text;
          if (zenAmbientLabel) zenAmbientLabel.textContent = `Ambient Sound: ${text}`;
        }
      });

      ambientToggleBtn.addEventListener('click', () => {
        if (audioService.currentAmbientType !== 'none') {
          audioService.stopAmbient();
          ambientToggleBtn.textContent = 'Off';
          ambientSelect.value = 'none';
          if (zenAmbientLabel) zenAmbientLabel.textContent = 'Ambient Sound: Silent';
        } else {
          ambientSelect.value = 'rain';
          audioService.startAmbient('rain');
          ambientToggleBtn.textContent = 'On';
          if (zenAmbientLabel) zenAmbientLabel.textContent = 'Ambient Sound: 🌧️ Rain Shower';
        }
      });

      ambientSlider.addEventListener('input', (e) => {
        audioService.setVolume(e.target.value);
      });
    }
  }

  // Settings & Data Management
  initSettings() {
    const state = storage.getState();

    // Theme selector
    const themeSelect = document.getElementById('theme-selector-setting');
    if (themeSelect) {
      themeSelect.value = state.settings.theme || 'dark';
      themeSelect.addEventListener('change', (e) => {
        this.setTheme(e.target.value);
      });
    }

    // Font selector
    const fontSelect = document.getElementById('font-selector-setting');
    if (fontSelect) {
      fontSelect.value = state.settings.font || 'lexend';
      fontSelect.addEventListener('change', (e) => {
        this.setFont(e.target.value);
      });
    }

    // Sound switches
    const timerSoundSwitch = document.getElementById('setting-timer-sound');
    const reminderSoundSwitch = document.getElementById('setting-reminder-sound');
    const testChimeBtn = document.getElementById('test-chime-btn');

    if (timerSoundSwitch) {
      timerSoundSwitch.checked = state.settings.timerSound !== false;
      timerSoundSwitch.addEventListener('change', (e) => {
        state.settings.timerSound = e.target.checked;
        storage.save(state);
      });
    }

    if (reminderSoundSwitch) {
      reminderSoundSwitch.checked = state.settings.reminderSound !== false;
      reminderSoundSwitch.addEventListener('change', (e) => {
        state.settings.reminderSound = e.target.checked;
        storage.save(state);
      });
    }

    if (testChimeBtn) {
      testChimeBtn.addEventListener('click', () => {
        audioService.playTimerChime();
        this.showToast('Audio Synthesizer', 'Playing procedural harmonic chime.', 'info');
      });
    }

    // Custom Durations
    const pomodoroDur = document.getElementById('setting-pomodoro-dur');
    const shortBreakDur = document.getElementById('setting-shortbreak-dur');
    const longBreakDur = document.getElementById('setting-longbreak-dur');
    const saveDurationsBtn = document.getElementById('save-durations-btn');

    if (pomodoroDur && shortBreakDur && longBreakDur && saveDurationsBtn) {
      pomodoroDur.value = state.settings.durations.pomodoro || 25;
      shortBreakDur.value = state.settings.durations.shortBreak || 5;
      longBreakDur.value = state.settings.durations.longBreak || 15;

      saveDurationsBtn.addEventListener('click', () => {
        state.settings.durations.pomodoro = parseInt(pomodoroDur.value, 10) || 25;
        state.settings.durations.shortBreak = parseInt(shortBreakDur.value, 10) || 5;
        state.settings.durations.longBreak = parseInt(longBreakDur.value, 10) || 15;
        storage.save(state);
        this.timerModule.setMode(this.timerModule.mode);
        this.showToast('Durations Saved ⏱️', 'Default focus and break lengths updated.', 'success');
      });
    }

    // Export & Import
    const exportBtn = document.getElementById('export-backup-btn');
    const importInput = document.getElementById('import-backup-file');
    const resetBtn = document.getElementById('reset-all-data-btn');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        storage.exportJSON();
        this.showToast('Backup Exported 💾', 'JSON file saved to your device.', 'success');
      });
    }

    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const success = storage.importJSON(event.target.result);
          if (success) {
            this.showToast('Data Restored! 🎉', 'All reminders, flashcards, and history loaded.', 'success');
            window.location.reload();
          } else {
            this.showToast('Import Failed', 'Invalid JSON backup format.', 'danger');
          }
        };
        reader.readAsText(file);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all data to initial defaults? This cannot be undone.')) {
          storage.resetAll();
          window.location.reload();
        }
      });
    }
  }

  // Toast Alerts
  showToast(title, message, type = 'info', onClickAction = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✅',
      info: 'ℹ️',
      warning: '🔔',
      danger: '⚠️'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '✨'}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <span class="toast-close">✕</span>
    `;

    if (onClickAction) {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', (e) => {
        if (!e.target.classList.contains('toast-close')) {
          onClickAction();
          toast.remove();
        }
      });
    }

    toast.querySelector('.toast-close').addEventListener('click', (e) => {
      e.stopPropagation();
      toast.remove();
    });

    container.appendChild(toast);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 250);
      }
    }, 5000);
  }

  // Browser Push Notifications
  checkNotificationPermission() {
    const banner = document.getElementById('notification-banner');
    const enableBtn = document.getElementById('enable-notifications-btn');
    const dismissBtn = document.getElementById('dismiss-notifications-btn');

    if (!('Notification' in window)) return;

    if (Notification.permission === 'default' && banner) {
      banner.classList.remove('hidden');

      if (enableBtn) {
        enableBtn.addEventListener('click', () => {
          Notification.requestPermission().then((perm) => {
            banner.classList.add('hidden');
            if (perm === 'granted') {
              this.showToast('Notifications Active! 🔔', 'You will now receive desktop study reminders.', 'success');
            }
          });
        });
      }

      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          banner.classList.add('hidden');
        });
      }
    }
  }

  sendBrowserNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, options);
      } catch (e) {
        console.warn('Browser notification failed:', e);
      }
    }
  }
}

// Bootstrap Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.studyPulseApp = new StudyPulseApp();
});
