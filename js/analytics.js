/**
 * StudyPulse - LeetCode Style Analytics & Profile Insights Module
 * Renders the multi-arc donut chart, 52-week contribution heatmap, difficulty breakdown & recent submissions.
 */

import { storage } from './storage.js';

export class AnalyticsModule {
  constructor(appCoordinator) {
    this.app = appCoordinator;

    // Header Profile Elements
    this.usernameEl = document.getElementById('lc-username');
    this.avatarLvlEl = document.getElementById('lc-avatar-lvl');
    this.ratingValEl = document.getElementById('lc-rating-val');
    this.streakValEl = document.getElementById('lc-streak-val');
    this.totalTimeStatEl = document.getElementById('lc-total-time-stat');
    this.activeDaysStatEl = document.getElementById('lc-active-days-stat');

    // Donut Elements
    this.donutCountEl = document.getElementById('lc-donut-count');
    this.donutSubTimeEl = document.getElementById('lc-donut-sub-time');
    this.totalSolvedSubtitle = document.getElementById('lc-total-solved-subtitle');
    this.arcEasy = document.getElementById('lc-arc-easy');
    this.arcMedium = document.getElementById('lc-arc-medium');
    this.arcHard = document.getElementById('lc-arc-hard');

    this.easyFractionEl = document.getElementById('lc-easy-fraction');
    this.mediumFractionEl = document.getElementById('lc-medium-fraction');
    this.hardFractionEl = document.getElementById('lc-hard-fraction');
    this.easyBar = document.getElementById('lc-easy-bar');
    this.mediumBar = document.getElementById('lc-medium-bar');
    this.hardBar = document.getElementById('lc-hard-bar');
    this.easyBeatsEl = document.getElementById('lc-easy-beats');
    this.mediumBeatsEl = document.getElementById('lc-medium-beats');
    this.hardBeatsEl = document.getElementById('lc-hard-beats');

    // Badges / Medals
    this.medalsRowEl = document.getElementById('lc-medals-row');

    // Heatmap Elements
    this.heatmapTotalCountEl = document.getElementById('lc-heatmap-total-count');
    this.metaActiveDaysEl = document.getElementById('lc-meta-active-days');
    this.metaMaxStreakEl = document.getElementById('lc-meta-max-streak');
    this.metaCurrentStreakEl = document.getElementById('lc-meta-current-streak');
    this.fullHeatmapEl = document.getElementById('lc-full-heatmap');
    this.hoverTooltipEl = document.getElementById('lc-hover-tooltip');
    this.rangeSelect = document.getElementById('lc-heatmap-range-select');

    // Skills & Submissions
    this.skillsListEl = document.getElementById('lc-subject-skills-list');
    this.submissionsTbody = document.getElementById('lc-submissions-tbody');

    this.init();
  }

  init() {
    this.render();
    if (this.rangeSelect) {
      this.rangeSelect.addEventListener('change', () => this.renderHeatmap());
    }
    storage.subscribe(() => this.render());
  }

  render() {
    const state = storage.getState();
    const history = state.studyHistory || [];

    this.renderProfileHeader(state, history);
    this.renderDonutSection(history);
    this.renderBadgesMedals(state);
    this.renderHeatmap();
    this.renderSkillsBreakdown(history);
    this.renderRecentSubmissions(state);
  }

  // 1. Profile Header
  renderProfileHeader(state, history) {
    const totalMins = history.reduce((sum, h) => sum + (h.minutes || 0), 0);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const timeStr = `${hrs}h ${mins}m`;

    if (this.usernameEl) this.usernameEl.textContent = state.user.levelTitle || 'Focused Scholar';
    if (this.avatarLvlEl) this.avatarLvlEl.textContent = `L${state.user.level || 1}`;
    if (this.streakValEl) this.streakValEl.textContent = `${state.user.streak || 0} Days 🔥`;
    if (this.totalTimeStatEl) this.totalTimeStatEl.textContent = timeStr;

    // Unique active days
    const uniqueDates = new Set(history.map((h) => h.date));
    if (this.activeDaysStatEl) this.activeDaysStatEl.textContent = uniqueDates.size || 1;

    // Simulated dynamic contest rating based on XP + Study minutes
    const scoreRating = 1500 + (state.user.level * 120) + Math.min(600, totalMins);
    if (this.ratingValEl) this.ratingValEl.textContent = scoreRating.toLocaleString();
    const contestRatingEl = document.getElementById('lc-contest-rating');
    if (contestRatingEl) contestRatingEl.textContent = scoreRating.toLocaleString();
  }

  // 2. LeetCode Multi-Arc Donut & Difficulty Rows
  renderDonutSection(history) {
    const totalSessions = history.length || 1;
    let easyCount = 0;   // < 20 mins
    let mediumCount = 0; // 20 - 45 mins
    let hardCount = 0;   // > 45 mins

    let totalMins = 0;
    history.forEach((h) => {
      const m = h.minutes || 25;
      totalMins += m;
      if (m < 20) easyCount++;
      else if (m <= 45) mediumCount++;
      else hardCount++;
    });

    if (history.length === 0) {
      mediumCount = 1;
    }

    const actualCount = history.length;
    if (this.donutCountEl) this.donutCountEl.textContent = actualCount;
    if (this.totalSolvedSubtitle) this.totalSolvedSubtitle.textContent = `${actualCount} Total Sessions Logged`;
    if (this.donutSubTimeEl) {
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      this.donutSubTimeEl.textContent = `${hrs}h ${mins}m`;
    }

    // Fractions
    if (this.easyFractionEl) this.easyFractionEl.innerHTML = `${easyCount} <span class="dim">/ ${totalSessions}</span>`;
    if (this.mediumFractionEl) this.mediumFractionEl.innerHTML = `${mediumCount} <span class="dim">/ ${totalSessions}</span>`;
    if (this.hardFractionEl) this.hardFractionEl.innerHTML = `${hardCount} <span class="dim">/ ${totalSessions}</span>`;

    // Progress bar percentages
    const easyPct = Math.round((easyCount / totalSessions) * 100);
    const medPct = Math.round((mediumCount / totalSessions) * 100);
    const hardPct = Math.round((hardCount / totalSessions) * 100);

    if (this.easyBar) this.easyBar.style.width = `${Math.max(8, easyPct)}%`;
    if (this.mediumBar) this.mediumBar.style.width = `${Math.max(8, medPct)}%`;
    if (this.hardBar) this.hardBar.style.width = `${Math.max(8, hardPct)}%`;

    // Dynamic Beats
    if (this.easyBeatsEl) this.easyBeatsEl.textContent = `Beats ${(70 + Math.min(25, easyCount * 5)).toFixed(1)}% of students`;
    if (this.mediumBeatsEl) this.mediumBeatsEl.textContent = `Beats ${(80 + Math.min(18, mediumCount * 4)).toFixed(1)}% of students`;
    if (this.hardBeatsEl) this.hardBeatsEl.textContent = `Beats ${(88 + Math.min(11, hardCount * 3)).toFixed(1)}% of students`;

    // Circular multi-arc calculations (Circumference of r=62 is ~390)
    const C = 2 * Math.PI * 62; // ~389.55

    const easyLen = (easyCount / totalSessions) * C;
    const medLen = (mediumCount / totalSessions) * C;
    const hardLen = (hardCount / totalSessions) * C;

    if (this.arcEasy) {
      this.arcEasy.style.strokeDasharray = `${easyLen} ${C}`;
      this.arcEasy.style.strokeDashoffset = '0';
    }
    if (this.arcMedium) {
      this.arcMedium.style.strokeDasharray = `${medLen} ${C}`;
      this.arcMedium.style.strokeDashoffset = `${-easyLen}`;
    }
    if (this.arcHard) {
      this.arcHard.style.strokeDasharray = `${hardLen} ${C}`;
      this.arcHard.style.strokeDashoffset = `${-(easyLen + medLen)}`;
    }
  }

  // 3. Medals / Badges Showcase
  renderBadgesMedals(state) {
    if (!this.medalsRowEl) return;
    const badges = state.badges || [];

    this.medalsRowEl.innerHTML = badges
      .slice(0, 5)
      .map(
        (b) => `
        <div class="lc-medal-item" title="${this.escapeHtml(b.name)}: ${this.escapeHtml(b.desc)}">
          <span class="lc-medal-icon" style="${b.unlocked ? '' : 'filter: grayscale(1); opacity: 0.35;'}">${b.icon}</span>
          <span>${this.escapeHtml(b.name.split(' ')[0])}</span>
        </div>
      `
      )
      .join('');
  }

  // 4. LeetCode 52-Week Heatmap Calendar
  renderHeatmap() {
    if (!this.fullHeatmapEl) return;
    const state = storage.getState();
    const history = state.studyHistory || [];

    const range = this.rangeSelect ? this.rangeSelect.value : 'year';
    const weeksCount = range === '3months' ? 14 : range === '6months' ? 26 : 52;
    const totalDays = weeksCount * 7;

    // Map history minutes by date
    const dayMap = {};
    let totalMinutes = 0;
    history.forEach((h) => {
      dayMap[h.date] = (dayMap[h.date] || 0) + (h.minutes || 0);
      totalMinutes += h.minutes || 0;
    });

    if (this.heatmapTotalCountEl) {
      this.heatmapTotalCountEl.textContent = `${totalMinutes} Study Minutes in the Last Year`;
    }

    const uniqueActiveDates = Object.keys(dayMap).length;
    if (this.metaActiveDaysEl) this.metaActiveDaysEl.textContent = uniqueActiveDates || 1;
    if (this.metaMaxStreakEl) this.metaMaxStreakEl.textContent = `${Math.max(state.user.streak || 0, 7)} Days`;
    if (this.metaCurrentStreakEl) this.metaCurrentStreakEl.textContent = `${state.user.streak || 0} Days`;

    // Generate dates array
    const today = new Date();
    const dates = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d);
    }

    // Month headers
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let monthHeadersHtml = '';
    let lastMonth = -1;

    for (let w = 0; w < weeksCount; w++) {
      const dateForWeek = dates[w * 7];
      if (dateForWeek) {
        const m = dateForWeek.getMonth();
        if (m !== lastMonth) {
          monthHeadersHtml += `<span style="grid-column: ${w + 1};">${monthNames[m]}</span>`;
          lastMonth = m;
        }
      }
    }

    // Build grid cells
    const cellsHtml = dates
      .map((d) => {
        const dateStr = d.toISOString().split('T')[0];
        const mins = dayMap[dateStr] || 0;

        let lvl = 'level-0';
        if (mins >= 90) lvl = 'level-4';
        else if (mins >= 50) lvl = 'level-3';
        else if (mins >= 25) lvl = 'level-2';
        else if (mins > 0) lvl = 'level-1';

        const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const tooltipText = mins > 0 ? `${mins} mins studied on ${formattedDate}` : `No study activity on ${formattedDate}`;

        return `
          <div class="lc-cell ${lvl}" 
               data-date="${dateStr}" 
               data-mins="${mins}" 
               data-tooltip="${tooltipText}">
          </div>
        `;
      })
      .join('');

    this.fullHeatmapEl.innerHTML = `
      <div class="lc-heatmap-months-row" style="grid-template-columns: repeat(${weeksCount}, 1fr);">
        ${monthHeadersHtml}
      </div>
      <div class="lc-heatmap-grid-with-labels">
        <div class="lc-heatmap-day-labels">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>
        <div class="lc-heatmap-cells-grid" style="grid-template-columns: repeat(${weeksCount}, 1fr);">
          ${cellsHtml}
        </div>
      </div>
    `;

    // Attach hover listeners for interactive tooltip
    this.fullHeatmapEl.querySelectorAll('.lc-cell').forEach((cell) => {
      cell.addEventListener('mouseenter', () => {
        if (this.hoverTooltipEl) {
          this.hoverTooltipEl.textContent = cell.dataset.tooltip;
          this.hoverTooltipEl.style.color = cell.dataset.mins > 0 ? '#39d353' : 'var(--text-secondary)';
        }
      });
      cell.addEventListener('mouseleave', () => {
        if (this.hoverTooltipEl) {
          this.hoverTooltipEl.textContent = 'Hover over a square to view daily focus log';
          this.hoverTooltipEl.style.color = 'var(--text-muted)';
        }
      });
    });
  }

  // 5. Subject Skills & Mastery Breakdown
  renderSkillsBreakdown(history) {
    if (!this.skillsListEl) return;

    const subjects = [
      { name: 'Mathematics & Formulas', icon: '📐', subject: 'Mathematics' },
      { name: 'Coding & Algorithms', icon: '💻', subject: 'Coding' },
      { name: 'Science & Medical', icon: '🧬', subject: 'Science' },
      { name: 'Languages & Vocab', icon: '🗣️', subject: 'Languages' },
      { name: 'General & Notes', icon: '📚', subject: 'General' }
    ];

    const subjectMinutes = {};
    let totalMins = 0;
    history.forEach((h) => {
      const s = h.subject || 'General';
      subjectMinutes[s] = (subjectMinutes[s] || 0) + (h.minutes || 0);
      totalMins += h.minutes || 0;
    });

    this.skillsListEl.innerHTML = subjects
      .map((item) => {
        const mins = subjectMinutes[item.subject] || 0;
        const pct = totalMins > 0 ? Math.min(100, Math.round((mins / totalMins) * 100)) : 0;
        const hrs = (mins / 60).toFixed(1);

        return `
          <div class="lc-skill-item">
            <div class="lc-skill-top">
              <span class="lc-skill-name">${item.icon} ${item.name}</span>
              <span class="lc-skill-stats">${hrs} hrs (${pct}%)</span>
            </div>
            <div class="lc-skill-bar-bg">
              <div class="lc-skill-bar-fill" style="width: ${Math.max(4, pct)}%;"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // 6. Recent Submissions Table
  renderRecentSubmissions(state) {
    if (!this.submissionsTbody) return;
    const history = state.studyHistory || [];
    const reminders = state.reminders || [];

    // Synthesize submission entries
    const entries = [];

    // From study history
    history.slice(-5).reverse().forEach((h) => {
      entries.push({
        title: `Focus Interval - ${h.subject}`,
        subject: h.subject || 'General',
        status: 'Accepted',
        duration: `${h.minutes} mins`,
        date: h.date
      });
    });

    // From completed reminders
    reminders.filter((r) => r.completed).slice(0, 3).forEach((r) => {
      entries.push({
        title: r.title,
        subject: r.subject || 'General',
        status: 'Completed',
        duration: `${(r.estPomodoros || 1) * 25}m Task`,
        date: r.dueDate
      });
    });

    if (entries.length === 0) {
      this.submissionsTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            No recent submissions yet. Complete a focus session to log activity!
          </td>
        </tr>
      `;
      return;
    }

    this.submissionsTbody.innerHTML = entries
      .slice(0, 6)
      .map((item) => {
        return `
          <tr>
            <td style="font-weight: 600;">${this.escapeHtml(item.title)}</td>
            <td><span class="badge-tag">📚 ${this.escapeHtml(item.subject)}</span></td>
            <td><span class="status-accepted">✓ ${item.status}</span></td>
            <td class="mono-num" style="color: var(--text-muted);">${item.duration}</td>
            <td style="color: var(--text-muted); font-size: 0.76rem;">${item.date || 'Today'}</td>
          </tr>
        `;
      })
      .join('');
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
