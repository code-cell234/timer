/**
 * StudyPulse - Flashcards & Active Recall Module
 * Interactive 3D flip card study arena with Leitner confidence rating.
 */

import { storage } from './storage.js';

export class FlashcardsModule {
  constructor(appCoordinator) {
    this.app = appCoordinator;
    this.activeDeck = null;
    this.currentCardIndex = 0;
    this.isCardFlipped = false;

    // DOM Elements
    this.hubView = document.getElementById('flashcards-hub-view');
    this.arenaView = document.getElementById('flashcard-study-arena');
    this.decksGrid = document.getElementById('decks-grid');

    // Arena elements
    this.arenaTitle = document.getElementById('arena-deck-title');
    this.arenaProgress = document.getElementById('arena-progress-text');
    this.flipperEl = document.getElementById('active-flashcard');
    this.cardFront = document.getElementById('card-front-content');
    this.cardBack = document.getElementById('card-back-content');
    this.closeArenaBtn = document.getElementById('close-study-arena-btn');
    this.addCardBtn = document.getElementById('add-card-to-current-deck-btn');
    this.ratingControls = document.getElementById('arena-rating-controls');

    // Modals
    this.createDeckBtn = document.getElementById('create-deck-btn');
    this.deckDialog = document.getElementById('deck-dialog');
    this.deckForm = document.getElementById('deck-form');

    this.cardDialog = document.getElementById('card-dialog');
    this.cardForm = document.getElementById('card-form');

    this.init();
  }

  init() {
    this.bindEvents();
    this.renderDecks();
  }

  bindEvents() {
    // Open Deck Creator Modal
    if (this.createDeckBtn) {
      this.createDeckBtn.addEventListener('click', () => {
        this.deckForm.reset();
        document.getElementById('deck-edit-id').value = '';
        document.getElementById('deck-modal-title').textContent = 'Create Flashcard Deck';
        this.deckDialog.showModal();
      });
    }

    // Deck Form Submit
    this.deckForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('deck-title-input').value.trim();
      const subject = document.getElementById('deck-subject-input').value.trim() || 'General';
      const desc = document.getElementById('deck-desc-input').value.trim();
      const editId = document.getElementById('deck-edit-id').value;

      if (!title) return;

      const state = storage.getState();
      if (editId) {
        const deck = state.decks.find((d) => d.id === editId);
        if (deck) {
          deck.title = title;
          deck.subject = subject;
          deck.description = desc;
        }
      } else {
        state.decks.push({
          id: `deck-${Date.now()}`,
          title,
          subject,
          description: desc,
          cards: []
        });
        storage.addXP(10);
      }

      storage.save(state);
      this.deckDialog.close();
      this.renderDecks();
    });

    // Card Form Submit
    this.cardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const deckId = document.getElementById('card-deck-id').value;
      const front = document.getElementById('card-front-input').value.trim();
      const back = document.getElementById('card-back-input').value.trim();

      if (!front || !back || !deckId) return;

      const state = storage.getState();
      const deck = state.decks.find((d) => d.id === deckId);
      if (deck) {
        deck.cards.push({
          id: `c-${Date.now()}`,
          front,
          back,
          confidence: 'new'
        });
        storage.save(state);
        this.app.showToast('Card Added 🃏', 'New flashcard added to deck.', 'success');
      }

      this.cardDialog.close();
      if (this.activeDeck && this.activeDeck.id === deckId) {
        this.activeDeck = deck;
        this.renderActiveCard();
      } else {
        this.renderDecks();
      }
    });

    // Flip Card click
    this.flipperEl.addEventListener('click', () => {
      this.flipCard();
    });

    // Exit Arena
    this.closeArenaBtn.addEventListener('click', () => {
      this.exitArena();
    });

    // Add Card to open deck
    this.addCardBtn.addEventListener('click', () => {
      if (!this.activeDeck) return;
      this.cardForm.reset();
      document.getElementById('card-deck-id').value = this.activeDeck.id;
      this.cardDialog.showModal();
    });

    // Confidence Ratings
    this.ratingControls.querySelectorAll('.btn-rating').forEach((btn) => {
      btn.addEventListener('click', () => {
        const score = btn.dataset.score;
        this.rateCard(score);
      });
    });

    storage.subscribe(() => {
      if (!this.activeDeck) {
        this.renderDecks();
      }
    });
  }

  renderDecks() {
    if (!this.decksGrid) return;
    const state = storage.getState();

    if (!state.decks || state.decks.length === 0) {
      this.decksGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>No flashcard decks created yet.</p>
          <button class="btn btn-subtle btn-sm" id="empty-deck-btn">+ Create First Deck</button>
        </div>
      `;
      const btn = document.getElementById('empty-deck-btn');
      if (btn) btn.addEventListener('click', () => this.createDeckBtn.click());
      return;
    }

    this.decksGrid.innerHTML = state.decks
      .map((deck) => {
        const cardCount = deck.cards ? deck.cards.length : 0;
        const masteredCount = deck.cards ? deck.cards.filter((c) => c.confidence === 'easy' || c.confidence === 'good').length : 0;
        const pct = cardCount > 0 ? Math.round((masteredCount / cardCount) * 100) : 0;

        return `
          <div class="deck-card" data-deck-id="${deck.id}">
            <div class="deck-card-top">
              <div>
                <span class="deck-subject-tag">${this.escapeHtml(deck.subject)}</span>
                <div class="deck-title">${this.escapeHtml(deck.title)}</div>
                <p style="font-size: 0.78rem; color: var(--text-muted);">${this.escapeHtml(deck.description || 'No description')}</p>
              </div>
              <button class="text-btn-xs text-danger" data-delete-deck="${deck.id}" title="Delete Deck">✕</button>
            </div>
            <div class="deck-stats-footer">
              <span>🗂️ ${cardCount} Cards (${pct}% Mastered)</span>
              <span class="btn btn-primary btn-sm" style="pointer-events: none;">Study Deck →</span>
            </div>
          </div>
        `;
      })
      .join('');

    // Deck card click to open study arena
    this.decksGrid.querySelectorAll('.deck-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-delete-deck]')) return;
        const deckId = card.dataset.deckId;
        this.openStudyArena(deckId);
      });
    });

    // Delete deck
    this.decksGrid.querySelectorAll('[data-delete-deck]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteDeck;
        if (confirm('Delete this flashcard deck?')) {
          const state = storage.getState();
          state.decks = state.decks.filter((d) => d.id !== id);
          storage.save(state);
          this.renderDecks();
        }
      });
    });
  }

  openStudyArena(deckId) {
    const state = storage.getState();
    const deck = state.decks.find((d) => d.id === deckId);
    if (!deck) return;

    this.activeDeck = deck;
    this.currentCardIndex = 0;
    this.isCardFlipped = false;

    this.hubView.classList.add('hidden');
    this.arenaView.classList.remove('hidden');

    this.arenaTitle.textContent = deck.title;
    this.renderActiveCard();
  }

  exitArena() {
    this.activeDeck = null;
    this.arenaView.classList.add('hidden');
    this.hubView.classList.remove('hidden');
    this.renderDecks();
  }

  renderActiveCard() {
    if (!this.activeDeck) return;
    const cards = this.activeDeck.cards || [];

    if (cards.length === 0) {
      this.arenaProgress.textContent = '0 Cards';
      this.cardFront.textContent = 'This deck is currently empty. Click "+ Add Card" above to get started!';
      this.cardBack.textContent = 'Add cards with key questions on front and answers on back.';
      this.flipperEl.classList.remove('flipped');
      return;
    }

    if (this.currentCardIndex >= cards.length) {
      // Completed Deck!
      this.arenaProgress.textContent = 'Deck Finished 🎉';
      this.cardFront.textContent = '🎉 All Cards Reviewed in this session!';
      this.cardBack.textContent = 'Great active recall practice! Your brain retention is leveling up.';
      this.flipperEl.classList.remove('flipped');

      storage.addXP(40);
      this.app.showToast('Deck Completed! 🏆', '+40 XP for finishing active recall session!', 'success');
      return;
    }

    const card = cards[this.currentCardIndex];
    this.arenaProgress.textContent = `Card ${this.currentCardIndex + 1} of ${cards.length}`;
    this.cardFront.textContent = card.front;
    this.cardBack.textContent = card.back;

    this.isCardFlipped = false;
    this.flipperEl.classList.remove('flipped');
  }

  flipCard() {
    this.isCardFlipped = !this.isCardFlipped;
    this.flipperEl.classList.toggle('flipped', this.isCardFlipped);
  }

  rateCard(score) {
    if (!this.activeDeck || !this.activeDeck.cards || this.currentCardIndex >= this.activeDeck.cards.length) return;

    const state = storage.getState();
    const deck = state.decks.find((d) => d.id === this.activeDeck.id);
    if (deck && deck.cards[this.currentCardIndex]) {
      deck.cards[this.currentCardIndex].confidence = score;
      storage.save(state);
    }

    this.currentCardIndex += 1;
    this.renderActiveCard();
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
