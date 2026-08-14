/**
 * StudyPulse - Timetable, Exam Countdown & AI Academic Calendar Intelligence Module
 * Supports Excel (.xlsx, .xls), CSV, PDF, Image OCR & Text parsing.
 * Filters events by Degree Programs & Categories with 1-Click Sync to Timetable & Exam Deadlines.
 */

import { storage } from './storage.js';
import { aiCalendarParser } from './ai-calendar-parser.js';

export class PlannerModule {
  constructor(appCoordinator) {
    this.app = appCoordinator;

    // AI Calendar State
    this.activeCalendar = null;
    this.selectedProgram = 'All Programs';
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.selectedUploadFile = null;

    // Calendar DOM Elements
    this.activeCalendarBadge = document.getElementById('active-calendar-badge');
    this.calendarHeading = document.getElementById('calendar-view-heading');
    this.calendarSubheading = document.getElementById('calendar-view-subheading');
    this.programPillsContainer = document.getElementById('program-filter-pills');
    this.categoryChipsContainer = document.getElementById('category-filter-chips');
    this.calendarSearchInput = document.getElementById('calendar-event-search');
    this.eventsFeed = document.getElementById('calendar-events-feed');
    this.eventsCountHeading = document.getElementById('events-count-heading');
    this.currentFilterBadge = document.getElementById('current-filter-badge');

    // Summary Metric Elements
    this.metricTotalDays = document.getElementById('metric-total-days');
    this.metricTeachingDays = document.getElementById('metric-teaching-days');
    this.metricExamDays = document.getElementById('metric-exam-days');
    this.metricHolidayDays = document.getElementById('metric-holiday-days');
    this.metricNonTeaching = document.getElementById('metric-non-teaching');

    // AI Upload & Key Dialogs
    this.uploadDialog = document.getElementById('ai-calendar-upload-dialog');
    this.openUploadBtn = document.getElementById('open-upload-calendar-modal-btn');
    this.clearCalendarBtn = document.getElementById('clear-calendar-btn');
    this.openKeyBtn = document.getElementById('open-ai-key-modal-btn');
    this.aiKeyDialog = document.getElementById('ai-key-dialog');
    this.saveKeyBtn = document.getElementById('save-ai-key-btn');
    this.clearKeyBtn = document.getElementById('clear-ai-key-btn');
    this.keyInput = document.getElementById('gemini-api-key-input');

    // Upload Tabs & Dropzone
    this.tabBtnFile = document.getElementById('tab-btn-file');
    this.tabBtnText = document.getElementById('tab-btn-text');
    this.tabContentFile = document.getElementById('tab-content-file');
    this.tabContentText = document.getElementById('tab-content-text');
    this.dropzone = document.getElementById('ai-file-dropzone');
    this.fileInput = document.getElementById('ai-calendar-file-input');
    this.selectedFileDisplay = document.getElementById('selected-file-display');
    this.selectedFileName = document.getElementById('selected-file-name');
    this.clearFileBtn = document.getElementById('clear-selected-file-btn');
    this.textInput = document.getElementById('ai-calendar-text-input');
    this.submitAiCalendarBtn = document.getElementById('submit-ai-calendar-btn');
    this.aiProgressCard = document.getElementById('ai-upload-progress');
    this.aiProgressText = document.getElementById('ai-progress-text');

    // Bulk Sync Buttons
    this.bulkSyncExamsBtn = document.getElementById('bulk-sync-exams-btn');
    this.bulkSyncRemindersBtn = document.getElementById('bulk-sync-reminders-btn');
    this.exportIcsBtn = document.getElementById('export-ics-btn');

    // Exam & Spaced Repetition Elements
    this.examListEl = document.getElementById('exam-countdown-list');
    this.spacedListEl = document.getElementById('spaced-topics-list');

    this.examDialog = document.getElementById('exam-dialog');
    this.examForm = document.getElementById('exam-form');
    this.addExamBtn = document.getElementById('add-exam-btn');

    this.spacedDialog = document.getElementById('spaced-topic-dialog');
    this.spacedForm = document.getElementById('spaced-topic-form');
    this.addSpacedBtn = document.getElementById('add-spaced-topic-btn');

    this.init();
  }

  init() {
    this.initActiveCalendar();
    this.bindEvents();
    this.bindCalendarEvents();
    this.render();

    // Live countdown update every minute
    setInterval(() => this.renderExams(), 60000);
  }

  initActiveCalendar() {
    this.activeCalendar = storage.getActiveCalendar();
  }

  bindEvents() {
    // 1. Exam Modal
    if (this.addExamBtn) {
      this.addExamBtn.addEventListener('click', () => {
        this.examForm.reset();
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        document.getElementById('exam-date-input').value = tomorrow;
        this.examDialog.showModal();
      });
    }

    if (this.examForm) {
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
    }

    // 3. Spaced Topic Modal
    if (this.addSpacedBtn) {
      this.addSpacedBtn.addEventListener('click', () => {
        this.spacedForm.reset();
        this.spacedDialog.showModal();
      });
    }

    if (this.spacedForm) {
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
    }

    storage.subscribe(() => this.render());
  }

  bindCalendarEvents() {
    // 1. Open Upload Modal
    if (this.openUploadBtn && this.uploadDialog) {
      this.openUploadBtn.addEventListener('click', () => {
        this.resetUploadModal();
        this.uploadDialog.showModal();
      });
    }

    // 2. Clear / Reset Calendar Button
    if (this.clearCalendarBtn) {
      this.clearCalendarBtn.addEventListener('click', () => {
        storage.resetToDefaultCalendar();
        this.initActiveCalendar();
        this.selectedProgram = 'All Programs';
        this.selectedCategory = 'all';
        this.searchQuery = '';
        if (this.calendarSearchInput) this.calendarSearchInput.value = '';
        this.render();
        this.app.showToast('Schedule Reset 🔄', 'Reset to clean default academic schedule.', 'info');
      });
    }

    // 3. AI Gemini Key Modal
    if (this.openKeyBtn && this.aiKeyDialog) {
      this.openKeyBtn.addEventListener('click', () => {
        if (this.keyInput) this.keyInput.value = aiCalendarParser.getApiKey();
        this.aiKeyDialog.showModal();
      });
    }

    if (this.saveKeyBtn) {
      this.saveKeyBtn.addEventListener('click', () => {
        const key = this.keyInput ? this.keyInput.value.trim() : '';
        aiCalendarParser.setApiKey(key);
        if (this.aiKeyDialog) this.aiKeyDialog.close();
        this.app.showToast('AI Settings Saved ✨', key ? 'Gemini AI API Key configured.' : 'Using built-in neural table parser.', 'info');
      });
    }

    if (this.clearKeyBtn) {
      this.clearKeyBtn.addEventListener('click', () => {
        aiCalendarParser.setApiKey('');
        if (this.keyInput) this.keyInput.value = '';
        if (this.aiKeyDialog) this.aiKeyDialog.close();
        this.app.showToast('Key Cleared', 'Switched back to offline neural parser.', 'info');
      });
    }

    // 4. Upload Modal Tabs Switcher
    if (this.tabBtnFile && this.tabBtnText) {
      this.tabBtnFile.addEventListener('click', () => {
        this.tabBtnFile.classList.add('active');
        this.tabBtnText.classList.remove('active');
        this.tabContentFile.classList.remove('hidden');
        this.tabContentText.classList.add('hidden');
      });

      this.tabBtnText.addEventListener('click', () => {
        this.tabBtnText.classList.add('active');
        this.tabBtnFile.classList.remove('active');
        this.tabContentText.classList.remove('hidden');
        this.tabContentFile.classList.add('hidden');
      });
    }

    // 5. File Dropzone & File Input
    if (this.dropzone && this.fileInput) {
      this.dropzone.addEventListener('click', (e) => {
        if (e.target === this.clearFileBtn || e.target.closest('#clear-selected-file-btn')) return;
        this.fileInput.click();
      });

      this.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.dropzone.classList.add('drag-active');
      });

      this.dropzone.addEventListener('dragleave', () => {
        this.dropzone.classList.remove('drag-active');
      });

      this.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.dropzone.classList.remove('drag-active');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleSelectedFile(e.dataTransfer.files[0]);
        }
      });

      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleSelectedFile(e.target.files[0]);
        }
      });
    }

    if (this.clearFileBtn) {
      this.clearFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedUploadFile = null;
        if (this.fileInput) this.fileInput.value = '';
        if (this.selectedFileDisplay) this.selectedFileDisplay.classList.add('hidden');
      });
    }

    // 6. Submit AI Process Button
    if (this.submitAiCalendarBtn) {
      this.submitAiCalendarBtn.addEventListener('click', () => this.handleProcessUpload());
    }

    // 7. Search Input
    if (this.calendarSearchInput) {
      const clearBtn = document.getElementById('calendar-search-clear-btn');

      const updateClearBtn = () => {
        if (clearBtn) clearBtn.style.display = this.calendarSearchInput.value ? 'flex' : 'none';
      };

      this.calendarSearchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        updateClearBtn();
        this.renderCalendarFeed();
      });

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.calendarSearchInput.value = '';
          this.searchQuery = '';
          clearBtn.style.display = 'none';
          this.calendarSearchInput.focus();
          this.renderCalendarFeed();
        });
      }
    }

    // 8. Category Filter Chips
    if (this.categoryChipsContainer) {
      this.categoryChipsContainer.querySelectorAll('.cat-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          this.categoryChipsContainer.querySelectorAll('.cat-chip').forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
          this.selectedCategory = chip.dataset.category || 'all';
          this.renderCalendarFeed();
        });
      });
    }

    // 9. Bulk Sync Actions
    if (this.bulkSyncExamsBtn) {
      this.bulkSyncExamsBtn.addEventListener('click', () => {
        if (!this.activeCalendar) {
          this.app.showToast('No Calendar', 'Upload an academic calendar first.', 'info');
          return;
        }
        const count = aiCalendarParser.bulkSyncExams(this.activeCalendar, this.selectedProgram);
        this.renderExams();
        this.app.showToast('Exams Synced 🎯', `Added ${count} exam targets to your Countdown tracker.`, 'success');
      });
    }

    if (this.bulkSyncRemindersBtn) {
      this.bulkSyncRemindersBtn.addEventListener('click', async () => {
        if (!this.activeCalendar) {
          this.app.showToast('No Calendar', 'Upload an academic calendar first.', 'info');
          return;
        }
        const count = await aiCalendarParser.bulkSyncReminders(this.activeCalendar, this.selectedProgram);
        this.app.showToast('Reminders Created 🔔', `Scheduled ${count} academic milestone notifications.`, 'success');
      });
    }

    if (this.exportIcsBtn) {
      this.exportIcsBtn.addEventListener('click', () => {
        if (!this.activeCalendar) {
          this.app.showToast('No Calendar', 'Upload an academic calendar first.', 'info');
          return;
        }
        aiCalendarParser.exportToICS(this.activeCalendar, this.selectedProgram);
        this.app.showToast('iCal Exported 📅', `Exported .ics for ${this.selectedProgram}.`, 'success');
      });
    }
  }

  handleSelectedFile(file) {
    this.selectedUploadFile = file;
    if (this.selectedFileName) this.selectedFileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    if (this.selectedFileDisplay) this.selectedFileDisplay.classList.remove('hidden');
  }

  resetUploadModal() {
    this.selectedUploadFile = null;
    if (this.fileInput) this.fileInput.value = '';
    if (this.selectedFileDisplay) this.selectedFileDisplay.classList.add('hidden');
    if (this.textInput) this.textInput.value = '';
    if (this.aiProgressCard) this.aiProgressCard.classList.add('hidden');
    if (this.submitAiCalendarBtn) this.submitAiCalendarBtn.disabled = false;

    // Reset progress steps
    for (let i = 1; i <= 4; i++) {
      const stepEl = document.getElementById(`step-${i}`);
      if (stepEl) stepEl.classList.remove('active', 'completed');
    }
  }

  async handleProcessUpload() {
    const isFileTab = this.tabBtnFile && this.tabBtnFile.classList.contains('active');
    const textVal = this.textInput ? this.textInput.value.trim() : '';

    if (isFileTab && !this.selectedUploadFile) {
      this.app.showToast('Select a File', 'Please choose an Excel (.xlsx, .xls), CSV, PDF, or Image file.', 'warning');
      return;
    }

    if (!isFileTab && !textVal) {
      this.app.showToast('Enter Text', 'Please paste timetable or circular text.', 'warning');
      return;
    }

    try {
      if (this.submitAiCalendarBtn) this.submitAiCalendarBtn.disabled = true;
      if (this.aiProgressCard) this.aiProgressCard.classList.remove('hidden');

      const onProgress = ({ step, text }) => {
        if (this.aiProgressText) this.aiProgressText.textContent = text;
        for (let s = 1; s <= 4; s++) {
          const stepEl = document.getElementById(`step-${s}`);
          if (!stepEl) continue;
          if (s < step) {
            stepEl.classList.remove('active');
            stepEl.classList.add('completed');
          } else if (s === step) {
            stepEl.classList.add('active');
            stepEl.classList.remove('completed');
          } else {
            stepEl.classList.remove('active', 'completed');
          }
        }
      };

      const parsedCalendar = await aiCalendarParser.processInput({
        file: isFileTab ? this.selectedUploadFile : null,
        text: !isFileTab ? textVal : '',
        onProgress
      });

      // Save to storage
      storage.saveAcademicCalendar(parsedCalendar);
      this.activeCalendar = parsedCalendar;
      this.selectedProgram = 'All Programs';
      this.selectedCategory = 'all';

      await new Promise((r) => setTimeout(r, 400));

      if (this.uploadDialog) this.uploadDialog.close();
      this.render();
      this.app.showToast('Schedule Processed ✨', `Extracted ${parsedCalendar.events.length} academic milestones & courses.`, 'success');
    } catch (err) {
      console.error('[Planner] Upload Error:', err);
      this.app.showToast('Processing Error', err.message || 'Could not parse document.', 'danger');
    } finally {
      if (this.submitAiCalendarBtn) this.submitAiCalendarBtn.disabled = false;
      if (this.aiProgressCard) this.aiProgressCard.classList.add('hidden');
    }
  }

  render() {
    this.renderCalendarHeader();
    this.renderCalendarMetrics();
    this.renderProgramPills();
    this.renderCalendarFeed();
    this.renderExams();
    this.renderSpacedTopics();
  }

  renderCalendarHeader() {
    if (!this.activeCalendar) {
      if (this.activeCalendarBadge) this.activeCalendarBadge.textContent = 'No Schedule Uploaded';
      if (this.calendarHeading) this.calendarHeading.textContent = 'Academic Calendar Hub';
      if (this.calendarSubheading) {
        this.calendarSubheading.textContent = 'Upload your university academic calendar (Excel, PDF, Image, CSV) or paste circular text to sort events by program, track exams, and sync schedules.';
      }
      if (this.clearCalendarBtn) this.clearCalendarBtn.style.display = 'none';
      return;
    }

    if (this.activeCalendarBadge) {
      this.activeCalendarBadge.textContent = `${this.activeCalendar.institution || 'Academic Calendar'} • ${this.activeCalendar.semester || this.activeCalendar.academicYear || 'Current Schedule'}`;
    }
    if (this.calendarHeading) {
      this.calendarHeading.textContent = this.activeCalendar.title || 'Academic Calendar';
    }
    if (this.calendarSubheading) {
      this.calendarSubheading.textContent = `Applicable to: ${this.activeCalendar.applicableBatches || 'All Enrolled Batches'}. Filter below to view specific programs and courses.`;
    }
    if (this.clearCalendarBtn) this.clearCalendarBtn.style.display = 'inline-flex';
  }

  renderCalendarMetrics() {
    if (!this.activeCalendar) {
      if (this.metricTotalDays) this.metricTotalDays.textContent = '--';
      if (this.metricTeachingDays) this.metricTeachingDays.textContent = '--';
      if (this.metricExamDays) this.metricExamDays.textContent = '--';
      if (this.metricHolidayDays) this.metricHolidayDays.textContent = '--';
      if (this.metricNonTeaching) this.metricNonTeaching.textContent = '--';
      return;
    }

    const stats = this.activeCalendar.summaryStats || {
      totalSemesterDays: 150,
      teachingDays: 90,
      examDays: 15,
      nonTeachingDays: 10,
      holidays: 25
    };

    if (this.metricTotalDays) this.metricTotalDays.textContent = stats.totalSemesterDays || '150';
    if (this.metricTeachingDays) this.metricTeachingDays.textContent = stats.teachingDays || '90';
    if (this.metricExamDays) this.metricExamDays.textContent = stats.examDays || '15';
    if (this.metricHolidayDays) this.metricHolidayDays.textContent = stats.holidays || '25';
    if (this.metricNonTeaching) this.metricNonTeaching.textContent = stats.nonTeachingDays || '10';
  }

  renderProgramPills() {
    if (!this.programPillsContainer) return;
    const programs = this.activeCalendar ? this.activeCalendar.programs || ['All Programs'] : ['All Programs'];

    const emojiMap = {
      'All Programs': '🌟',
      'B-Tech (4 Years)': '💻',
      'BCA / MCA / MBA': '🖥️',
      'B.A / B.Com / B.Sc / BBA': '📊',
      '1st Year (Freshers)': '🎓',
      'Undergraduate (UG)': '📚',
      'Postgraduate (PG)': '🎓'
    };

    this.programPillsContainer.innerHTML = programs
      .map((prog) => {
        const isActive = this.selectedProgram === prog;
        const icon = emojiMap[prog] || '📚';
        return `
          <button class="filter-pill ${isActive ? 'active' : ''}" data-program="${this.escapeHtml(prog)}">
            ${icon} ${this.escapeHtml(prog)}
          </button>
        `;
      })
      .join('');

    this.programPillsContainer.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        this.selectedProgram = pill.dataset.program;
        this.renderProgramPills();
        this.renderCalendarFeed();
      });
    });
  }

  renderCalendarFeed() {
    if (!this.eventsFeed) return;

    if (!this.activeCalendar || !this.activeCalendar.events || this.activeCalendar.events.length === 0) {
      if (this.eventsCountHeading) this.eventsCountHeading.textContent = 'Academic Milestones & Courses (0 Events)';
      if (this.currentFilterBadge) this.currentFilterBadge.textContent = 'No Schedule Uploaded';

      this.eventsFeed.innerHTML = `
        <div class="calendar-empty-state">
          <div style="font-size: 2.2rem; margin-bottom: 0.75rem;">📅</div>
          <h3 style="font-weight:700; color: var(--text-primary); margin-bottom: 0.4rem;">No Academic Calendar Uploaded Yet</h3>
          <p style="font-size:0.85rem; color: var(--text-muted); max-width: 480px; margin: 0 auto 1.25rem;">Upload your university academic calendar, timetable spreadsheet (Excel, CSV), PDF, or image to sort events by program and sync exam deadlines.</p>
          <button class="btn btn-primary" id="empty-state-upload-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Upload Calendar / Timetable</span>
          </button>
        </div>
      `;

      const emptyBtn = document.getElementById('empty-state-upload-btn');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
          this.resetUploadModal();
          if (this.uploadDialog) this.uploadDialog.showModal();
        });
      }
      return;
    }

    const rawEvents = this.activeCalendar.events || [];
    const now = new Date();

    const programIcons = {
      'B-Tech (4 Years)': '💻',
      'BCA / MCA / MBA': '🖥️',
      'B.A / B.Com / B.Sc / BBA': '📊',
      '1st Year (Freshers)': '🎓',
      'All Programs': '🌟',
      'Undergraduate (UG)': '📚',
      'Postgraduate (PG)': '🎓'
    };

    // Filter events by Category and Search Query
    let filtered = rawEvents.filter((ev) => {
      // Category matching
      if (this.selectedCategory !== 'all' && ev.category !== this.selectedCategory) {
        return false;
      }
      // Search matching
      if (this.searchQuery) {
        const q = this.searchQuery;
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchNotes = ev.notes && ev.notes.toLowerCase().includes(q);
        const matchProgram = ev.program && ev.program.toLowerCase().includes(q);
        const matchDate = ev.dateDisplay && ev.dateDisplay.toLowerCase().includes(q);
        if (!matchTitle && !matchNotes && !matchProgram && !matchDate) return false;
      }
      return true;
    });

    // Update Counts & Badges
    if (this.eventsCountHeading) {
      this.eventsCountHeading.textContent = `Academic Events & Milestones (${filtered.length} of ${rawEvents.length})`;
    }
    if (this.currentFilterBadge) {
      this.currentFilterBadge.textContent = `Showing: ${this.selectedProgram} ${this.selectedCategory !== 'all' ? '• ' + this.selectedCategory.toUpperCase() : ''}`;
    }

    if (filtered.length === 0) {
      this.eventsFeed.innerHTML = `
        <div class="calendar-empty-state">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <p style="font-weight:600; color: var(--text-primary);">No events match the selected criteria</p>
          <p style="font-size:0.8rem; color: var(--text-muted);">Try selecting "All Programs" or changing the category filter.</p>
        </div>
      `;
      return;
    }

    // Determine Course Sections to build
    const sectionsToBuild = [];
    const definedPrograms = this.activeCalendar.programs && this.activeCalendar.programs.length > 0
      ? this.activeCalendar.programs
      : ['B-Tech (4 Years)', 'BCA / MCA / MBA', 'B.A / B.Com / B.Sc / BBA', '1st Year (Freshers)', 'All Programs'];

    if (this.selectedProgram === 'All Programs') {
      definedPrograms.forEach((prog) => {
        if (prog !== 'All Programs') {
          const eventsInCourse = filtered.filter((ev) => ev.program === prog);
          if (eventsInCourse.length > 0) {
            sectionsToBuild.push({ program: prog, title: `${prog} Schedule`, events: eventsInCourse });
          }
        }
      });

      // University-Wide / Common Milestones
      const commonEvents = filtered.filter((ev) => !ev.program || ev.program === 'All Programs' || ev.program === 'Common');
      if (commonEvents.length > 0) {
        sectionsToBuild.push({
          program: 'All Programs',
          title: '🌟 University-Wide & Common Milestones',
          events: commonEvents
        });
      }

      // Any remaining uncategorized events
      const alreadyIncludedIds = new Set(sectionsToBuild.flatMap((s) => s.events.map((e) => e.id)));
      const leftoverEvents = filtered.filter((ev) => !alreadyIncludedIds.has(ev.id));
      if (leftoverEvents.length > 0) {
        sectionsToBuild.push({
          program: 'General Courses',
          title: '📚 General Academic Schedule',
          events: leftoverEvents
        });
      }
    } else {
      // Specific Program Selected
      const eventsInSelected = filtered.filter((ev) => ev.program === this.selectedProgram || ev.program === 'All Programs');
      sectionsToBuild.push({
        program: this.selectedProgram,
        title: `${this.selectedProgram} Academic Schedule`,
        events: eventsInSelected.length > 0 ? eventsInSelected : filtered
      });
    }

    // Render grouped course sections with cards inside
    this.eventsFeed.innerHTML = sectionsToBuild
      .map((section) => {
        const prog = section.program;
        const icon = programIcons[prog] || '📚';
        const courseEvents = section.events || [];
        const examCount = courseEvents.filter((e) => e.category === 'exam' || e.title.toLowerCase().includes('exam') || e.title.toLowerCase().includes('test')).length;

        const cardsHtml = courseEvents
          .map((ev) => this.renderEventCardHtml(ev, now))
          .join('');

        return `
          <div class="course-schedule-section" data-course-section="${this.escapeHtml(prog)}">
            <div class="course-section-header">
              <div class="course-section-title-wrap">
                <span class="course-section-icon">${icon}</span>
                <div class="course-section-text">
                  <h3>${this.escapeHtml(section.title)}</h3>
                  <span class="course-section-subtitle">${courseEvents.length} Calendar Milestones · ${examCount} Exam Target${examCount === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div class="course-section-actions">
                ${examCount > 0 ? `
                  <button class="btn btn-subtle btn-xs" data-sync-course-exams="${this.escapeHtml(prog)}" title="Sync all ${this.escapeHtml(prog)} exams to Deadlines tracker">
                    ⚡ Sync ${this.escapeHtml(prog.split(' ')[0])} Exams
                  </button>
                ` : ''}
                <button class="btn btn-subtle btn-xs" data-sync-course-reminders="${this.escapeHtml(prog)}" title="Sync all ${this.escapeHtml(prog)} dates to Smart Reminders">
                  🔔 Sync Reminders
                </button>
              </div>
            </div>

            <div class="course-cards-grid">
              ${cardsHtml}
            </div>
          </div>
        `;
      })
      .join('');

    // Attach sync button handlers
    this.bindEventCardActions(rawEvents);
  }

  renderEventCardHtml(ev, now) {
    const catBadgeClass = `badge-cat-${ev.category || 'general'}`;
    const catIconMap = {
      exam: '🎯 EXAM',
      registration: '📝 REGISTRATION',
      lab: '🔬 LAB / VIVA',
      holiday: '🎉 HOLIDAY',
      vacation: '🏖️ VACATION',
      class: '📚 CLASS',
      project: '💼 PROJECT',
      result: '🏆 RESULTS',
      general: '📌 NOTICE'
    };
    const catLabel = catIconMap[ev.category] || '📌 EVENT';

    let countdownBadge = '';
    if (ev.startDate) {
      const evDate = new Date(ev.startDate);
      const diffDays = Math.ceil((evDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        countdownBadge = `<span class="event-rel-time past">Past Milestone</span>`;
      } else if (diffDays === 0) {
        countdownBadge = `<span class="event-rel-time today">Today!</span>`;
      } else if (diffDays === 1) {
        countdownBadge = `<span class="event-rel-time soon">Tomorrow</span>`;
      } else {
        countdownBadge = `<span class="event-rel-time future">In ${diffDays} days</span>`;
      }
    }

    const isExam = ev.category === 'exam' || ev.title.toLowerCase().includes('exam') || ev.title.toLowerCase().includes('test');

    return `
      <div class="ai-event-card card" data-event-id="${ev.id}">
        <div class="event-card-top">
          <div class="event-tags-row">
            <span class="event-category-badge ${catBadgeClass}">${catLabel}</span>
            <span class="event-program-tag">${this.escapeHtml(ev.program || 'All Programs')}</span>
            ${ev.batch ? `<span class="event-batch-tag">${this.escapeHtml(ev.batch)}</span>` : ''}
          </div>
          <div class="event-top-right">
            ${countdownBadge}
            <button class="event-card-delete-btn" data-delete-event="${ev.id}" title="Remove this event / card">✕</button>
          </div>
        </div>

        <div class="event-main-info">
          <h4 class="event-title">${this.escapeHtml(ev.title)}</h4>
          <div class="event-date-row">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span class="event-date-text">${this.escapeHtml(ev.dateDisplay || ev.startDate || 'Scheduled')}</span>
          </div>
          ${ev.notes ? `<p class="event-notes-text">${this.escapeHtml(ev.notes)}</p>` : ''}
        </div>

        <div class="event-action-footer">
          <button class="btn btn-subtle btn-xs" data-sync-event-reminder="${ev.id}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span>Sync to Reminder</span>
          </button>
          ${
            isExam
              ? `
            <button class="btn btn-primary btn-xs" data-sync-event-exam="${ev.id}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>+ Add Target</span>
            </button>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  bindEventCardActions(rawEvents) {
    // Individual Card Delete Button
    this.eventsFeed.querySelectorAll('[data-delete-event]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const evId = btn.dataset.deleteEvent;
        if (this.activeCalendar) {
          storage.deleteCalendarEvent(this.activeCalendar.id, evId);
          this.initActiveCalendar();
          this.renderCalendarFeed();
          this.app.showToast('Card Removed 🗑️', 'Event removed from calendar.', 'info');
        }
      });
    });

    // Individual Card Reminders
    this.eventsFeed.querySelectorAll('[data-sync-event-reminder]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const evId = btn.dataset.syncEventReminder;
        const event = rawEvents.find((x) => x.id === evId);
        if (event) {
          await aiCalendarParser.syncEventToReminders(event);
          this.app.showToast('Reminder Synced 🔔', `Added "${event.title}" to Reminders.`, 'success');
        }
      });
    });

    // Individual Card Exam Targets
    this.eventsFeed.querySelectorAll('[data-sync-event-exam]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const evId = btn.dataset.syncEventExam;
        const event = rawEvents.find((x) => x.id === evId);
        if (event) {
          aiCalendarParser.syncEventToExamTargets(event);
          this.renderExams();
          this.app.showToast('Exam Target Added 🎯', `Added "${event.title}" to Countdown Deadlines.`, 'success');
        }
      });
    });

    // Course Section Bulk Exam Sync
    this.eventsFeed.querySelectorAll('[data-sync-course-exams]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const prog = btn.dataset.syncCourseExams;
        if (!this.activeCalendar) return;
        const count = aiCalendarParser.bulkSyncExams(this.activeCalendar, prog);
        this.renderExams();
        this.app.showToast('Exams Synced 🎯', `Added ${count} ${prog} exams to Countdown tracker.`, 'success');
      });
    });

    // Course Section Bulk Reminder Sync
    this.eventsFeed.querySelectorAll('[data-sync-course-reminders]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const prog = btn.dataset.syncCourseReminders;
        if (!this.activeCalendar) return;
        const count = await aiCalendarParser.bulkSyncReminders(this.activeCalendar, prog);
        this.app.showToast('Reminders Created 🔔', `Scheduled ${count} ${prog} milestone alerts.`, 'success');
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
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
