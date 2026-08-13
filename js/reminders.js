/**
 * StudyPulse - Smart Reminders & Task Module
 * Handles scheduled reminders, recurring alerts, audio chimes, notifications & snooze.
 */

import { storage } from './storage.js';
import { audioService } from './audio.js';

export class RemindersModule {
  constructor(appCoordinator) {
    this.app = appCoordinator;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.notifiedReminders = new Set(); // Avoid repeated alarm spam within the same minute

    // DOM Elements
    this.listEl = document.getElementById('reminders-list');
    this.miniListEl = document.getElementById('mini-tasks-container');
    this.searchInput = document.getElementById('reminders-search-input');
    this.filterTabs = document.querySelectorAll('.filter-tab');
    this.openModalBtn = document.getElementById('open-new-reminder-modal-btn');
    this.headerQuickAddBtn = document.getElementById('header-quick-add-btn');

    // Dialog & Form
    this.dialog = document.getElementById('reminder-dialog');
    this.form = document.getElementById('reminder-form');
    this.editIdInput = document.getElementById('reminder-edit-id');
    this.modalTitle = document.getElementById('reminder-modal-title');
    this.titleInput = document.getElementById('reminder-title-input');
    this.dateInput = document.getElementById('reminder-date-input');
    this.timeInput = document.getElementById('reminder-time-input');
    this.subjectInput = document.getElementById('reminder-subject-input');
    this.priorityInput = document.getElementById('reminder-priority-input');
    this.recurrenceInput = document.getElementById('reminder-recurrence-input');
    this.estPomodorosInput = document.getElementById('reminder-est-pomodoros');
    this.notesInput = document.getElementById('reminder-notes-input');

    this.init();
  }

  init() {
    this.bindEvents();
    this.render();
    this.startAlarmChecker();
  }

  bindEvents() {
    // Filter tabs
    this.filterTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.filterTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentFilter = tab.dataset.filter;
        this.render();
      });
    });

    // Search input
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.render();
    });

    // Modal open
    const openHandler = () => this.openAddModal();
    if (this.openModalBtn) this.openModalBtn.addEventListener('click', openHandler);
    if (this.headerQuickAddBtn) this.headerQuickAddBtn.addEventListener('click', openHandler);

    // Form submit
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Subscribe to state updates
    storage.subscribe(() => {
      this.render();
      this.updateCounts();
    });
  }

  openAddModal() {
    this.form.reset();
    this.editIdInput.value = '';
    this.modalTitle.textContent = 'Create Smart Reminder';
    
    // Default date to today & time to +1 hour rounded
    const now = new Date();
    this.dateInput.value = now.toISOString().split('T')[0];
    const nextHour = (now.getHours() + 1) % 24;
    this.timeInput.value = `${String(nextHour).padStart(2, '0')}:00`;

    this.dialog.showModal();
  }

  openEditModal(id) {
    const state = storage.getState();
    const reminder = state.reminders.find((r) => r.id === id);
    if (!reminder) return;

    this.editIdInput.value = reminder.id;
    this.modalTitle.textContent = 'Edit Reminder';
    this.titleInput.value = reminder.title;
    this.dateInput.value = reminder.dueDate;
    this.timeInput.value = reminder.dueTime;
    this.subjectInput.value = reminder.subject;
    this.priorityInput.value = reminder.priority;
    this.recurrenceInput.value = reminder.recurrence;
    this.estPomodorosInput.value = reminder.estPomodoros || 1;
    this.notesInput.value = reminder.notes || '';

    this.dialog.showModal();
  }

  handleFormSubmit() {
    const title = this.titleInput.value.trim();
    const dueDate = this.dateInput.value;
    const dueTime = this.timeInput.value;
    const subject = this.subjectInput.value;
    const priority = this.priorityInput.value;
    const recurrence = this.recurrenceInput.value;
    const estPomodoros = parseInt(this.estPomodorosInput.value, 10) || 1;
    const notes = this.notesInput.value.trim();
    const editId = this.editIdInput.value;

    if (!title || !dueDate || !dueTime) return;

    const state = storage.getState();

    if (editId) {
      // Edit existing
      const index = state.reminders.findIndex((r) => r.id === editId);
      if (index !== -1) {
        state.reminders[index] = {
          ...state.reminders[index],
          title,
          dueDate,
          dueTime,
          subject,
          priority,
          recurrence,
          estPomodoros,
          notes
        };
      }
      this.app.showToast('Reminder Updated', `Updated "${title}"`, 'info');
    } else {
      // Create new
      const newReminder = {
        id: `rem-${Date.now()}`,
        title,
        dueDate,
        dueTime,
        subject,
        priority,
        recurrence,
        estPomodoros,
        notes,
        completed: false,
        createdAt: new Date().toISOString()
      };
      state.reminders.unshift(newReminder);
      this.app.showToast('Reminder Scheduled', `Set alert for ${title} at ${dueTime}`, 'success');
      storage.addXP(10);
    }

    storage.save(state);
    this.dialog.close();
  }

  toggleComplete(id) {
    const state = storage.getState();
    const reminder = state.reminders.find((r) => r.id === id);
    if (!reminder) return;

    reminder.completed = !reminder.completed;

    if (reminder.completed) {
      storage.addXP(15);
      this.app.showToast('Task Completed! ✅', `+15 XP for finishing "${reminder.title}"`, 'success');

      // Handle recurrence
      if (reminder.recurrence && reminder.recurrence !== 'none') {
        this.generateNextRecurrence(reminder, state);
      }
    }

    storage.save(state);
  }

  generateNextRecurrence(completedReminder, state) {
    const nextDate = new Date(completedReminder.dueDate);
    
    if (completedReminder.recurrence === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (completedReminder.recurrence === 'weekdays') {
      const day = nextDate.getDay();
      nextDate.setDate(nextDate.getDate() + (day === 5 ? 3 : day === 6 ? 2 : 1));
    } else if (completedReminder.recurrence === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    }

    const recurringClone = {
      ...completedReminder,
      id: `rem-${Date.now()}`,
      dueDate: nextDate.toISOString().split('T')[0],
      completed: false,
      createdAt: new Date().toISOString()
    };

    state.reminders.push(recurringClone);
  }

  deleteReminder(id) {
    if (confirm('Are you sure you want to delete this reminder?')) {
      const state = storage.getState();
      state.reminders = state.reminders.filter((r) => r.id !== id);
      storage.save(state);
      this.app.showToast('Deleted', 'Reminder removed.', 'info');
    }
  }

  snoozeReminder(id, mins = 10) {
    const state = storage.getState();
    const reminder = state.reminders.find((r) => r.id === id);
    if (!reminder) return;

    const now = new Date();
    now.setMinutes(now.getMinutes() + mins);

    reminder.dueDate = now.toISOString().split('T')[0];
    reminder.dueTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    storage.save(state);
    this.app.showToast('Snoozed ⏰', `Snoozed "${reminder.title}" for ${mins} minutes.`, 'info');
  }

  // Active alarm checker
  startAlarmChecker() {
    setInterval(() => {
      const state = storage.getState();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMins}`;

      state.reminders.forEach((rem) => {
        if (!rem.completed && rem.dueDate === todayStr && rem.dueTime === currentTimeStr) {
          const alarmKey = `${rem.id}_${todayStr}_${currentTimeStr}`;
          if (!this.notifiedReminders.has(alarmKey)) {
            this.notifiedReminders.add(alarmKey);
            this.triggerAlarm(rem);
          }
        }
      });
    }, 20000); // Check every 20 seconds
  }

  triggerAlarm(reminder) {
    const state = storage.getState();
    if (state.settings.reminderSound) {
      audioService.playReminderChime();
    }

    // In-app Toast alert
    this.app.showToast(
      `Reminder Due: ${reminder.title} 🔔`,
      `Scheduled for ${reminder.dueTime} (${reminder.subject}). Click to review.`,
      'warning',
      () => this.openEditModal(reminder.id)
    );

    // Desktop Push Notification
    this.app.sendBrowserNotification(`Reminder: ${reminder.title}`, {
      body: `Due right now! Priority: ${reminder.priority.toUpperCase()} - ${reminder.notes || 'Time to focus!'}`,
      icon: 'favicon.ico'
    });
  }

  getFilteredReminders() {
    const state = storage.getState();
    const today = new Date().toISOString().split('T')[0];

    return state.reminders.filter((rem) => {
      // Search matching
      if (this.searchQuery) {
        const matchTitle = rem.title.toLowerCase().includes(this.searchQuery);
        const matchSubject = rem.subject.toLowerCase().includes(this.searchQuery);
        const matchNotes = (rem.notes || '').toLowerCase().includes(this.searchQuery);
        if (!matchTitle && !matchSubject && !matchNotes) return false;
      }

      // Filter matching
      switch (this.currentFilter) {
        case 'today':
          return !rem.completed && rem.dueDate === today;
        case 'upcoming':
          return !rem.completed && rem.dueDate > today;
        case 'overdue':
          return !rem.completed && rem.dueDate < today;
        case 'completed':
          return rem.completed;
        case 'all':
        default:
          return true;
      }
    });
  }

  updateCounts() {
    const state = storage.getState();
    const today = new Date().toISOString().split('T')[0];

    const all = state.reminders.length;
    const todayCount = state.reminders.filter((r) => !r.completed && r.dueDate === today).length;
    const upcoming = state.reminders.filter((r) => !r.completed && r.dueDate > today).length;
    const overdue = state.reminders.filter((r) => !r.completed && r.dueDate < today).length;
    const completed = state.reminders.filter((r) => r.completed).length;

    const countAll = document.getElementById('count-all');
    const countToday = document.getElementById('count-today');
    const countUpcoming = document.getElementById('count-upcoming');
    const countOverdue = document.getElementById('count-overdue');
    const countCompleted = document.getElementById('count-completed');
    const dueBadge = document.getElementById('tasks-due-badge');
    const pendingDot = document.getElementById('pending-reminder-dot');
    const mobPendingDot = document.getElementById('mob-pending-dot');

    if (countAll) countAll.textContent = all;
    if (countToday) countToday.textContent = todayCount;
    if (countUpcoming) countUpcoming.textContent = upcoming;
    if (countOverdue) countOverdue.textContent = overdue;
    if (countCompleted) countCompleted.textContent = completed;

    if (dueBadge) dueBadge.textContent = todayCount + overdue;
    if (pendingDot) pendingDot.style.display = overdue > 0 ? 'inline' : 'none';
    if (mobPendingDot) mobPendingDot.style.display = overdue > 0 ? 'block' : 'none';
  }

  render() {
    this.updateCounts();
    const reminders = this.getFilteredReminders();
    const today = new Date().toISOString().split('T')[0];

    // 1. Render Main Reminders List
    if (this.listEl) {
      if (reminders.length === 0) {
        this.listEl.innerHTML = `
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
            <p>No reminders found in this view.</p>
            <button class="btn btn-subtle btn-sm" style="margin-top: 1rem;" id="empty-add-btn">+ Create a Reminder</button>
          </div>
        `;
        const emptyBtn = document.getElementById('empty-add-btn');
        if (emptyBtn) emptyBtn.addEventListener('click', () => this.openAddModal());
      } else {
        this.listEl.innerHTML = reminders
          .map((rem) => {
            const isOverdue = !rem.completed && rem.dueDate < today;
            const isToday = rem.dueDate === today;
            let dateLabel = rem.dueDate;
            if (isToday) dateLabel = 'Today';
            else if (isOverdue) dateLabel = `Overdue (${rem.dueDate})`;

            const pomodoroBlocks = '🍅'.repeat(Math.min(rem.estPomodoros || 1, 5));

            return `
              <div class="reminder-item-card ${rem.completed ? 'completed' : ''}" data-id="${rem.id}">
                <div class="reminder-left">
                  <input type="checkbox" class="reminder-checkbox" ${rem.completed ? 'checked' : ''} data-action="toggle" data-id="${rem.id}">
                  <div class="reminder-meta">
                    <div class="reminder-title-text">${this.escapeHtml(rem.title)}</div>
                    <div class="reminder-sub-details">
                      <span class="reminder-due-badge ${isOverdue ? 'overdue' : ''}">
                        📅 ${dateLabel} at ${rem.dueTime}
                      </span>
                      <span class="badge-tag priority-${rem.priority}">${rem.priority.toUpperCase()}</span>
                      <span class="badge-tag">📚 ${this.escapeHtml(rem.subject)}</span>
                      ${rem.recurrence !== 'none' ? `<span class="badge-tag">🔄 ${rem.recurrence}</span>` : ''}
                      <span title="Estimated Focus Sessions" style="font-size: 0.75rem;">${pomodoroBlocks}</span>
                    </div>
                  </div>
                </div>
                <div class="reminder-actions">
                  <button class="icon-btn btn-sm" data-action="snooze" data-id="${rem.id}" title="Snooze 10m">⏰</button>
                  <button class="icon-btn btn-sm" data-action="edit" data-id="${rem.id}" title="Edit">✏️</button>
                  <button class="icon-btn btn-sm text-danger" data-action="delete" data-id="${rem.id}" title="Delete">🗑️</button>
                </div>
              </div>
            `;
          })
          .join('');

        // Delegate list action buttons
        this.listEl.querySelectorAll('[data-action]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            if (action === 'toggle') this.toggleComplete(id);
            else if (action === 'edit') this.openEditModal(id);
            else if (action === 'delete') this.deleteReminder(id);
            else if (action === 'snooze') this.snoozeReminder(id, 10);
          });
        });
      }
    }

    // 2. Render Mini Today Tasks on the Focus Companion
    if (this.miniListEl) {
      const state = storage.getState();
      const todayTasks = state.reminders.filter((r) => !r.completed && (r.dueDate === today || r.dueDate < today));

      if (todayTasks.length === 0) {
        this.miniListEl.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 0.5rem 0;">All caught up for today! 🎉</p>`;
      } else {
        this.miniListEl.innerHTML = todayTasks
          .slice(0, 4)
          .map(
            (t) => `
            <div class="mini-task-item">
              <span class="mini-task-title">
                <input type="checkbox" data-mini-toggle="${t.id}" style="cursor:pointer;">
                <span>${this.escapeHtml(t.title)}</span>
              </span>
              <span class="mono-num" style="color: var(--text-muted); font-size: 0.72rem;">${t.dueTime}</span>
            </div>
          `
          )
          .join('');

        this.miniListEl.querySelectorAll('[data-mini-toggle]').forEach((cb) => {
          cb.addEventListener('change', (e) => {
            this.toggleComplete(e.target.dataset.miniToggle);
          });
        });
      }
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
