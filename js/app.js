// ── App — Initialization & Navigation ────────────────────────────────────

const App = {
  switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === name);
    });
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.toggle('active', sec.id === 'tab-' + name);
    });

    // Re-render the active tab so data is always fresh on visit
    if (name === 'budget')    Budget.render();
    if (name === 'portfolio') Portfolio.render();
    if (name === 'advisor')   Advisor.renderChat();

    sessionStorage.setItem('activeTab', name);
    document.title = name.charAt(0).toUpperCase() + name.slice(1) + ' — Claude Blast';
  },

  init() {
    // Wire tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => App.switchTab(btn.dataset.tab));
    });

    // Initialize modules (binds form event listeners)
    Budget.init();
    Portfolio.init();
    Advisor.init();

    // Month reset check — show banner if a new month was detected
    const wasReset = Budget.checkMonthReset();
    if (wasReset) {
      document.getElementById('reset-banner').classList.remove('hidden');
    }

    document.getElementById('banner-close').addEventListener('click', () => {
      document.getElementById('reset-banner').classList.add('hidden');
    });

    // Restore last active tab from session
    const lastTab = sessionStorage.getItem('activeTab') || 'budget';
    App.switchTab(lastTab);

    // Show greeting only if chat is empty
    const { chatHistory } = Storage.getSection('advisor');
    if (chatHistory.length === 0) {
      Advisor.getGreeting();
    }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
