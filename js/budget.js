// ── Budget Module ─────────────────────────────────────────────────────────

const Budget = {
  CATEGORIES: ['Food', 'Transport', 'Housing', 'Entertainment', 'Savings', 'Healthcare', 'Other'],

  CATEGORY_COLORS: {
    Food:          '#7c3aed',
    Transport:     '#06b6d4',
    Housing:       '#f59e0b',
    Entertainment: '#ec4899',
    Savings:       '#22c55e',
    Healthcare:    '#10b981',
    Other:         '#8b5cf6',
  },

  // ── Data operations ────────────────────────────────────────────────────

  addTransaction(type, amount, category, description) {
    const { transactions, monthlyTarget } = Storage.getSection('budget');
    transactions.push({
      id: Date.now(),
      type,
      amount: parseFloat(amount),
      category,
      description: description.trim() || category,
      date: new Date().toISOString(),
    });
    Storage.setSection('budget', { transactions, monthlyTarget });
  },

  deleteTransaction(id) {
    const budget = Storage.getSection('budget');
    budget.transactions = budget.transactions.filter(t => t.id !== id);
    Storage.setSection('budget', budget);
  },

  setMonthlyTarget(amount) {
    Storage.setSection('budget', { monthlyTarget: parseFloat(amount) });
  },

  // ── Summary calculation ────────────────────────────────────────────────

  getMonthSummary() {
    const { transactions, monthlyTarget } = Storage.getSection('budget');
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const thisMonth = transactions.filter(t => t.date.startsWith(currentMonth));

    const totalIncome   = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const remaining     = totalIncome - totalExpenses;
    const savingsRate   = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;

    const categoryTotals = {};
    thisMonth.filter(t => t.type === 'expense').forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    return { totalIncome, totalExpenses, remaining, monthlyTarget, savingsRate, categoryTotals, transactions: thisMonth };
  },

  // ── Month reset ────────────────────────────────────────────────────────

  checkMonthReset() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { lastResetMonth } = Storage.getSection('meta');

    if (lastResetMonth && lastResetMonth !== currentMonth) {
      Storage.clearBudgetMonth();
      Storage.setSection('meta', { lastResetMonth: currentMonth });
      return true; // signal that a reset occurred
    }

    if (!lastResetMonth) {
      Storage.setSection('meta', { lastResetMonth: currentMonth });
    }

    return false;
  },

  // ── Render ─────────────────────────────────────────────────────────────

  renderSummaryCards() {
    const { totalIncome, totalExpenses, remaining, monthlyTarget } = this.getMonthSummary();
    const fmt = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    document.getElementById('budget-income').textContent   = fmt(totalIncome);
    document.getElementById('budget-expenses').textContent = fmt(totalExpenses);

    const remEl = document.getElementById('budget-remaining');
    remEl.textContent = fmt(remaining);
    remEl.className = 'summary-value ' + (remaining >= 0 ? 'green' : 'red');

    const targetEl = document.getElementById('budget-target-display');
    targetEl.textContent = monthlyTarget > 0 ? fmt(monthlyTarget) : 'Not set';
  },

  renderSpendBar() {
    const { totalExpenses, monthlyTarget } = this.getMonthSummary();
    const fill = document.getElementById('spend-bar-fill');
    const left = document.getElementById('spend-bar-left');
    const right = document.getElementById('spend-bar-right');
    const fmt = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    if (monthlyTarget > 0) {
      const pct = Math.min((totalExpenses / monthlyTarget) * 100, 100);
      fill.style.width = pct + '%';
      fill.classList.toggle('over', totalExpenses > monthlyTarget);
      left.textContent  = fmt(totalExpenses) + ' spent';
      right.textContent = fmt(monthlyTarget) + ' target';
    } else {
      fill.style.width = '0%';
      left.textContent  = fmt(totalExpenses) + ' spent';
      right.textContent = 'No target set';
    }
  },

  renderCategoryBars() {
    const { categoryTotals, totalExpenses } = this.getMonthSummary();
    const container = document.getElementById('category-bars');

    const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      container.innerHTML = '<p class="category-empty">No expense transactions yet.</p>';
      return;
    }

    container.innerHTML = entries.map(([cat, amount]) => {
      const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
      const color = this.CATEGORY_COLORS[cat] || '#7c3aed';
      const fmtAmt = amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
      return `
        <div class="category-row">
          <span class="category-label">${cat}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
          </div>
          <span class="category-amount">${fmtAmt}</span>
        </div>`;
    }).join('');
  },

  renderTransactionList() {
    const { transactions } = this.getMonthSummary();
    const list = document.getElementById('transaction-list');

    // Update month label
    const now = new Date();
    document.getElementById('month-label').textContent =
      '— ' + now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    if (transactions.length === 0) {
      list.innerHTML = '<li class="empty-state">No transactions yet — add one above.</li>';
      return;
    }

    // Show newest first
    const sorted = [...transactions].sort((a, b) => b.id - a.id);
    const fmt = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    list.innerHTML = sorted.map(t => {
      const date = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `
        <li class="transaction-item">
          <span class="tx-badge ${t.type}">${t.type === 'income' ? 'IN' : 'OUT'}</span>
          <span class="tx-cat">${t.category}</span>
          <span class="tx-desc">${escapeHtml(t.description)}</span>
          <span class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</span>
          <span class="tx-date">${date}</span>
          <button class="btn-danger" data-delete="${t.id}">✕</button>
        </li>`;
    }).join('');

    // Bind delete buttons
    list.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        Budget.deleteTransaction(Number(btn.dataset.delete));
        Budget.render();
      });
    });
  },

  render() {
    this.renderSummaryCards();
    this.renderSpendBar();
    this.renderCategoryBars();
    this.renderTransactionList();
  },

  // ── Event handlers ─────────────────────────────────────────────────────

  init() {
    document.getElementById('transaction-form').addEventListener('submit', e => {
      e.preventDefault();
      const type   = document.querySelector('input[name="tx-type"]:checked').value;
      const amount = document.getElementById('tx-amount').value;
      const cat    = document.getElementById('tx-category').value;
      const desc   = document.getElementById('tx-desc').value;

      if (!amount || parseFloat(amount) <= 0) {
        showToast('Enter a valid amount.', 'error');
        return;
      }

      Budget.addTransaction(type, amount, cat, desc);
      e.target.reset();
      document.querySelector('input[name="tx-type"][value="income"]').checked = true;
      Budget.render();
      showToast('Transaction added!', 'success');
    });

    document.getElementById('target-form').addEventListener('submit', e => {
      e.preventDefault();
      const amount = document.getElementById('target-amount').value;
      if (!amount || parseFloat(amount) <= 0) {
        showToast('Enter a valid target amount.', 'error');
        return;
      }
      Budget.setMonthlyTarget(amount);
      e.target.reset();
      Budget.render();
      showToast('Monthly target updated!', 'success');
    });

    document.getElementById('clear-transactions-btn').addEventListener('click', () => {
      if (!confirm('Clear all transactions for this month?')) return;
      Storage.clearBudgetMonth();
      Budget.render();
      showToast('Transactions cleared.', 'success');
    });
  },
};
