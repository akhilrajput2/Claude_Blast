// ── Advisor Module ────────────────────────────────────────────────────────

const Advisor = {

  // ── Rule Engine ────────────────────────────────────────────────────────

  RULES: [
    // ── Critical (90-100) ──
    {
      id: 'overspending', priority: 100,
      condition: d => d.budget.hasTransactions && d.budget.totalExpenses > d.budget.totalIncome && d.budget.totalIncome > 0,
      message: d => {
        const fmt = n => fmtCurrency(n);
        const over = d.budget.totalExpenses - d.budget.totalIncome;
        return `⚠️ You are spending more than you earn this month. Expenses (${fmt(d.budget.totalExpenses)}) exceed income (${fmt(d.budget.totalIncome)}) by ${fmt(over)}. Review non-essential categories immediately.`;
      },
    },
    {
      id: 'no_income', priority: 95,
      condition: d => d.budget.hasTransactions && d.budget.totalIncome === 0,
      message: () => `📋 You have logged expenses but no income this month. Don't forget to record your income so your budget picture is accurate.`,
    },
    {
      id: 'target_exceeded', priority: 90,
      condition: d => d.budget.monthlyTarget > 0 && d.budget.totalExpenses > d.budget.monthlyTarget,
      message: d => {
        const over = d.budget.totalExpenses - d.budget.monthlyTarget;
        return `🚨 You have exceeded your monthly spending target of ${fmtCurrency(d.budget.monthlyTarget)}. Current expenses are ${fmtCurrency(d.budget.totalExpenses)} — ${fmtCurrency(over)} over budget.`;
      },
    },

    // ── Warnings (70-89) ──
    {
      id: 'low_savings_rate', priority: 80,
      condition: d => d.budget.hasTransactions && d.budget.totalIncome > 0 && d.budget.savingsRate < 0.10,
      message: d => {
        const rate = (d.budget.savingsRate * 100).toFixed(1);
        return `📉 Your savings rate is ${rate}%. Best practice recommends saving at least 20% of income. You are currently saving ${fmtCurrency(d.budget.totalIncome - d.budget.totalExpenses)} per month.`;
      },
    },
    {
      id: 'target_approaching', priority: 75,
      condition: d => d.budget.monthlyTarget > 0 && (d.budget.totalExpenses / d.budget.monthlyTarget) > 0.85 && d.budget.totalExpenses <= d.budget.monthlyTarget,
      message: d => {
        const pct = ((d.budget.totalExpenses / d.budget.monthlyTarget) * 100).toFixed(0);
        const left = d.budget.monthlyTarget - d.budget.totalExpenses;
        return `📊 You have used ${pct}% of your monthly budget. With ${fmtCurrency(left)} remaining, watch discretionary spending for the rest of the month.`;
      },
    },
    {
      id: 'high_food_spend', priority: 70,
      condition: d => d.budget.totalIncome > 0 && (d.budget.categoryTotals['Food'] || 0) > d.budget.totalIncome * 0.30,
      message: d => {
        const pct = (((d.budget.categoryTotals['Food'] || 0) / d.budget.totalIncome) * 100).toFixed(1);
        return `🍔 Food spending is ${pct}% of your income (${fmtCurrency(d.budget.categoryTotals['Food'] || 0)} this month). A typical target is 10–15% of income. Consider meal planning.`;
      },
    },
    {
      id: 'high_entertainment', priority: 68,
      condition: d => d.budget.totalIncome > 0 && (d.budget.categoryTotals['Entertainment'] || 0) > d.budget.totalIncome * 0.15,
      message: d => {
        const pct = (((d.budget.categoryTotals['Entertainment'] || 0) / d.budget.totalIncome) * 100).toFixed(1);
        return `🎬 Entertainment is consuming ${pct}% of your income (${fmtCurrency(d.budget.categoryTotals['Entertainment'] || 0)}). Consider whether subscriptions or dining out can be trimmed.`;
      },
    },
    {
      id: 'no_savings_category', priority: 70,
      condition: d => d.budget.hasTransactions && !d.budget.categoryTotals['Savings'] && d.budget.totalIncome > 0,
      message: () => `💰 You have not logged any Savings transactions this month. Even a small automatic transfer each payday builds long-term stability. Try paying yourself first.`,
    },
    {
      id: 'portfolio_loss', priority: 65,
      condition: d => d.portfolio.hasHoldings && d.portfolio.totalGainPct < -0.10,
      message: d => {
        const pct = (d.portfolio.totalGainPct * 100).toFixed(1);
        return `📉 Your portfolio is down ${Math.abs(pct)}% (total loss of ${fmtCurrency(Math.abs(d.portfolio.totalGain))}). Market downturns are normal — avoid panic selling unless your risk tolerance has changed.`;
      },
    },
    {
      id: 'single_stock_risk', priority: 60,
      condition: d => d.portfolio.hasHoldings && d.portfolio.sectorConcentration > 0.50,
      message: d => {
        const pct = (d.portfolio.sectorConcentration * 100).toFixed(1);
        return `⚡ One holding makes up ${pct}% of your portfolio. High concentration in a single asset increases risk. Consider diversifying across more positions or asset classes.`;
      },
    },

    // ── Suggestions (40-69) ──
    {
      id: 'no_emergency_fund', priority: 55,
      condition: d => d.budget.hasTransactions && !d.budget.categoryTotals['Savings'] && d.budget.totalExpenses > 0,
      message: d => {
        const monthly = d.budget.totalExpenses;
        return `🛡️ No emergency fund contributions visible this month. A standard recommendation is 3–6 months of expenses set aside — that's ${fmtCurrency(monthly * 3)} to ${fmtCurrency(monthly * 6)} for you.`;
      },
    },
    {
      id: 'undiversified', priority: 50,
      condition: d => d.portfolio.hasHoldings && d.portfolio.holdingCount < 4,
      message: d => `🧩 Your portfolio has only ${d.portfolio.holdingCount} holding${d.portfolio.holdingCount === 1 ? '' : 's'}. Broader diversification across sectors or asset classes reduces concentration risk. Consider adding more positions.`,
    },
    {
      id: 'too_many_holdings', priority: 45,
      condition: d => d.portfolio.hasHoldings && d.portfolio.holdingCount > 20,
      message: d => `📋 You have ${d.portfolio.holdingCount} holdings, which can make portfolio management unwieldy. Consider whether all positions have a clear purpose in your strategy.`,
    },
    {
      id: 'housing_heavy', priority: 40,
      condition: d => d.budget.totalIncome > 0 && (d.budget.categoryTotals['Housing'] || 0) > d.budget.totalIncome * 0.35,
      message: d => {
        const pct = (((d.budget.categoryTotals['Housing'] || 0) / d.budget.totalIncome) * 100).toFixed(1);
        return `🏠 Housing is consuming ${pct}% of your income. The common guideline is to keep housing under 30% of gross income. If possible, explore ways to reduce this.`;
      },
    },
    {
      id: 'invest_surplus', priority: 35,
      condition: d => d.budget.hasTransactions && d.budget.savingsRate >= 0.20 && !d.portfolio.hasHoldings,
      message: d => `🌱 You are saving ${(d.budget.savingsRate * 100).toFixed(0)}% of income — great discipline! Consider investing the surplus. Even a simple index fund can grow your savings significantly over time.`,
    },

    // ── Positive Reinforcement (25-34) ──
    {
      id: 'consistent_saver', priority: 34,
      condition: d => d.budget.hasTransactions && d.budget.totalIncome > 0 && d.budget.savingsRate >= 0.20,
      message: d => {
        const rate = (d.budget.savingsRate * 100).toFixed(0);
        return `✅ Great work — you are saving ${rate}% of your income this month (${fmtCurrency(d.budget.totalIncome - d.budget.totalExpenses)}). Keep it up and consider investing the surplus if you haven't already.`;
      },
    },
    {
      id: 'portfolio_gain', priority: 30,
      condition: d => d.portfolio.hasHoldings && d.portfolio.totalGainPct > 0.15,
      message: d => {
        const pct = (d.portfolio.totalGainPct * 100).toFixed(1);
        return `🚀 Your portfolio is up ${pct}% — a gain of ${fmtCurrency(d.portfolio.totalGain)}. Consider rebalancing if any position has grown to exceed your target allocation.`;
      },
    },
    {
      id: 'under_budget', priority: 28,
      condition: d => d.budget.monthlyTarget > 0 && d.budget.totalExpenses > 0 && d.budget.totalExpenses < d.budget.monthlyTarget * 0.85,
      message: d => {
        const left = d.budget.monthlyTarget - d.budget.totalExpenses;
        return `👍 You are ${fmtCurrency(left)} under your monthly budget target. Consider directing the surplus to savings or investments.`;
      },
    },
    {
      id: 'good_savings_rate', priority: 27,
      condition: d => d.budget.hasTransactions && d.budget.totalIncome > 0 && d.budget.savingsRate >= 0.15 && d.budget.savingsRate < 0.20,
      message: d => {
        const rate = (d.budget.savingsRate * 100).toFixed(0);
        return `📈 You are saving ${rate}% of income — solid progress. Pushing to 20% would put you on track for most retirement planning goals.`;
      },
    },

    // ── Onboarding / Empty State (10-24) ──
    {
      id: 'set_monthly_target', priority: 22,
      condition: d => d.budget.hasTransactions && d.budget.monthlyTarget === 0,
      message: () => `🎯 You haven't set a monthly spending target yet. Head to the Budget tab and set one — it helps you see at a glance whether you're on track.`,
    },
    {
      id: 'no_budget_data', priority: 15,
      condition: d => !d.budget.hasTransactions && d.portfolio.hasHoldings,
      message: () => `📊 Your portfolio is set up. Head to the Budget tab and log this month's transactions so I can give you a complete financial picture.`,
    },
    {
      id: 'no_portfolio_data', priority: 12,
      condition: d => d.budget.hasTransactions && !d.portfolio.hasHoldings,
      message: () => `💼 Budget data looks good. If you have any investments, add them in the Portfolio tab and I can check your allocation and diversification.`,
    },
    {
      id: 'no_data', priority: 10,
      condition: d => !d.budget.hasTransactions && !d.portfolio.hasHoldings,
      message: () => `👋 Welcome! Start by adding your first income or expense in the Budget tab, or add a holding in Portfolio. I'll give you personalized advice once I can see your numbers.`,
    },
  ],

  // ── Analysis ───────────────────────────────────────────────────────────

  buildDataContext() {
    const budgetSummary = Budget.getMonthSummary();
    const portfolioStats = Portfolio.calcPortfolioStats();

    return {
      budget: {
        ...budgetSummary,
        hasTransactions: budgetSummary.transactions.length > 0,
      },
      portfolio: portfolioStats,
    };
  },

  analyze() {
    const data = this.buildDataContext();
    return this.RULES
      .filter(r => r.condition(data))
      .sort((a, b) => b.priority - a.priority);
  },

  // ── Keyword-based response routing ────────────────────────────────────

  generateResponse(userMessage) {
    const msg  = userMessage.toLowerCase();
    const data = this.buildDataContext();
    const fmt  = fmtCurrency;

    if (/\b(save|saving|savings)\b/.test(msg)) {
      const rate = (data.budget.savingsRate * 100).toFixed(1);
      const surplus = data.budget.totalIncome - data.budget.totalExpenses;
      if (!data.budget.hasTransactions) {
        return `To get savings advice, add your income and expense transactions in the Budget tab first. Once I can see your numbers, I'll give you specific targets.`;
      }
      return `💰 Your current savings rate is ${rate}% (${fmt(Math.max(surplus, 0))} this month). The 50/30/20 rule suggests 50% needs, 30% wants, 20% savings. ${surplus < data.budget.totalIncome * 0.20 ? `To hit 20%, you'd need to save an extra ${fmt(data.budget.totalIncome * 0.20 - surplus)} this month.` : `You're already on track — consider investing your surplus.`}`;
    }

    if (/\b(invest|investing|investment|stock|stocks|portfolio|market)\b/.test(msg)) {
      if (!data.portfolio.hasHoldings) {
        return `📈 You don't have any holdings tracked yet. Add them in the Portfolio tab and I can analyze your allocation, diversification, and overall return.`;
      }
      const { totalValue, totalGainPct, holdingCount, sectorConcentration } = data.portfolio;
      const pct = (totalGainPct * 100).toFixed(1);
      return `📊 Your portfolio is worth ${fmt(totalValue)} with a ${pct >= 0 ? '+' : ''}${pct}% overall return across ${holdingCount} holding${holdingCount === 1 ? '' : 's'}. ${sectorConcentration > 0.50 ? `Your largest position is ${(sectorConcentration * 100).toFixed(0)}% of the portfolio — consider diversifying.` : `Diversification looks reasonable.`}`;
    }

    if (/\b(budget|spend|spending|expense|expenses|money)\b/.test(msg)) {
      if (!data.budget.hasTransactions) {
        return `Add your transactions in the Budget tab and I'll give you a detailed spending breakdown.`;
      }
      const { totalIncome, totalExpenses, monthlyTarget } = data.budget;
      const lines = [`📋 This month: income ${fmt(totalIncome)}, expenses ${fmt(totalExpenses)}.`];
      if (monthlyTarget > 0) {
        const pct = ((totalExpenses / monthlyTarget) * 100).toFixed(0);
        lines.push(`You've used ${pct}% of your ${fmt(monthlyTarget)} target.`);
      }
      const top = Object.entries(data.budget.categoryTotals).sort((a,b) => b[1]-a[1]).slice(0, 2);
      if (top.length) lines.push(`Top spending categories: ${top.map(([c,v]) => `${c} (${fmt(v)})`).join(', ')}.`);
      return lines.join(' ');
    }

    if (/\b(emergency|emergency fund)\b/.test(msg)) {
      const monthly = data.budget.totalExpenses || 0;
      if (monthly === 0) {
        return `🛡️ Add your monthly expenses in the Budget tab and I can calculate a specific emergency fund target for you.`;
      }
      return `🛡️ Based on your current monthly expenses (${fmt(monthly)}), you should aim for an emergency fund of ${fmt(monthly * 3)} to ${fmt(monthly * 6)} — covering 3 to 6 months of living costs. Keep this in a high-yield savings account for easy access.`;
    }

    if (/\b(retire|retirement|retire early|fire)\b/.test(msg)) {
      if (!data.budget.hasTransactions) {
        return `Retirement planning starts with knowing your income and expenses. Log your transactions first and I'll give you a clearer picture.`;
      }
      const { totalIncome, savingsRate } = data.budget;
      const { totalValue } = data.portfolio;
      const annualSavings = (totalIncome * savingsRate) * 12;
      return `🏖️ With a savings rate of ${(savingsRate * 100).toFixed(0)}% (${fmt(annualSavings)}/yr) and a current portfolio of ${fmt(totalValue)}, general guidance using the 4% rule suggests you'd need roughly 25× your annual expenses saved. ${annualSavings > 0 ? `At this rate, focus on maximizing tax-advantaged accounts (401k, IRA) first.` : `Start by building consistent savings each month.`}`;
    }

    if (/\b(debt|loan|loans|credit|mortgage)\b/.test(msg)) {
      const { savingsRate, totalIncome } = data.budget;
      return `💳 For managing debt, the high-interest-first method (avalanche) saves the most money: list all debts by interest rate, pay minimums on all, then direct extra funds to the highest-rate balance. ${savingsRate < 0.10 ? `Your current savings rate (${(savingsRate*100).toFixed(0)}%) suggests tight cash flow — even small extra payments make a difference over time.` : `Your savings rate gives you some room to accelerate debt payoff.`}`;
    }

    if (/\b(help|what can you|how do|what should)\b/.test(msg)) {
      return `🤖 I can help you with:\n• Spending analysis — "Am I spending too much?"\n• Savings advice — "How do I save more?"\n• Portfolio review — "How are my investments?"\n• Emergency fund — "Do I have enough saved?"\n• Retirement planning — "Am I on track to retire?"\n• Debt strategy — "How should I handle my debt?"\n\nOr just ask me anything about your finances!`;
    }

    // Fallback — return top triggered rules
    const triggered = this.analyze();
    if (triggered.length === 0) {
      return `I don't have enough data yet to give specific advice. Add transactions in the Budget tab or holdings in the Portfolio tab and I'll get to work!`;
    }
    return triggered.slice(0, 2).map(r => r.message(this.buildDataContext())).join('\n\n');
  },

  // ── Chat ───────────────────────────────────────────────────────────────

  addMessage(role, text) {
    const { chatHistory } = Storage.getSection('advisor');
    chatHistory.push({ role, text, timestamp: new Date().toISOString() });
    Storage.setSection('advisor', { chatHistory });
    this.renderChat();
  },

  renderChat() {
    const { chatHistory } = Storage.getSection('advisor');
    const container = document.getElementById('chat-messages');

    if (chatHistory.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = chatHistory.map(m => `
      <div class="chat-bubble ${m.role}">
        ${escapeHtml(m.text).replace(/\n/g, '<br>')}
      </div>`).join('');

    container.scrollTop = container.scrollHeight;
  },

  getGreeting() {
    const triggered = this.analyze();
    const data = this.buildDataContext();

    let greeting;
    if (!data.budget.hasTransactions && !data.portfolio.hasHoldings) {
      greeting = `👋 Hi! I'm your financial advisor. I'll analyze your budget and portfolio to give you personalized advice.\n\nStart by adding income or expense transactions in the Budget tab, or add investment holdings in Portfolio. Then come back and ask me anything!`;
    } else {
      const topRule = triggered[0];
      const intro = `👋 Welcome back! Here's what I'm seeing right now:\n\n`;
      greeting = intro + (topRule ? topRule.message(data) : `Your finances are looking stable. Keep logging transactions and I'll keep an eye on trends.`);
    }

    this.addMessage('advisor', greeting);
  },

  handleUserSend() {
    const input = document.getElementById('chat-input');
    const text  = input.value.trim();
    if (!text) return;

    this.addMessage('user', text);
    input.value = '';

    // Small delay for a more natural feel
    setTimeout(() => {
      const response = this.generateResponse(text);
      this.addMessage('advisor', response);
    }, 320);
  },

  // ── Event handlers ─────────────────────────────────────────────────────

  init() {
    document.getElementById('chat-send-btn').addEventListener('click', () => {
      Advisor.handleUserSend();
    });

    document.getElementById('chat-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        Advisor.handleUserSend();
      }
    });
  },
};

// ── Shared helpers (available globally) ──────────────────────────────────

function fmtCurrency(n) {
  return Math.abs(n) >= 1 ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className   = 'toast ' + type;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast hidden'; }, 2500);
}
