/**
 * StudyPulse - Habits & Gamification Module
 * Daily habit tracking, streak preservation, and dynamic badge achievement system.
 */

import { storage } from './storage.js';

export class HabitsModule {
  constructor(appCoordinator) {
    this.app = appCoordinator;

    // DOM Elements
    this.habitsListEl = document.getElementById('habits-list');
    this.badgesGridEl = document.getElementById('badges-grid');
    this.badgeCountEl = document.getElementById('unlocked-badges-count');

    // Dialog & Form
    this.habitDialog = document.getElementById('habit-dialog');
    this.habitForm = document.getElementById('habit-form');
    this.addHabitBtn = document.getElementById('add-habit-btn');

    this.init();
  }

  init() {
    this.bindEvents();
    this.render();
    this.checkBadges();
  }

  bindEvents() {
    if (this.addHabitBtn) {
      this.addHabitBtn.addEventListener('click', () => {
        this.habitForm.reset();
        this.habitDialog.showModal();
      });
    }

    this.habitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('habit-title-input').value.trim();
      const icon = document.getElementById('habit-icon-select').value;

      if (!title) return;

      const state = storage.getState();
      state.habits.push({
        id: `hab-${Date.now()}`,
        title,
        icon: icon || '📖',
        streak: 0,
        doneToday: false
      });

      storage.save(state);
      this.habitDialog.close();
      this.app.showToast('Habit Created ✨', `Tracking "${title}"`, 'success');
      this.render();
    });

    storage.subscribe(() => {
      this.render();
      this.updateSidebarGamification();
    });
  }

  toggleHabit(id) {
    const state = storage.getState();
    const habit = state.habits.find((h) => h.id === id);
    if (!habit) return;

    habit.doneToday = !habit.doneToday;

    if (habit.doneToday) {
      habit.streak += 1;
      storage.addXP(20);
      this.app.showToast('Habit Checked! 🔥', `+20 XP for "${habit.title}" (Streak: ${habit.streak}d)`, 'success');
    } else {
      habit.streak = Math.max(0, habit.streak - 1);
    }

    storage.save(state);
    this.checkBadges();
  }

  deleteHabit(id) {
    if (confirm('Delete this habit?')) {
      const state = storage.getState();
      state.habits = state.habits.filter((h) => h.id !== id);
      storage.save(state);
    }
  }

  checkBadges() {
    const state = storage.getState();
    let newlyUnlocked = false;

    const totalSessions = state.studyHistory.length;
    const totalMins = state.studyHistory.reduce((s, h) => s + (h.minutes || 0), 0);
    const completedTasks = state.reminders.filter((r) => r.completed).length;

    state.badges.forEach((b) => {
      if (!b.unlocked) {
        if (b.id === 'b-first-step' && totalSessions >= 1) {
          b.unlocked = true;
          newlyUnlocked = true;
        } else if (b.id === 'b-pomodoro-pro' && totalSessions >= 10) {
          b.unlocked = true;
          newlyUnlocked = true;
        } else if (b.id === 'b-streak-3' && state.user.streak >= 3) {
          b.unlocked = true;
          newlyUnlocked = true;
        } else if (b.id === 'b-streak-7' && state.user.streak >= 7) {
          b.unlocked = true;
          newlyUnlocked = true;
        } else if (b.id === 'b-task-crusher' && completedTasks >= 15) {
          b.unlocked = true;
          newlyUnlocked = true;
        } else if (b.id === 'b-night-owl' && totalMins >= 100) {
          b.unlocked = true;
          newlyUnlocked = true;
        }
      }
    });

    if (newlyUnlocked) {
      storage.save(state);
      this.app.showToast('Achievement Unlocked! 🏆', 'Check your Badges showcase in Habits tab!', 'warning');
    }

    this.renderBadges();
  }

  render() {
    this.renderHabits();
    this.renderBadges();
    this.updateSidebarGamification();
  }

  renderHabits() {
    if (!this.habitsListEl) return;
    const state = storage.getState();

    if (!state.habits || state.habits.length === 0) {
      this.habitsListEl.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted);">No habits added yet.</p>`;
      return;
    }

    this.habitsListEl.innerHTML = state.habits
      .map(
        (hab) => `
        <div class="habit-item ${hab.doneToday ? 'done' : ''}" data-id="${hab.id}">
          <div class="habit-left">
            <input type="checkbox" ${hab.doneToday ? 'checked' : ''} data-toggle-habit="${hab.id}" style="cursor: pointer; width: 18px; height: 18px; accent-color: var(--color-success);">
            <span class="habit-icon">${hab.icon || '📖'}</span>
            <div>
              <div class="habit-title">${this.escapeHtml(hab.title)}</div>
              <span class="habit-streak-tag">🔥 ${hab.streak} Day Streak</span>
            </div>
          </div>
          <button class="text-btn-xs text-danger" data-delete-habit="${hab.id}">✕</button>
        </div>
      `
      )
      .join('');

    this.habitsListEl.querySelectorAll('[data-toggle-habit]').forEach((cb) => {
      cb.addEventListener('change', () => this.toggleHabit(cb.dataset.toggleHabit));
    });

    this.habitsListEl.querySelectorAll('[data-delete-habit]').forEach((btn) => {
      btn.addEventListener('click', () => this.deleteHabit(btn.dataset.deleteHabit));
    });
  }

  renderBadges() {
    if (!this.badgesGridEl) return;
    const state = storage.getState();

    const unlockedCount = state.badges.filter((b) => b.unlocked).length;
    if (this.badgeCountEl) {
      this.badgeCountEl.textContent = `${unlockedCount} / ${state.badges.length} Unlocked`;
    }

    this.badgesGridEl.innerHTML = state.badges
      .map(
        (b) => `
        <div class="badge-item ${b.unlocked ? 'unlocked' : ''}">
          <div class="badge-item-icon">${b.icon}</div>
          <div class="badge-item-name">${this.escapeHtml(b.name)}</div>
          <div class="badge-item-desc">${this.escapeHtml(b.desc)}</div>
        </div>
      `
      )
      .join('');
  }

  updateSidebarGamification() {
    const state = storage.getState();
    const streakCount = document.getElementById('sidebar-streak-count');
    const levelBadge = document.getElementById('user-level-badge');
    const xpText = document.getElementById('user-xp-text');
    const xpFill = document.getElementById('sidebar-xp-fill');

    if (streakCount) streakCount.textContent = `${state.user.streak || 0} Day Streak`;
    if (levelBadge) levelBadge.textContent = state.user.levelTitle || `Lvl ${state.user.level} Scholar`;

    const nextLevelXP = (state.user.level || 1) * 100;
    if (xpText) xpText.textContent = `${state.user.xp} / ${nextLevelXP} XP`;
    if (xpFill) {
      const pct = Math.min(100, Math.round((state.user.xp / nextLevelXP) * 100));
      xpFill.style.width = `${pct}%`;
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
