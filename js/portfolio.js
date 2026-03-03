// ── Portfolio Module ──────────────────────────────────────────────────────

const Portfolio = {
  COLORS: ['#7c3aed','#ec4899','#06b6d4','#22c55e','#f59e0b','#ef4444','#8b5cf6','#10b981','#f97316','#3b82f6'],

  // ── Data operations ────────────────────────────────────────────────────

  addHolding(ticker, shares, purchasePrice, currentPrice) {
    const { holdings } = Storage.getSection('portfolio');
    holdings.push({
      id:            Date.now(),
      ticker:        ticker.toUpperCase().trim(),
      shares:        parseFloat(shares),
      purchasePrice: parseFloat(purchasePrice),
      currentPrice:  parseFloat(currentPrice),
      addedDate:     new Date().toISOString().slice(0, 10),
    });
    Storage.setSection('portfolio', { holdings });
  },

  updatePrice(id, newPrice) {
    const { holdings } = Storage.getSection('portfolio');
    const h = holdings.find(h => h.id === id);
    if (h) h.currentPrice = parseFloat(newPrice);
    Storage.setSection('portfolio', { holdings });
  },

  deleteHolding(id) {
    const { holdings } = Storage.getSection('portfolio');
    Storage.setSection('portfolio', { holdings: holdings.filter(h => h.id !== id) });
  },

  // ── Stats ──────────────────────────────────────────────────────────────

  calcPortfolioStats() {
    const { holdings } = Storage.getSection('portfolio');

    const totalCost  = holdings.reduce((s, h) => s + h.purchasePrice * h.shares, 0);
    const totalValue = holdings.reduce((s, h) => s + h.currentPrice  * h.shares, 0);
    const totalGain  = totalValue - totalCost;
    const totalGainPct = totalCost > 0 ? (totalGain / totalCost) : 0;

    const enriched = holdings.map(h => {
      const value      = h.currentPrice * h.shares;
      const cost       = h.purchasePrice * h.shares;
      const gainAmount = value - cost;
      const gainPct    = cost > 0 ? (gainAmount / cost) : 0;
      const allocation = totalValue > 0 ? (value / totalValue) : 0;
      return { ...h, value, cost, gainAmount, gainPct, allocation };
    });

    const maxAlloc = enriched.length > 0 ? Math.max(...enriched.map(h => h.allocation)) : 0;

    return { totalCost, totalValue, totalGain, totalGainPct, holdings: enriched,
             holdingCount: holdings.length, hasHoldings: holdings.length > 0,
             sectorConcentration: maxAlloc };
  },

  // ── Render ─────────────────────────────────────────────────────────────

  renderSummaryCards() {
    const { totalValue, totalGain, totalGainPct, holdingCount } = this.calcPortfolioStats();
    const fmt   = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const fmtPct = n => (n >= 0 ? '+' : '') + (n * 100).toFixed(2) + '%';

    document.getElementById('port-total-value').textContent  = fmt(totalValue);

    const gainEl = document.getElementById('port-total-gain');
    gainEl.textContent = (totalGain >= 0 ? '+' : '') + fmt(totalGain);
    gainEl.className = 'summary-value ' + (totalGain >= 0 ? 'green' : 'red');

    const pctEl = document.getElementById('port-gain-pct');
    pctEl.textContent = fmtPct(totalGainPct);
    pctEl.className = 'summary-value ' + (totalGainPct >= 0 ? 'green' : 'red');

    document.getElementById('port-holdings-count').textContent = holdingCount;
  },

  renderHoldingsTable() {
    const { holdings } = this.calcPortfolioStats();
    const tbody = document.getElementById('holdings-tbody');
    const fmt   = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const fmtPct = n => (n >= 0 ? '+' : '') + (n * 100).toFixed(2) + '%';

    if (holdings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No holdings yet.</td></tr>';
      return;
    }

    tbody.innerHTML = holdings.map(h => {
      const gainClass = h.gainAmount > 0 ? 'gain-positive' : h.gainAmount < 0 ? 'gain-negative' : 'gain-neutral';
      return `
        <tr data-id="${h.id}">
          <td class="ticker-cell">${escapeHtml(h.ticker)}</td>
          <td>${h.shares.toLocaleString()}</td>
          <td>${fmt(h.purchasePrice)}</td>
          <td class="price-cell">
            <input class="price-input" type="number" value="${h.currentPrice}" min="0.01" step="0.01" data-price-id="${h.id}" />
            <button class="btn-ghost btn-small" data-update="${h.id}">↻</button>
          </td>
          <td>${fmt(h.value)}</td>
          <td class="${gainClass}">${(h.gainAmount >= 0 ? '+' : '') + fmt(h.gainAmount)} (${fmtPct(h.gainPct)})</td>
          <td>${(h.allocation * 100).toFixed(1)}%</td>
          <td><button class="btn-danger" data-delete="${h.id}">✕</button></td>
        </tr>`;
    }).join('');

    // Bind delete
    tbody.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        Portfolio.deleteHolding(Number(btn.dataset.delete));
        Portfolio.render();
        showToast('Holding removed.', 'success');
      });
    });

    // Bind price update
    tbody.querySelectorAll('[data-update]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id    = Number(btn.dataset.update);
        const input = tbody.querySelector(`[data-price-id="${id}"]`);
        const val   = parseFloat(input.value);
        if (!val || val <= 0) { showToast('Enter a valid price.', 'error'); return; }
        Portfolio.updatePrice(id, val);
        Portfolio.render();
        showToast('Price updated!', 'success');
      });
    });
  },

  renderPieChart() {
    const { holdings, totalValue, hasHoldings } = this.calcPortfolioStats();
    const canvas  = document.getElementById('portfolio-chart');
    const emptyEl = document.getElementById('chart-empty');
    const legendEl = document.getElementById('chart-legend');
    const ctx     = canvas.getContext('2d');

    if (!hasHoldings) {
      canvas.style.display  = 'none';
      legendEl.style.display = 'none';
      emptyEl.style.display  = '';
      return;
    }

    canvas.style.display  = '';
    legendEl.style.display = '';
    emptyEl.style.display  = 'none';

    // DPR scaling for crisp rendering on retina displays
    const dpr     = window.devicePixelRatio || 1;
    const size    = 220;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx     = size / 2;
    const cy     = size / 2;
    const radius = size / 2 - 10;

    ctx.clearRect(0, 0, size, size);

    let startAngle = -Math.PI / 2; // 12 o'clock

    holdings.forEach((h, i) => {
      const slice = h.allocation * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = this.COLORS[i % this.COLORS.length];
      ctx.fill();
      startAngle += slice;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a2e'; // matches card background
    ctx.fill();

    // Center label — total value
    const fmtShort = n => {
      if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
      if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K';
      return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    };

    ctx.fillStyle = '#e0e0f0';
    ctx.font = `bold ${size < 200 ? 13 : 15}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmtShort(totalValue), cx, cy);

    // Legend
    legendEl.innerHTML = holdings.map((h, i) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${this.COLORS[i % this.COLORS.length]}"></span>
        <span>${escapeHtml(h.ticker)} — ${(h.allocation * 100).toFixed(1)}%</span>
      </div>`).join('');
  },

  render() {
    this.renderSummaryCards();
    this.renderHoldingsTable();
    this.renderPieChart();
  },

  // ── Event handlers ─────────────────────────────────────────────────────

  init() {
    document.getElementById('holding-form').addEventListener('submit', e => {
      e.preventDefault();
      const ticker  = document.getElementById('holding-ticker').value;
      const shares  = document.getElementById('holding-shares').value;
      const buyPx   = document.getElementById('holding-buy').value;
      const curPx   = document.getElementById('holding-current').value;

      if (!ticker.trim()) { showToast('Enter a ticker symbol.', 'error'); return; }
      if (parseFloat(shares) <= 0) { showToast('Shares must be > 0.', 'error'); return; }
      if (parseFloat(buyPx) <= 0 || parseFloat(curPx) <= 0) {
        showToast('Prices must be > 0.', 'error'); return;
      }

      Portfolio.addHolding(ticker, shares, buyPx, curPx);
      e.target.reset();
      Portfolio.render();
      showToast('Holding added!', 'success');
    });
  },
};
