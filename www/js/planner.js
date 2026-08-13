/**
 * StudyPulse - Timetable, Exam Countdown & Spaced Repetition Planner Module
 */

import { storage } from './storage.js';

export class PlannerModule {
  constructor(appCoordinator) {
    this.app = appCoordinator;

    // DOM Elements
    this.timetableGrid = document.getElementById('timetable-grid');
    this.examListEl = document.getElementById('exam-countdown-list');
    this.spacedListEl = document.getElementById('spaced-topics-list');

    // Dialogs & Forms
    this.timetableDialog = document.getElementById('timetable-dialog');
    this.timetableForm = document.getElementById('timetable-form');
    this.addSlotBtn = document.getElementById('add-timetable-slot-btn');

    this.examDialog = document.getElementById('exam-dialog');
    this.examForm = document.getElementById('exam-form');
    this.addExamBtn = document.getElementById('add-exam-btn');

    this.spacedDialog = document.getElementById('spaced-topic-dialog');
    this.spacedForm = document.getElementById('spaced-topic-form');
    this.addSpacedBtn = document.getElementById('add-spaced-topic-btn');

    this.init();
  }

  init() {
    this.bindEvents();
    this.render();
    // Live countdown update every minute
    setInterval(() => this.renderExams(), 60000);
  }

  bindEvents() {
    // 1. Timetable Slot Modal
    if (this.addSlotBtn) {
      this.addSlotBtn.addEventListener('click', () => {
        this.timetableForm.reset();
        this.timetableDialog.showModal();
      });
    }

    this.timetableForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const day = document.getElementById('slot-day-select').value;
      const subject = document.getElementById('slot-subject-input').value.trim();
      const startTime = document.getElementById('slot-start-time').value;
      const endTime = document.getElementById('slot-end-time').value;
      const color = document.getElementById('slot-color-select').value;

      if (!subject || !startTime || !endTime) return;

      const state = storage.getState();
      state.timetable.push({
        id: `tt-${Date.now()}`,
        day,
        subject,
        startTime,
        endTime,
        color
      });

      storage.save(state);
      this.timetableDialog.close();
      this.app.showToast('Slot Added', `Added ${subject} to ${day}`, 'success');
      this.render();
    });

    // 2. Exam Modal
    if (this.addExamBtn) {
      this.addExamBtn.addEventListener('click', () => {
        this.examForm.reset();
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        document.getElementById('exam-date-input').value = tomorrow;
        this.examDialog.showModal();
      });
    }

    this.examForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('exam-title-input').value.trim();
      const date = document.getElementById('exam-date-input').value;
      const time = document.getElementById('exam-time-input').value;
      const targetScore = document.getElementById('exam-target-score').value.trim();

      if (!title || !date) return;

      const state = storage.getState();
      state.exams.push({
        id: `ex-${Date.now()}`,
        title,
        date,
        time: time || '09:00',
        targetScore: targetScore || 'Target: Pass'
      });

      storage.save(state);
      this.examDialog.close();
      this.app.showToast('Exam Set 🎯', `Exam target set for ${title}`, 'success');
      this.render();
    });

    // 3. Spaced Topic Modal
    if (this.addSpacedBtn) {
      this.addSpacedBtn.addEventListener('click', () => {
        this.spacedForm.reset();
        this.spacedDialog.showModal();
      });
    }

    this.spacedForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('topic-title-input').value.trim();
      const subject = document.getElementById('topic-subject-input').value.trim() || 'General';

      if (!title) return;

      const state = storage.getState();
      state.spacedTopics.push({
        id: `sp-${Date.now()}`,
        title,
        subject,
        createdDate: new Date().toISOString().split('T')[0],
        stages: [
          { label: 'Day 1', done: true },
          { label: 'Day 3', done: false },
          { label: 'Day 7', done: false },
          { label: 'Day 30', done: false }
        ]
      });

      storage.save(state);
      this.spacedDialog.close();
      this.app.showToast('Topic Tracked 🧠', `Spaced repetition schedule started for ${title}`, 'success');
      this.render();
    });

    storage.subscribe(() => this.render());
  }

  render() {
    this.renderTimetable();
    this.renderExams();
    this.renderSpacedTopics();
  }

  renderTimetable() {
    if (!this.timetableGrid) return;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const state = storage.getState();

    this.timetableGrid.innerHTML = days
      .map((day) => {
        const slotsForDay = state.timetable
          .filter((s) => s.day === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        const slotsHtml = slotsForDay.length
          ? slotsForDay
              .map(
                (s) => `
              <div class="timetable-slot-item slot-${s.color || 'blue'}" data-slot-id="${s.id}">
                <span class="slot-time">${s.startTime} - ${s.endTime}</span>
                <span class="slot-title">${this.escapeHtml(s.subject)}</span>
                <span class="slot-delete-btn" data-delete-slot="${s.id}">✕</span>
              </div>
            `
              )
              .join('')
          : `<p style="font-size: 0.75rem; color: var(--text-muted); text-align: center; margin-top: 1rem;">No slots</p>`;

        return `
          <div class="timetable-day-col" data-day-name="${day}">
            <div class="timetable-day-header">${day}</div>
            ${slotsHtml}
          </div>
        `;
      })
      .join('');

    // Clicking day column header or empty area to add slot for that specific day
    this.timetableGrid.querySelectorAll('.timetable-day-col').forEach((col) => {
      col.addEventListener('click', (e) => {
        if (e.target.closest('.timetable-slot-item')) return;
        const day = col.dataset.dayName;
        this.timetableForm.reset();
        const daySelect = document.getElementById('slot-day-select');
        if (daySelect && day) daySelect.value = day;
        this.timetableDialog.showModal();
      });
    });

    // Delete buttons
    this.timetableGrid.querySelectorAll('[data-delete-slot]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteSlot;
        const state = storage.getState();
        state.timetable = state.timetable.filter((s) => s.id !== id);
        storage.save(state);
      });
    });
  }

  renderExams() {
    if (!this.examListEl) return;
    const state = storage.getState();
    const now = new Date();

    if (!state.exams || state.exams.length === 0) {
      this.examListEl.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted);">No upcoming exam targets.</p>`;
      return;
    }

    // Sort by date ascending
    const sorted = [...state.exams].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

    this.examListEl.innerHTML = sorted
      .map((exam) => {
        const examDate = new Date(`${exam.date}T${exam.time}`);
        const diffMs = examDate - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let countdownLabel = `${diffDays} days left`;
        if (diffDays <= 0) countdownLabel = 'Today!';
        else if (diffDays === 1) countdownLabel = 'Tomorrow!';

        return `
          <div class="exam-item-card">
            <div>
              <div style="font-weight: 600; font-size: 0.88rem;">${this.escapeHtml(exam.title)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                📅 ${exam.date} • ${this.escapeHtml(exam.targetScore || '')}
              </div>
            </div>
            <div style="display:flex; align-items:center; gap: 0.4rem;">
              <span class="exam-countdown-badge">${countdownLabel}</span>
              <button class="text-btn-xs text-danger" data-delete-exam="${exam.id}">✕</button>
            </div>
          </div>
        `;
      })
      .join('');

    this.examListEl.querySelectorAll('[data-delete-exam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteExam;
        const state = storage.getState();
        state.exams = state.exams.filter((e) => e.id !== id);
        storage.save(state);
      });
    });
  }

  renderSpacedTopics() {
    if (!this.spacedListEl) return;
    const state = storage.getState();

    if (!state.spacedTopics || state.spacedTopics.length === 0) {
      this.spacedListEl.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted);">No topics tracked.</p>`;
      return;
    }

    this.spacedListEl.innerHTML = state.spacedTopics
      .map(
        (topic) => `
        <div class="spaced-topic-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-weight: 600; font-size: 0.85rem;">${this.escapeHtml(topic.title)}</div>
              <span style="font-size: 0.72rem; color: var(--color-primary);">${this.escapeHtml(topic.subject)}</span>
            </div>
            <button class="text-btn-xs text-danger" data-delete-topic="${topic.id}">✕</button>
          </div>
          <div class="spaced-steps">
            ${topic.stages
              .map(
                (stage, idx) => `
              <button class="step-chip ${stage.done ? 'done' : ''}" data-topic-id="${topic.id}" data-stage-idx="${idx}">
                ${stage.done ? '✓ ' : ''}${stage.label}
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      `
      )
      .join('');

    // Toggle stage
    this.spacedListEl.querySelectorAll('.step-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const topicId = chip.dataset.topicId;
        const stageIdx = parseInt(chip.dataset.stageIdx, 10);
        const state = storage.getState();
        const topic = state.spacedTopics.find((t) => t.id === topicId);
        if (topic && topic.stages[stageIdx]) {
          topic.stages[stageIdx].done = !topic.stages[stageIdx].done;
          if (topic.stages[stageIdx].done) {
            storage.addXP(20);
            this.app.showToast('Review Completed! 🧠', `+20 XP for reviewing ${topic.title}`, 'success');
          }
          storage.save(state);
        }
      });
    });

    // Delete topic
    this.spacedListEl.querySelectorAll('[data-delete-topic]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteTopic;
        const state = storage.getState();
        state.spacedTopics = state.spacedTopics.filter((t) => t.id !== id);
        storage.save(state);
      });
    });
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
