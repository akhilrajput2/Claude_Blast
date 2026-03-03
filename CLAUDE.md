# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build step or server required. Open directly in a browser:

```bash
open index.html        # macOS
```

Or serve via any static file server:

```bash
npx serve .
```

## Architecture

A single-page financial advisory app built with vanilla HTML/CSS/JS. No frameworks, no npm dependencies, no build tools.

### Script load order (index.html, bottom of `<body>`)

Scripts must be loaded in this exact dependency order:

```
js/storage.js   ← loaded first; all other modules depend on it
js/budget.js
js/portfolio.js
js/advisor.js   ← depends on Budget.getMonthSummary() and Portfolio.calcPortfolioStats()
js/app.js       ← loaded last; calls init() on DOMContentLoaded
```

### State and data flow

All persistent state lives in a single `localStorage` key (`finapp_v1`) managed exclusively through `Storage` in `js/storage.js`. The pattern is strictly unidirectional:

```
User action → Module handler → Storage.setSection() → Module.render() → DOM update
```

Every render function reads fresh from `Storage.get()` — there is no in-memory state layer. Never write to `localStorage` directly; always go through `Storage`.

### Module pattern

Each feature is a plain object namespace (`Budget`, `Portfolio`, `Advisor`, `App`). Each module exposes:
- Data operations (CRUD against storage)
- A `render()` method (or named render functions) that rebuilds the DOM from storage
- An `init()` method that binds event listeners — called once by `App.init()`

### Key behaviours to preserve

- **Month reset**: `Budget.checkMonthReset()` runs once on `App.init()`. It compares the current `YYYY-MM` string against `meta.lastResetMonth` in storage. If they differ, `transactions` are cleared but `portfolio` and `advisor.chatHistory` are untouched. Always update `meta.lastResetMonth` after a reset.
- **Advisor rules**: `Advisor.analyze()` runs all 25 rules in `Advisor.RULES` against a data context built from `Budget.getMonthSummary()` and `Portfolio.calcPortfolioStats()`. Rules are sorted by `priority` (higher = shown first). Add new rules to `Advisor.RULES` — do not add conditional logic directly inside `generateResponse()`.
- **Pie chart**: `Portfolio.renderPieChart()` uses the Canvas 2D API with explicit DPR scaling for retina displays. The donut hole is drawn by filling a smaller concentric circle with `#1a1a2e` (the card background colour) — if the card background colour changes, update this too.
- **Chat history cap**: `Storage.setSection('advisor', ...)` automatically trims `chatHistory` to 100 entries. This is the only place trimming happens.

### Shared utilities (defined in `js/advisor.js`, global scope)

- `fmtCurrency(n)` — formats a number as USD currency
- `escapeHtml(str)` — must be used on all user-supplied strings before inserting into `innerHTML`
- `showToast(message, type)` — displays a non-blocking notification (`'success'` | `'error'` | `''`)

### Colour palette

CSS custom properties are defined on `:root` in `css/styles.css`. The pie chart colour array in `Portfolio.COLORS` and the category colour map in `Budget.CATEGORY_COLORS` use the same palette — keep them in sync when adding colours.

### Resetting data during development

Open the browser DevTools console and run:

```js
localStorage.removeItem('finapp_v1'); location.reload();
```

To simulate a new-month reset without changing system date:

```js
const s = JSON.parse(localStorage.getItem('finapp_v1'));
s.meta.lastResetMonth = '2000-01';
localStorage.setItem('finapp_v1', JSON.stringify(s));
location.reload();
```
