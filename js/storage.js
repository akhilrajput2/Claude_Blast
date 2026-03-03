// ── Storage ───────────────────────────────────────────────────────────────
// Single source of truth for all app data via localStorage.

const STORAGE_KEY = 'finapp_v1';

const DEFAULT_STATE = {
  meta:      { lastResetMonth: null },
  budget:    { monthlyTarget: 0, transactions: [] },
  portfolio: { holdings: [] },
  advisor:   { chatHistory: [] },
};

const Storage = {
  get() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle missing keys after schema additions
      return {
        meta:      { ...DEFAULT_STATE.meta,      ...parsed.meta },
        budget:    { ...DEFAULT_STATE.budget,    ...parsed.budget },
        portfolio: { ...DEFAULT_STATE.portfolio, ...parsed.portfolio },
        advisor:   { ...DEFAULT_STATE.advisor,   ...parsed.advisor },
      };
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  },

  set(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  getSection(key) {
    return this.get()[key];
  },

  setSection(key, data) {
    const state = this.get();
    state[key] = { ...state[key], ...data };

    // Cap chat history at 100 entries
    if (key === 'advisor' && state.advisor.chatHistory.length > 100) {
      state.advisor.chatHistory = state.advisor.chatHistory.slice(-100);
    }

    this.set(state);
  },

  clearBudgetMonth() {
    const state = this.get();
    state.budget.transactions = [];
    this.set(state);
  },
};
