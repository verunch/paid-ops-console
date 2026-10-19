#!/usr/bin/env node
// Generates the static HTML/CSS prototype in /site from the two source-of-truth
// files in docs/figma-prototype-plan/ (design-tokens.json, field-maps.json).
// Re-run any time those source files change: `node tools/build-site.mjs`

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PLAN_DIR = path.join(ROOT, "docs/figma-prototype-plan");
const SITE_DIR = path.join(ROOT, "site");

const tokens = JSON.parse(fs.readFileSync(path.join(PLAN_DIR, "design-tokens.json"), "utf8"));
const fieldMaps = JSON.parse(fs.readFileSync(path.join(PLAN_DIR, "field-maps.json"), "utf8"));

function writeFile(relPath, content) {
  const full = path.join(SITE_DIR, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// 1. tokens.css — generated from design-tokens.json
// ---------------------------------------------------------------------------
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

const WEIGHT_MAP = { Regular: 400, Medium: 500, SemiBold: 600, Bold: 700 };

function buildTokensCss() {
  const lines = ["/* GENERATED FILE — do not hand-edit. Source: docs/figma-prototype-plan/design-tokens.json */", ":root {"];

  for (const [name, def] of Object.entries(tokens.collections.Color.variables)) {
    const varName = `--color-${name.replace(/\//g, "-")}`;
    if (def.opacity !== undefined) {
      const { r, g, b } = hexToRgb(def.hex);
      lines.push(`  ${varName}: rgba(${r}, ${g}, ${b}, ${def.opacity});`);
      lines.push(`  ${varName}-solid: ${def.hex};`);
    } else {
      lines.push(`  ${varName}: ${def.hex};`);
    }
  }

  for (const [name, def] of Object.entries(tokens.collections.Spacing.variables)) {
    lines.push(`  --${name.replace(/\//g, "-")}: ${def.value}px;`);
  }
  for (const [name, def] of Object.entries(tokens.collections.Radius.variables)) {
    lines.push(`  --${name.replace(/\//g, "-")}: ${def.value}px;`);
  }

  for (const [name, def] of Object.entries(tokens.typography.styles)) {
    const key = name.toLowerCase().replace(/\s+/g, "-");
    lines.push(`  --font-${key}-size: ${def.size}px;`);
    lines.push(`  --font-${key}-weight: ${WEIGHT_MAP[def.weight] || 400};`);
    lines.push(`  --font-${key}-lh: ${def.lineHeightPct}%;`);
    if (def.letterSpacingPct) lines.push(`  --font-${key}-tracking: ${def.letterSpacingPct / 100}em;`);
  }
  lines.push(`  --font-mono-body-sm-size: 13px;`);
  lines.push(`  --font-mono-body-sm-lh: 145%;`);

  lines.push(`  --font-family-sans: "IBM Plex Sans", Inter, system-ui, -apple-system, sans-serif;`);
  lines.push(`  --font-family-mono: "IBM Plex Mono", "Roboto Mono", ui-monospace, "SFMono-Regular", monospace;`);

  for (const [name, def] of Object.entries(tokens.elevation)) {
    const { r, g, b } = hexToRgb(def.color);
    lines.push(`  --${name.replace(/\//g, "-")}: 0 ${def.offsetY}px ${def.blur}px rgba(${r}, ${g}, ${b}, ${def.opacity});`);
  }

  lines.push(`  --layout-frame-width: ${tokens.layout.frameWidth}px;`);
  lines.push(`  --layout-content-max-width: ${tokens.layout.contentMaxWidth}px;`);
  lines.push(`  --layout-page-padding-x: ${tokens.layout.pagePaddingX}px;`);
  lines.push(`  --layout-row-height-compact: ${tokens.layout.rowHeightCompact}px;`);
  lines.push(`  --control-height-sm: ${tokens.layout.controlHeight.sm}px;`);
  lines.push(`  --control-height-md: ${tokens.layout.controlHeight.md}px;`);
  lines.push(`  --control-height-lg: ${tokens.layout.controlHeight.lg}px;`);

  lines.push("}");
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 2. base.css + components.css — hand-authored, token-driven
// ---------------------------------------------------------------------------
const baseCss = `/* base.css — reset + page chrome + frame container */
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: #E7E8E6;
  font-family: var(--font-family-sans);
  color: var(--color-text-primary);
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
button { font-family: inherit; cursor: pointer; }
input, select { font-family: inherit; }

/* ---- prototype meta navigation (NOT part of the product design) ---- */
.proto-nav {
  font-family: var(--font-family-mono);
  font-size: 12px;
  color: #6B7370;
  background: #F1F1EF;
  border-bottom: 1px dashed #C7CAC7;
  padding: 10px var(--layout-page-padding-x);
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.proto-nav .proto-tag {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9AA19E;
  font-weight: 700;
}
.proto-nav a { color: #3E6FA8; }
.proto-nav a:hover { text-decoration: underline; }
.proto-nav .sep { color: #C7CAC7; }

/* ---- the actual importable frame ---- */
.frame {
  width: var(--layout-frame-width);
  margin: 32px auto 64px;
  background: var(--color-bg-canvas);
  box-shadow: var(--shadow-card);
  min-height: 400px;
  position: relative;
}
.frame-inner {
  padding: var(--spacing-2xl) var(--layout-page-padding-x) var(--spacing-3xl);
}
.content-narrow {
  max-width: var(--layout-content-max-width);
  margin: 0 auto;
}
`;

const componentsCss = `/* components.css — shared UI components, all token-driven */

/* Typography utility classes */
.text-display { font-size: var(--font-display-size); font-weight: var(--font-display-weight); line-height: var(--font-display-lh); }
.text-h1 { font-size: var(--font-h1-size); font-weight: var(--font-h1-weight); line-height: var(--font-h1-lh); }
.text-h2 { font-size: var(--font-h2-size); font-weight: var(--font-h2-weight); line-height: var(--font-h2-lh); }
.text-h3 { font-size: var(--font-h3-size); font-weight: var(--font-h3-weight); line-height: var(--font-h3-lh); }
.text-body { font-size: var(--font-body-size); font-weight: var(--font-body-weight); line-height: var(--font-body-lh); }
.text-body-sm { font-size: var(--font-body-sm-size); font-weight: var(--font-body-sm-weight); line-height: var(--font-body-sm-lh); }
.text-caption { font-size: var(--font-caption-size); font-weight: var(--font-caption-weight); line-height: var(--font-caption-lh); }
.text-overline { font-size: var(--font-overline-size); font-weight: var(--font-overline-weight); line-height: var(--font-overline-lh); letter-spacing: var(--font-overline-tracking); text-transform: uppercase; }
.text-mono { font-family: var(--font-family-mono); font-size: var(--font-mono-body-sm-size); line-height: var(--font-mono-body-sm-lh); }
.text-secondary { color: var(--color-text-secondary); }
.text-muted { color: var(--color-text-muted); }

/* ---- App header ---- */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}
.app-header .page-title { color: var(--color-text-primary); margin: 0; }
.header-meta { display: flex; align-items: center; gap: var(--spacing-sm); }

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2xs);
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: var(--font-caption-size);
  font-weight: var(--font-caption-weight);
}
.role-badge .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.role-badge.role-admin { background: var(--color-accent-admin-bg); color: var(--color-accent-admin); }
.role-badge.role-admin .dot { background: var(--color-accent-admin); }
.role-badge.role-user { background: var(--color-accent-user-bg); color: var(--color-accent-user); }
.role-badge.role-user .dot { background: var(--color-accent-user); }

.mode-tabs { display: inline-flex; border: 1px solid var(--color-border-default); border-radius: var(--radius-md); overflow: hidden; }
.mode-tabs a { padding: 6px 14px; font-size: var(--font-caption-size); color: var(--color-text-secondary); background: var(--color-surface-default); }
.mode-tabs a.active { background: var(--color-action-primary); color: var(--color-text-inverse); }
.mode-tabs a + a { border-left: 1px solid var(--color-border-default); }

.role-switch-link { font-size: var(--font-caption-size); color: var(--color-text-secondary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); padding: 6px 12px; background: var(--color-surface-default); }
.role-switch-link:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }

/* ---- Search panel ---- */
.search-panel {
  background: var(--color-surface-default);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-card);
}
.field-group + .field-group { margin-top: var(--spacing-lg); }
.field-group-title { margin: 0 0 var(--spacing-sm); font-weight: var(--font-h3-weight); }
.field-row { display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-md); }
.field-row:last-child { margin-bottom: 0; }
.field-wrap { flex: 1 1 0; min-width: 0; position: relative; }

/* ---- Text Input ---- */
.field-input {
  width: 100%;
  height: var(--control-height-md);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-surface-default);
  color: var(--color-text-primary);
  padding: 0 var(--spacing-sm);
  font-size: var(--font-body-sm-size);
  outline: none;
  transition: border-color .12s ease, box-shadow .12s ease;
}
/* 2px states (focus / error) = 1px border + 1px inset ring, so the box never shifts */
.field-input::placeholder { color: var(--color-text-muted); }
.field-input:hover, .field-input.is-hover { border-color: var(--color-border-strong); }
.field-input:focus, .field-input.is-focus { border-color: var(--color-focus-ring); box-shadow: inset 0 0 0 1px var(--color-focus-ring); }
.field-input.filled { color: var(--color-text-primary); }
.field-input.is-cardnum { font-family: var(--font-family-mono); }
.field-input:disabled { background: var(--color-disabled-bg); border-color: var(--color-disabled-border); color: var(--color-disabled-text); cursor: not-allowed; }
.field-input:disabled::placeholder { color: var(--color-disabled-text); }
.field-input.has-error, .field-input.has-error:focus { border-color: var(--color-status-error); box-shadow: inset 0 0 0 1px var(--color-status-error); }

.field-error {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: var(--font-overline-size);
  font-weight: var(--font-caption-weight);
  color: var(--color-status-error);
}

/* ---- Select ---- */
.field-select {
  width: 100%;
  height: var(--control-height-md);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-surface-default);
  color: var(--color-text-muted);
  padding: 0 var(--spacing-sm);
  font-size: var(--font-body-sm-size);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2xs);
  transition: border-color .12s ease;
}
.field-select:hover, .field-select.is-hover { border-color: var(--color-border-strong); }
.field-select.filled { color: var(--color-text-primary); }
.field-select .chevron { flex: none; width: 12px; height: 7px; }
.field-select:focus-visible, .field-select.is-open, .field-select.is-focus { outline: none; }
.field-select:focus-visible, .field-select.is-open, .field-select.is-focus { border-color: var(--color-focus-ring); box-shadow: inset 0 0 0 1px var(--color-focus-ring); }
.field-select.has-error { border-color: var(--color-status-error); box-shadow: inset 0 0 0 1px var(--color-status-error); }
.field-select.is-disabled { background: var(--color-disabled-bg); border-color: var(--color-disabled-border); color: var(--color-disabled-text); cursor: not-allowed; }
.select-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-surface-default);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
  z-index: 20;
  overflow: hidden;
}
.select-panel .opt { padding: 8px var(--spacing-sm); font-size: var(--font-body-sm-size); color: var(--color-text-primary); }
.select-panel .opt:hover, .select-panel .opt.active { background: var(--color-surface-hover); }

/* ---- Checkbox ---- */
.checkbox { display: inline-flex; align-items: center; gap: var(--spacing-2xs); font-size: var(--font-body-sm-size); color: var(--color-text-primary); user-select: none; }
.checkbox .box {
  width: 16px; height: 16px;
  border: 1.5px solid var(--color-border-contrast);
  border-radius: var(--radius-sm);
  background: var(--color-surface-default);
  display: inline-flex; align-items: center; justify-content: center;
  flex: none;
}
.checkbox.checked .box { background: var(--color-action-primary); border-color: var(--color-action-primary); }
.checkbox.checked .box svg { display: block; }
.checkbox .box svg { display: none; }
.checkbox.disabled { color: var(--color-disabled-text); }
.checkbox.disabled .box { background: var(--color-disabled-bg); }

/* ---- Tooltip ----
   Rendered in normal document flow (not position:absolute) so it reserves
   real vertical space and pushes following rows down instead of overlapping
   them — these are "persistent" tooltips that are always visible, not
   hover-only popovers. */
.tooltip {
  position: relative;
  margin-top: 8px;
  background: #33383A;
  color: #FFFFFF;
  font-size: var(--font-caption-size);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-popover);
  white-space: nowrap;
  display: inline-block;
  z-index: 10;
}
.tooltip::before {
  content: "";
  position: absolute;
  top: -5px; left: 16px;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 5px solid #33383A;
}

/* ---- Buttons ---- */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: var(--control-height-md);
  padding: 0 var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-body-sm-size);
  font-weight: var(--font-h3-weight);
  border: 1px solid transparent;
  outline: none;
  transition: background-color .12s ease, border-color .12s ease;
  gap: 6px;
}
.btn-sm { height: var(--control-height-sm); padding: 0 var(--spacing-sm); }
.btn-lg { height: var(--control-height-lg); padding: 0 var(--spacing-lg); }
.btn-primary { background: var(--color-action-primary); color: var(--color-text-inverse); }
.btn-primary:hover, .btn-primary.is-hover { background: var(--color-action-primary-hover); }
.btn-primary:focus-visible { box-shadow: 0 0 0 2px var(--color-surface-default), 0 0 0 4px var(--color-focus-ring); }
.btn-secondary { background: var(--color-surface-default); color: var(--color-text-primary); border-color: var(--color-border-contrast); }
.btn-ghost { background: transparent; color: var(--color-text-primary); }
.btn-secondary:hover, .btn-secondary.is-hover,
.btn-ghost:hover, .btn-ghost.is-hover { background: var(--color-surface-hover); }
.btn-secondary:focus-visible, .btn-secondary.is-focus,
.btn-ghost:focus-visible, .btn-ghost.is-focus { border-color: var(--color-focus-ring); box-shadow: inset 0 0 0 1px var(--color-focus-ring); }
.btn-destructive { background: var(--color-status-error); color: var(--color-text-inverse); }
.btn[disabled] { background: var(--color-disabled-bg); color: var(--color-disabled-text); cursor: not-allowed; }
.btn-ghost[disabled] { background: transparent; }

/* ---- Design-system state grids ---- */
.state-grid, .state-grid-head { display: grid; grid-template-columns: repeat(6, minmax(0, 196px)); gap: var(--spacing-md); align-items: start; }
.state-grid + .state-grid { margin-top: var(--spacing-lg); }
.state-grid .btn { justify-self: start; }
.state-grid-head { margin-bottom: var(--spacing-xs); font-size: var(--font-overline-size); text-transform: uppercase; letter-spacing: .08em; color: var(--color-text-muted); }

/* ---- Footer row ---- */
.footer-row { display: flex; align-items: center; justify-content: space-between; margin-top: var(--spacing-lg); flex-wrap: wrap; gap: var(--spacing-md); }
.footer-left, .footer-right { display: flex; align-items: center; gap: var(--spacing-sm); }

/* ---- Status Badge (icon/shape + label, never color alone) ---- */
.status-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-caption-size);
  font-weight: var(--font-caption-weight);
  border: 1px solid transparent;
  white-space: nowrap;
}
.status-badge svg { flex: none; }
.status-badge.success { background: var(--color-status-success-bg); color: var(--color-status-success); border-color: var(--color-status-success-border); }
.status-badge.warning { background: var(--color-status-warning-bg); color: var(--color-status-warning); border-color: var(--color-status-warning-border); }
.status-badge.error { background: var(--color-status-error-bg); color: var(--color-status-error); border-color: var(--color-status-error-border); }
.status-badge.info { background: var(--color-status-info-bg); color: var(--color-status-info); border-color: var(--color-status-info-border); }
.status-badge.neutral { background: var(--color-surface-subtle); color: var(--color-text-secondary); border-color: var(--color-border-default); }

/* ---- Table ----
   table-layout:fixed with an explicit <colgroup> keeps the ~10-14 column
   results table within (or close to) the frame width; overflow-x:auto is
   a safety net for the Admin variant's extra columns, with a visible
   scrollbar so nothing is silently hidden. */
.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-surface-default);
  scrollbar-color: var(--color-border-strong) var(--color-surface-subtle);
  scrollbar-width: thin;
}
.table-scroll::-webkit-scrollbar { height: 10px; }
.table-scroll::-webkit-scrollbar-track { background: var(--color-surface-subtle); }
.table-scroll::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: var(--radius-full); }
table.data-table { border-collapse: collapse; width: 100%; table-layout: fixed; }
table.data-table th {
  background: var(--color-surface-sunken);
  text-align: left;
  padding: 8px 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid var(--color-border-default);
  position: relative;
}
table.data-table th.sortable { cursor: pointer; }
table.data-table th .th-inner { display: inline-flex; align-items: center; gap: 4px; }
table.data-table th.num, table.data-table td.num { text-align: right; }
table.data-table th.status-col, table.data-table td.status-col { text-align: center; }
table.data-table td {
  padding: 8px 10px;
  height: var(--layout-row-height-compact);
  border-bottom: 1px solid var(--color-border-default);
  font-size: var(--font-body-sm-size);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
table.data-table td.mono { font-family: var(--font-family-mono); font-size: 12px; }
table.data-table tbody tr:last-child td { border-bottom: none; }
table.data-table tbody tr:nth-child(even) { background: var(--color-surface-subtle); }
table.data-table tbody tr:hover { background: var(--color-accent-admin-bg); }
table.data-table tbody tr.selected { background: var(--color-accent-user-bg); }
table.data-table .row-check { width: 36px; }
table.data-table .actions-cell { display: flex; gap: 6px; overflow: visible; }
table.data-table .icon-btn {
  width: 26px; height: 26px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-surface-default);
  display: inline-flex; align-items: center; justify-content: center;
  flex: none;
}
table.data-table .icon-btn:hover { border-color: var(--color-border-strong); background: var(--color-surface-subtle); }

.results-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm); }
.results-toolbar h2 { margin: 0; }

/* ---- Pagination ---- */
.pagination { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-sm) var(--spacing-md); }
.pagination .pages { display: flex; align-items: center; gap: 4px; }
.pagination .page-btn {
  min-width: 28px; height: 28px; border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-default);
  background: var(--color-surface-default);
  font-size: var(--font-caption-size);
  color: var(--color-text-secondary);
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0 6px;
}
.pagination .page-btn.active { background: var(--color-action-primary); color: var(--color-text-inverse); border-color: var(--color-action-primary); }
.pagination .rows-per-page { display: flex; align-items: center; gap: 8px; font-size: var(--font-caption-size); color: var(--color-text-secondary); }
.pagination .rows-per-page .field-select { width: 72px; height: var(--control-height-sm); }

/* ---- Toast ---- */
.toast {
  position: fixed;
  bottom: var(--spacing-xl);
  right: var(--spacing-xl);
  display: flex; align-items: center; gap: 10px;
  background: var(--color-surface-default);
  border: 1px solid var(--color-status-success-border);
  border-left: 4px solid var(--color-status-success);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-modal);
  padding: 14px 18px;
  font-size: var(--font-body-sm-size);
  z-index: 100;
}
.toast .toast-icon { color: var(--color-status-success); flex: none; }
.toast .toast-title { font-weight: var(--font-caption-weight); color: var(--color-text-primary); }
.toast .toast-body { color: var(--color-text-secondary); }
.toast .toast-close { margin-left: 8px; color: var(--color-text-muted); }

/* ---- Drawer / Modal ---- */
.drawer-overlay { position: absolute; inset: 0; background: rgba(30, 41, 38, 0.32); z-index: 40; }
.drawer {
  position: absolute; top: 0; right: 0; bottom: 0;
  width: 420px;
  background: var(--color-surface-default);
  box-shadow: var(--shadow-modal);
  z-index: 41;
  display: flex; flex-direction: column;
}
.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-lg); border-bottom: 1px solid var(--color-border-default); }
.drawer-header h2 { margin: 0; }
.drawer-close { width: 32px; height: 32px; border-radius: var(--radius-md); border: 1px solid var(--color-border-default); background: var(--color-surface-default); display: inline-flex; align-items: center; justify-content: center; }
.drawer-body { padding: var(--spacing-lg); overflow-y: auto; flex: 1; }
.drawer-field { display: flex; justify-content: space-between; gap: var(--spacing-md); padding: 10px 0; border-bottom: 1px solid var(--color-border-default); }
.drawer-field:last-child { border-bottom: none; }
.drawer-field .k { color: var(--color-text-secondary); font-size: var(--font-body-sm-size); }
.drawer-field .v { color: var(--color-text-primary); font-size: var(--font-body-sm-size); text-align: right; }
.drawer-field .v.mono { font-family: var(--font-family-mono); }
.drawer-section-title { margin: var(--spacing-md) 0 var(--spacing-2xs); color: var(--color-text-secondary); }
.drawer-section-title:first-child { margin-top: 0; }

/* ---- Loading Skeleton ---- */
@keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
.skeleton-block {
  background: linear-gradient(90deg, var(--color-surface-subtle) 0%, var(--color-border-default) 50%, var(--color-surface-subtle) 100%);
  background-size: 400px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: var(--radius-sm);
  display: inline-block;
}
table.data-table tr.skeleton-row td { height: var(--layout-row-height-compact); }

/* ---- Empty State ---- */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--spacing-3xl) var(--spacing-lg); text-align: center; gap: var(--spacing-2xs); }
.empty-state .icon { color: var(--color-text-muted); margin-bottom: var(--spacing-xs); }
.empty-state .title { color: var(--color-text-primary); font-weight: var(--font-h3-weight); }
.empty-state .hint { color: var(--color-text-secondary); max-width: 360px; }

/* ---- misc ---- */
.section-block + .section-block { margin-top: var(--spacing-xl); }
.swatch-row { display: flex; gap: var(--spacing-md); flex-wrap: wrap; align-items: flex-start; }
.swatch-card { border: 1px solid var(--color-border-default); border-radius: var(--radius-md); padding: var(--spacing-md); background: var(--color-surface-default); }
.swatch-label { font-size: var(--font-caption-size); color: var(--color-text-muted); margin-top: 6px; }
.color-chip { width: 96px; }
.color-chip .swatch { height: 56px; border-radius: var(--radius-md); border: 1px solid var(--color-border-default); }
`;

// ---------------------------------------------------------------------------
// small SVG icons (inline, no external assets)
// ---------------------------------------------------------------------------
const ICONS = {
  chevron: `<svg class="chevron" width="12" height="7" viewBox="0 0 12 7" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check: `<svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  sortAsc: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1L9 6H1L5 1Z" fill="currentColor"/></svg>`,
  sortNone: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 0.5L8 4H2L5 0.5Z" fill="currentColor" opacity="0.3"/><path d="M5 9.5L2 6H8L5 9.5Z" fill="currentColor" opacity="0.3"/></svg>`,
  statusDotSuccess: `<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.7-5 7-5 7 5 7 5-2.7 5-7 5-7-5-7-5Z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/></svg>`,
  flag: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 1v14M3 2h9l-2 3 2 3H3" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`,
  close: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  search: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M20 20L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  toastCheck: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15"/><path d="M6 10L9 13L14 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

// ---------------------------------------------------------------------------
// tooltip content (verbatim from references/comments.png + tooltip screenshot)
// applied consistently to every screen where the underlying field exists,
// per field-maps.json's tooltipRules ("applies to both Admin and Client").
// ---------------------------------------------------------------------------
const PERSISTENT_TOOLTIPS = {
  "xxxx xxxx xxxx 1234": "введите последние 4 цифры карты",
  "Маска карты": "маска карты 123456 xxxx 1234",
  "Временная зона": "Временная зона (GMT + 01:00) Amsterdam",
};

// ---------------------------------------------------------------------------
// Field rendering
// ---------------------------------------------------------------------------
function parseField(raw) {
  const parts = raw.split("|");
  const label = parts[0];
  const flags = parts.slice(1);
  return { label, flags };
}

let uid = 0;
function nextId(prefix) { uid += 1; return `${prefix}-${uid}`; }

function renderField(raw, opts = {}) {
  const { label, flags } = parseField(raw);
  const isSelect = flags.includes("select");
  const isCardnum = flags.includes("cardnum");
  const checkboxFlag = flags.find((f) => f.startsWith("checkbox("));
  const explicitTooltip = flags.find((f) => f.startsWith("tooltip-persistent:"));
  const tooltipText = explicitTooltip
    ? explicitTooltip.slice("tooltip-persistent:".length)
    : PERSISTENT_TOOLTIPS[label];

  if (checkboxFlag) {
    const checked = checkboxFlag.includes("unchecked") ? false : true;
    return `<div class="field-wrap">${renderCheckbox(label, checked)}</div>`;
  }

  const errorField = opts.errorField === label;
  let control;
  if (isSelect) {
    control = `<div class="field-select" role="combobox" tabindex="0" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(label)}"><span>${esc(label)}</span>${ICONS.chevron}</div>`;
  } else {
    const cls = ["field-input", isCardnum ? "is-cardnum" : "", errorField ? "has-error" : ""].filter(Boolean).join(" ");
    control = `<input class="${cls}" type="text" placeholder="${esc(label)}" aria-label="${esc(label)}"${errorField ? ' aria-invalid="true" aria-describedby="field-error"' : ""}/>`;
  }

  const tooltipHtml = tooltipText
    ? `<div class="tooltip tooltip-persistent">${esc(tooltipText)}</div>`
    : "";
  const errorHtml = errorField
    ? `<div class="field-error" id="field-error">Введите корректное значение поля</div>`
    : "";

  return `<div class="field-wrap">${control}${tooltipHtml}${errorHtml}</div>`;
}

function renderCheckbox(label, checked) {
  return `<label class="checkbox${checked ? " checked" : ""}"><span class="box">${ICONS.check}</span><span>${esc(label)}</span></label>`;
}

function renderGroup(group, opts) {
  const rows = group.rows
    .map((row) => `<div class="field-row">${row.map((f) => renderField(f, opts)).join("")}</div>`)
    .join("");
  return `<div class="field-group"><h3 class="field-group-title text-h3 text-secondary">${esc(group.title)}</h3>${rows}</div>`;
}

function renderFooter(footer, mode, role) {
  const advancedChecked = mode === "advanced";
  const otherMode = mode === "advanced" ? "default" : "default";
  const advancedHref = mode === "advanced" ? `/${role}/basic/default` : `/${role}/advanced/default`;
  return `<div class="footer-row">
    <div class="footer-left">
      <a class="btn btn-primary" href="/${role}/${mode}/${mode === "advanced" ? "results" : "loading"}">Искать</a>
      <a class="btn btn-secondary" href="/export/success">Экспортировать в XLSX</a>
    </div>
    <div class="footer-right">
      <a href="${advancedHref}">${renderCheckbox("Расширенный поиск", advancedChecked)}</a>
      <a class="btn btn-secondary" href="/${role}/${mode}/default">Очистить поля</a>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Results table
// ---------------------------------------------------------------------------
const SAMPLE_ROWS = [
  { uid: "PMT-8842190", tracking: "TRK-2291001", date: "21.07 14:32", desc: "Оплата заказа №4521", type: "Оплата", payer: "и***@example.com", amount: "145.00 BYN", method: "Visa •••• 4471", status: "success", statusLabel: "Одобрена", processor: "EPay Gateway", merchant: "ООО «Технопарк»", fraud: "—", test: "Нет", selected: true },
  { uid: "PMT-8842177", tracking: "TRK-2290988", date: "21.07 13:58", desc: "Возврат по заказу №4498", type: "Возврат", payer: "с***@gmail.com", amount: "62.50 BYN", method: "Mastercard •••• 9012", status: "info", statusLabel: "Возврат", processor: "Paid Core", merchant: "ИП Соколова", fraud: "—", test: "Нет" },
  { uid: "PMT-8842150", tracking: "TRK-2290955", date: "21.07 12:41", desc: "Оплата подписки Premium", type: "Оплата", payer: "a***@yandex.by", amount: "29.90 BYN", method: "Visa •••• 2201", status: "warning", statusLabel: "В обработке", processor: "EPay Gateway", merchant: "ООО «Цифра»", fraud: "Проверка", test: "Нет" },
  { uid: "PMT-8842133", tracking: "TRK-2290920", date: "21.07 11:07", desc: "Оплата заказа №4487", type: "Оплата", payer: "m***@mail.ru", amount: "310.00 BYN", method: "Mastercard •••• 5588", status: "error", statusLabel: "Отклонена", processor: "SecurePay", merchant: "ООО «Технопарк»", fraud: "Высокий риск", test: "Нет" },
  { uid: "PMT-8842108", tracking: "TRK-2290874", date: "21.07 09:52", desc: "Тестовый платёж", type: "Оплата", payer: "test***@example.com", amount: "1.00 BYN", method: "Visa •••• 0002", status: "success", statusLabel: "Одобрена", processor: "Paid Core", merchant: "Тестовый магазин", fraud: "—", test: "Да" },
  { uid: "PMT-8842077", tracking: "TRK-2290811", date: "20.07 18:23", desc: "Оплата заказа №4460", type: "Оплата", payer: "o***@example.com", amount: "88.20 BYN", method: "Mastercard •••• 7734", status: "neutral", statusLabel: "Отменена", processor: "EPay Gateway", merchant: "ИП Соколова", fraud: "—", test: "Нет" },
];

// Explicit column widths (px) so the fixed-layout table stays close to the
// frame width instead of the browser's auto-layout blowing it out to ~2000px.
const COLUMN_WIDTHS = {
  check: 36,
  "UID операции": 104,
  "Трекинг ID": 96,
  "Дата и время": 92,
  "Описание платежа": 200,
  "Тип транзакции": 118,
  "Плательщик": 130,
  "Сумма": 90,
  "Способ оплаты": 140,
  "Статус": 118,
  "Процессор": 110,
  "Магазин/Мерчант": 140,
  "Фрод-маркер": 110,
  "Тест": 60,
  "Действия": 90,
};

function statusBadge(row) {
  return `<span class="status-badge ${row.status}">${ICONS.statusDotSuccess}${esc(row.statusLabel)}</span>`;
}

function renderColgroup(columns, adminExtra, isAdmin) {
  const widths = [
    COLUMN_WIDTHS.check,
    ...columns.map((c) => COLUMN_WIDTHS[c] || 110),
    ...(isAdmin ? adminExtra.map((c) => COLUMN_WIDTHS[c] || 110) : []),
    COLUMN_WIDTHS["Действия"],
  ];
  return `<colgroup>${widths.map((w) => `<col style="width:${w}px">`).join("")}</colgroup>`;
}

function renderTable(role, state) {
  const isAdmin = role === "admin";
  const columns = [...fieldMaps.resultsTableColumns];
  // "Действия" is the last entry of resultsTableColumns, but it's rendered as
  // its own explicit trailing <th>/<td> (icon buttons, not plain text) further
  // below — exclude it here so header cell count matches body cell count.
  const baseColumns = columns.filter((c) => c !== "Действия");
  const adminExtra = fieldMaps.resultsTableColumnsAdminExtra;
  const colgroup = renderColgroup(baseColumns, adminExtra, isAdmin);

  const headerCells = [
    `<th class="row-check"><label class="checkbox checked"><span class="box">${ICONS.check}</span></label></th>`,
    ...baseColumns.map((c, i) => {
      const sortable = c === "Дата и время";
      const isNum = c === "Сумма";
      const isStatus = c === "Статус";
      return `<th class="${sortable ? "sortable" : ""} ${isNum ? "num" : ""} ${isStatus ? "status-col" : ""}"><span class="th-inner text-overline">${esc(c)} ${sortable ? ICONS.sortAsc : ""}</span></th>`;
    }),
    ...(isAdmin ? adminExtra.map((c) => `<th><span class="th-inner text-overline">${esc(c)}</span></th>`) : []),
    `<th><span class="text-overline">${esc("Действия")}</span></th>`,
  ].join("");

  if (state === "loading") {
    const skelCols = 1 + baseColumns.length + (isAdmin ? adminExtra.length : 0) + 1;
    const rows = Array.from({ length: 5 })
      .map(() => `<tr class="skeleton-row">${Array.from({ length: skelCols }).map(() => `<td><span class="skeleton-block" style="width:70%;height:14px;"></span></td>`).join("")}</tr>`)
      .join("");
    return `<div class="table-scroll"><table class="data-table">${colgroup}<thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  if (state === "empty") {
    return `<div class="empty-state"><div class="icon">${ICONS.search}</div><div class="title">Нет результатов</div><div class="hint text-body-sm">По заданным параметрам поиска ничего не найдено. Измените условия и попробуйте снова.</div><a class="btn btn-secondary" style="margin-top:12px" href="/${role}/basic/default">Очистить фильтры</a></div>`;
  }

  const bodyRows = SAMPLE_ROWS.map((row) => {
    const cells = [
      `<td class="row-check"><label class="checkbox${row.selected ? " checked" : ""}"><span class="box">${ICONS.check}</span></label></td>`,
      `<td class="mono">${row.uid}</td>`,
      `<td class="mono">${row.tracking}</td>`,
      `<td>${row.date}</td>`,
      `<td>${esc(row.desc)}</td>`,
      `<td>${esc(row.type)}</td>`,
      `<td>${row.payer}</td>`,
      `<td class="num mono">${row.amount}</td>`,
      `<td>${row.method}</td>`,
      `<td class="status-col">${statusBadge(row)}</td>`,
    ];
    if (isAdmin) {
      cells.push(`<td>${esc(row.processor)}</td>`, `<td>${esc(row.merchant)}</td>`, `<td>${row.fraud === "—" ? "—" : `<span class="status-badge warning">${row.fraud}</span>`}</td>`, `<td>${row.test}</td>`);
    }
    cells.push(`<td><div class="actions-cell"><a class="icon-btn" title="Просмотр" href="/transaction/details">${ICONS.eye}</a>${isAdmin ? `<button class="icon-btn" title="Отметить фрод">${ICONS.flag}</button>` : ""}</div></td>`);
    return `<tr class="${row.selected ? "selected" : ""}">${cells.join("")}</tr>`;
  }).join("");

  const pagination = `<div class="pagination">
    <div class="rows-per-page">Показывать по <div class="field-select filled" style="width:72px;height:28px;">6${ICONS.chevron}</div> строк</div>
    <div class="pages">
      <button class="page-btn">‹</button>
      <button class="page-btn active">1</button>
      <button class="page-btn">2</button>
      <button class="page-btn">3</button>
      <button class="page-btn">›</button>
    </div>
  </div>`;

  return `<div class="table-scroll"><table class="data-table">${colgroup}<thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>${pagination}`;
}

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------
const ALL_ROUTES = [
  { href: "/cover", label: "Обложка" },
  { href: "/design-system", label: "Дизайн-система" },
  { href: "/admin/basic/default", label: "Admin · Basic · Default" },
  { href: "/admin/basic/loading", label: "Admin · Basic · Loading" },
  { href: "/admin/basic/results", label: "Admin · Basic · Results" },
  { href: "/admin/basic/empty", label: "Admin · Basic · Empty" },
  { href: "/admin/advanced/default", label: "Admin · Advanced · Default" },
  { href: "/admin/advanced/validation", label: "Admin · Advanced · Validation" },
  { href: "/admin/advanced/results", label: "Admin · Advanced · Results" },
  { href: "/user/basic/default", label: "User · Basic · Default" },
  { href: "/user/basic/loading", label: "User · Basic · Loading" },
  { href: "/user/basic/results", label: "User · Basic · Results" },
  { href: "/user/basic/empty", label: "User · Basic · Empty" },
  { href: "/user/advanced/default", label: "User · Advanced · Default" },
  { href: "/user/advanced/validation", label: "User · Advanced · Validation" },
  { href: "/user/advanced/results", label: "User · Advanced · Results" },
  { href: "/transaction/details", label: "Transaction Details" },
  { href: "/export/success", label: "Export Success" },
];

function protoNav(currentHref) {
  return `<nav class="proto-nav">
    <span class="proto-tag">Prototype nav — not part of design</span>
    <a href="/">All Screens</a>
    <span class="sep">/</span>
    <span>${esc(currentHref)}</span>
  </nav>`;
}

function pageShell({ href, title, frameId, bodyHtml, extraHead = "" }) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} — Paid Prototype</title>
<link rel="stylesheet" href="/assets/css/tokens.css" />
<link rel="stylesheet" href="/assets/css/base.css" />
<link rel="stylesheet" href="/assets/css/components.css" />
${extraHead}
</head>
<body>
${protoNav(href)}
<div class="frame" id="${frameId}">
  <div class="frame-inner">
${bodyHtml}
  </div>
</div>
<script src="/assets/js/app.js"></script>
</body>
</html>
`;
}

function headerBlock(role, mode) {
  const roleLabel = role === "admin" ? "Администратор" : "Клиент";
  const otherRole = role === "admin" ? "user" : "admin";
  return `<div class="app-header">
    <h1 class="page-title text-h1">Список платежей</h1>
    <div class="header-meta">
      <span class="role-badge role-${role}"><span class="dot"></span>Роль: ${roleLabel}</span>
      <a class="role-switch-link" href="/${otherRole}/${mode}/default">Переключить на ${otherRole === "admin" ? "Администратора" : "Клиента"}</a>
      <div class="mode-tabs">
        <a class="${mode === "basic" ? "active" : ""}" href="/${role}/basic/default">Простой</a>
        <a class="${mode === "advanced" ? "active" : ""}" href="/${role}/advanced/default">Расширенный</a>
      </div>
    </div>
  </div>`;
}

function buildSearchScreen(role, mode, state) {
  const fieldMapKey = `${role}${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
  const data = fieldMaps[fieldMapKey];
  const opts = { errorField: state === "validation" ? "Сумма" : null };
  const groupsHtml = data.groups.map((g) => renderGroup(g, opts)).join("");
  const validationBanner = state === "validation"
    ? `<div class="field-error" style="margin-bottom:12px;font-size:13px;">Форма содержит ошибки. Проверьте выделенные поля.</div>`
    : "";

  let resultsHtml = "";
  if (mode === "basic") {
    if (state !== "default") {
      resultsHtml = `<div class="section-block">
        <div class="results-toolbar"><h2 class="text-h2">Результаты поиска</h2></div>
        ${renderTable(role, state === "loading" ? "loading" : state === "empty" ? "empty" : "populated")}
      </div>`;
    } else {
      resultsHtml = `<div class="section-block empty-state">
        <div class="hint text-body-sm">Задайте параметры поиска и нажмите «Искать» — результаты появятся здесь.</div>
      </div>`;
    }
  } else {
    if (state === "results") {
      resultsHtml = `<div class="section-block">
        <div class="results-toolbar"><h2 class="text-h2">Результаты поиска</h2></div>
        ${renderTable(role, "populated")}
      </div>`;
    } else {
      resultsHtml = `<div class="section-block empty-state">
        <div class="hint text-body-sm">Задайте параметры поиска и нажмите «Искать» — результаты появятся здесь.</div>
      </div>`;
    }
  }

  const body = `<div class="content-narrow">
    ${headerBlock(role, mode)}
    <div class="search-panel">
      ${validationBanner}
      ${groupsHtml}
      ${renderFooter(data.footer, mode, role)}
    </div>
  </div>
  ${resultsHtml}`;

  const title = `${role === "admin" ? "Admin" : "User"} · ${mode === "basic" ? "Basic" : "Advanced"} · ${state}`;
  writeFile(`${role}/${mode}/${state}/index.html`, pageShell({
    href: `/${role}/${mode}/${state}`,
    title,
    frameId: `frame-${role}-${mode}-${state}`,
    bodyHtml: body,
  }));
}

// ---------------------------------------------------------------------------
// Transaction Details + Export Success
// ---------------------------------------------------------------------------
function buildTransactionDetails() {
  const row = SAMPLE_ROWS[0];
  const tableBg = `<div class="content-narrow">
    ${headerBlock("admin", "basic")}
    <div class="search-panel" style="opacity:.5;pointer-events:none;">
      ${fieldMaps.adminBasic.groups.map((g) => renderGroup(g, {})).join("")}
      ${renderFooter(fieldMaps.adminBasic.footer, "basic", "admin")}
    </div>
  </div>
  <div class="section-block" style="opacity:.5;pointer-events:none;">
    <div class="results-toolbar"><h2 class="text-h2">Результаты поиска</h2></div>
    ${renderTable("admin", "populated")}
  </div>`;

  const drawer = `<div class="drawer-overlay"></div>
  <div class="drawer">
    <div class="drawer-header">
      <h2 class="text-h2">Детали транзакции</h2>
      <a class="drawer-close" href="/admin/basic/results">${ICONS.close}</a>
    </div>
    <div class="drawer-body">
      <h3 class="drawer-section-title text-caption text-overline">Операция</h3>
      <div class="drawer-field"><span class="k">UID операции</span><span class="v mono">${row.uid}</span></div>
      <div class="drawer-field"><span class="k">Трекинг ID</span><span class="v mono">${row.tracking}</span></div>
      <div class="drawer-field"><span class="k">Дата и время</span><span class="v">${row.date}</span></div>
      <div class="drawer-field"><span class="k">Описание платежа</span><span class="v">${esc(row.desc)}</span></div>
      <div class="drawer-field"><span class="k">Тип транзакции</span><span class="v">${esc(row.type)}</span></div>
      <div class="drawer-field"><span class="k">Статус</span><span class="v">${statusBadge(row)}</span></div>
      <h3 class="drawer-section-title text-caption text-overline">Платёж</h3>
      <div class="drawer-field"><span class="k">Сумма</span><span class="v mono">${row.amount}</span></div>
      <div class="drawer-field"><span class="k">Способ оплаты</span><span class="v">${row.method}</span></div>
      <div class="drawer-field"><span class="k">Хэш карты</span><span class="v mono">a1e4•••••••c92f</span></div>
      <h3 class="drawer-section-title text-caption text-overline">Плательщик</h3>
      <div class="drawer-field"><span class="k">Плательщик</span><span class="v">${row.payer}</span></div>
      <div class="drawer-field"><span class="k">IP клиента</span><span class="v mono">91.2xx.xx.xx7</span></div>
      <h3 class="drawer-section-title text-caption text-overline">Обработка</h3>
      <div class="drawer-field"><span class="k">Процессор</span><span class="v">${esc(row.processor)}</span></div>
      <div class="drawer-field"><span class="k">Магазин/Мерчант</span><span class="v">${esc(row.merchant)}</span></div>
      <div class="drawer-field"><span class="k">Фрод-маркер</span><span class="v">${row.fraud}</span></div>
      <div class="drawer-field"><span class="k">Тестовая транзакция</span><span class="v">${row.test}</span></div>
    </div>
  </div>`;

  writeFile("transaction/details/index.html", pageShell({
    href: "/transaction/details",
    title: "Transaction Details",
    frameId: "frame-transaction-details",
    bodyHtml: tableBg + drawer,
  }));
}

function buildExportSuccess() {
  const body = `<div class="content-narrow">
    ${headerBlock("admin", "basic")}
    <div class="search-panel">
      ${fieldMaps.adminBasic.groups.map((g) => renderGroup(g, {})).join("")}
      ${renderFooter(fieldMaps.adminBasic.footer, "basic", "admin")}
    </div>
  </div>
  <div class="section-block">
    <div class="results-toolbar"><h2 class="text-h2">Результаты поиска</h2></div>
    ${renderTable("admin", "populated")}
  </div>
  <div class="toast">
    <span class="toast-icon">${ICONS.toastCheck}</span>
    <div>
      <div class="toast-title">Экспорт завершён</div>
      <div class="toast-body">Файл payments_export_21-07-2026.xlsx успешно сформирован</div>
    </div>
    <a class="toast-close" href="/admin/basic/results">${ICONS.close}</a>
  </div>`;

  writeFile("export/success/index.html", pageShell({
    href: "/export/success",
    title: "Export Success",
    frameId: "frame-export-success",
    bodyHtml: body,
  }));
}

// ---------------------------------------------------------------------------
// Cover page
// ---------------------------------------------------------------------------
function buildCover() {
  const body = `<div style="padding:64px 0;text-align:center;">
    <div class="text-overline text-muted" style="margin-bottom:16px;">Paid · Internal Payment Operations Console</div>
    <h1 class="text-display" style="margin:0 0 16px;">Список платежей</h1>
    <p class="text-body text-secondary" style="max-width:640px;margin:0 auto 32px;">
      Прототип внутренней консоли для поиска, просмотра и экспорта платёжных транзакций.
      Единая система компонентов, две роли — Администратор и Клиент.
    </p>
    <div class="swatch-row" style="justify-content:center;">
      <span class="role-badge role-admin"><span class="dot"></span>Администратор — расширенный доступ</span>
      <span class="role-badge role-user"><span class="dot"></span>Клиент — ограниченный доступ</span>
    </div>
    <div style="margin-top:48px;" class="swatch-row" style="justify-content:center;">
      <a class="btn btn-primary" href="/">Все экраны</a>
      <a class="btn btn-secondary" href="/admin/basic/default">Admin · Basic</a>
      <a class="btn btn-secondary" href="/user/basic/default">User · Basic</a>
      <a class="btn btn-secondary" href="/design-system">Дизайн-система</a>
    </div>
  </div>`;
  writeFile("cover/index.html", pageShell({ href: "/cover", title: "Cover", frameId: "frame-cover", bodyHtml: body }));
}

// ---------------------------------------------------------------------------
// Design system page
// ---------------------------------------------------------------------------
function buildDesignSystem() {
  const colorGroups = {
    Surfaces: ["bg/canvas", "surface/default", "surface/subtle", "surface/sunken", "surface/hover"],
    Text: ["text/primary", "text/secondary", "text/muted", "text/inverse"],
    Borders: ["border/default", "border/strong", "border/contrast"],
    Action: ["action/primary", "action/primary-hover", "focus/ring"],
    Disabled: ["disabled/bg", "disabled/border", "disabled/text"],
    "Role accents": ["accent/admin", "accent/admin-bg", "accent/user", "accent/user-bg"],
    Status: ["status/success", "status/success-bg", "status/warning", "status/warning-bg", "status/error", "status/error-bg", "status/info", "status/info-bg"],
  };

  const colorSection = Object.entries(colorGroups).map(([groupName, keys]) => `
    <h3 class="text-h3" style="margin-top:20px;">${groupName}</h3>
    <div class="swatch-row">
      ${keys.map((k) => `<div class="color-chip"><div class="swatch" style="background:var(--color-${k.replace(/\//g, "-")})"></div><div class="swatch-label">${k}</div></div>`).join("")}
    </div>`).join("");

  const typeSection = Object.keys(tokens.typography.styles).map((name) => {
    const cls = `text-${name.toLowerCase()}`;
    return `<div style="margin-bottom:10px;" class="${cls}">${name} — Список платежей</div>`;
  }).join("");

  // State grid mirrors docs/Group 1.png: columns = Default / Hover / Focus / Disabled
  const stateHead = (cols) => `<div class="state-grid-head">${cols.map((c) => `<span>${c}</span>`).join("")}</div>`;
  const btnRow = (style) => `<div class="state-grid">
    <button class="btn btn-${style}">Искать</button>
    <button class="btn btn-${style} is-hover">Искать</button>
    <button class="btn btn-${style} is-focus">Искать</button>
    <button class="btn btn-${style}" disabled>Искать</button>
  </div>`;
  const buttonSection = `${stateHead(["Default", "Hover", "Focus", "Disabled"])}
  ${btnRow("primary")}
  ${btnRow("secondary")}
  ${btnRow("ghost")}
  <div class="swatch-row" style="margin-top:16px;align-items:center;">
    <button class="btn btn-primary btn-sm">Sm</button>
    <button class="btn btn-primary">Md</button>
    <button class="btn btn-primary btn-lg">Lg</button>
    <button class="btn btn-destructive">Удалить</button>
  </div>`;

  const inputSection = `${stateHead(["Default", "Hover", "Focus", "Filled", "Disabled", "Error"])}
  <div class="state-grid">
    <div class="field-wrap"><input class="field-input" placeholder="UID операции"/></div>
    <div class="field-wrap"><input class="field-input is-hover" placeholder="UID операции"/></div>
    <div class="field-wrap"><input class="field-input is-focus" placeholder="UID операции"/></div>
    <div class="field-wrap"><input class="field-input filled" value="OP-2026-114872"/></div>
    <div class="field-wrap"><input class="field-input" placeholder="UID операции" disabled/></div>
    <div class="field-wrap"><input class="field-input has-error filled" value="12ab"/><div class="field-error">Введите корректное значение поля</div></div>
  </div>`;

  const sel = (cls, text) => `<div class="field-wrap"><div class="field-select${cls}"><span>${text}</span>${ICONS.chevron}</div></div>`;
  const selectSection = `${stateHead(["Default", "Hover", "Focus", "Filled", "Disabled", "Error"])}
  <div class="state-grid">
    ${sel("", "Выберите статус")}
    ${sel(" is-hover", "Выберите статус")}
    ${sel(" is-focus", "Выберите статус")}
    ${sel(" filled", "Успешно")}
    ${sel(" is-disabled", "Выберите статус")}
    ${sel(" has-error", "Выберите статус")}
  </div>
  <div class="state-grid" style="margin-top:8px;padding-bottom:132px;">
    <div class="field-wrap">
      <div class="field-select is-open"><span>Выберите статус</span>${ICONS.chevron}</div>
      <div class="select-panel"><div class="opt active">Успешно</div><div class="opt">В обработке</div><div class="opt">Отклонена</div></div>
    </div>
  </div>`;

  const checkboxSection = `<div class="swatch-row">
    ${renderCheckbox("Не выбрано", false)}
    ${renderCheckbox("Выбрано", true)}
    <label class="checkbox disabled"><span class="box"></span><span>Отключено</span></label>
  </div>`;

  const tooltipSection = `<div class="swatch-row" style="gap:64px;padding-top:8px;">
    <div class="field-wrap" style="flex:none;width:220px;"><input class="field-input is-cardnum" placeholder="xxxx xxxx xxxx 1234"/><div class="tooltip tooltip-persistent">введите последние 4 цифры карты</div></div>
  </div>`;

  const badgeSection = `<div class="swatch-row">
    <span class="status-badge success">${ICONS.statusDotSuccess}Одобрена</span>
    <span class="status-badge warning">${ICONS.statusDotSuccess}В обработке</span>
    <span class="status-badge error">${ICONS.statusDotSuccess}Отклонена</span>
    <span class="status-badge info">${ICONS.statusDotSuccess}Возврат</span>
    <span class="status-badge neutral">${ICONS.statusDotSuccess}Отменена</span>
  </div>`;

  const skeletonSection = `<div style="max-width:400px;"><span class="skeleton-block" style="width:100%;height:14px;display:block;margin-bottom:8px;"></span><span class="skeleton-block" style="width:80%;height:14px;display:block;margin-bottom:8px;"></span><span class="skeleton-block" style="width:60%;height:14px;display:block;"></span></div>`;

  const emptyStateSection = `<div class="empty-state" style="border:1px solid var(--color-border-default);border-radius:var(--radius-lg);"><div class="icon">${ICONS.search}</div><div class="title">Нет результатов</div><div class="hint text-body-sm">По заданным параметрам поиска ничего не найдено.</div></div>`;

  const toastSection = `<div style="position:relative;height:90px;"><div class="toast" style="position:absolute;">${ICONS.toastCheck}<div><div class="toast-title">Экспорт завершён</div><div class="toast-body">Файл успешно сформирован</div></div></div></div>`;

  const body = `<div class="app-header"><h1 class="page-title text-h1">Дизайн-система — Paid</h1></div>
  <div class="section-block"><h2 class="text-h2">Цвет</h2>${colorSection}</div>
  <div class="section-block"><h2 class="text-h2">Типографика</h2>${typeSection}</div>
  <div class="section-block"><h2 class="text-h2">Button</h2>${buttonSection}</div>
  <div class="section-block"><h2 class="text-h2">Text Input</h2>${inputSection}</div>
  <div class="section-block"><h2 class="text-h2">Select / Dropdown</h2>${selectSection}</div>
  <div class="section-block"><h2 class="text-h2">Checkbox</h2>${checkboxSection}</div>
  <div class="section-block"><h2 class="text-h2">Tooltip</h2>${tooltipSection}</div>
  <div class="section-block"><h2 class="text-h2">Status Badge</h2>${badgeSection}</div>
  <div class="section-block"><h2 class="text-h2">Table Header / Row / Pagination</h2>${renderTable("admin", "populated")}</div>
  <div class="section-block"><h2 class="text-h2">Loading Skeleton</h2>${skeletonSection}</div>
  <div class="section-block"><h2 class="text-h2">Empty State</h2>${emptyStateSection}</div>
  <div class="section-block"><h2 class="text-h2">Toast</h2>${toastSection}</div>`;

  writeFile("design-system/index.html", pageShell({ href: "/design-system", title: "Design System", frameId: "frame-design-system", bodyHtml: body }));
}

// ---------------------------------------------------------------------------
// All Screens index
// ---------------------------------------------------------------------------
function buildIndex() {
  const items = ALL_ROUTES.map((r) => `<li><a class="swatch-card" style="display:block;" href="${r.href}">${esc(r.label)}<div class="swatch-label">${r.href}</div></a></li>`).join("");
  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>All Screens — Paid Prototype</title>
<link rel="stylesheet" href="/assets/css/tokens.css" />
<link rel="stylesheet" href="/assets/css/base.css" />
<link rel="stylesheet" href="/assets/css/components.css" />
<style>
  body { padding: 48px; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; max-width: 1280px; }
  ul a:hover { border-color: var(--color-border-strong); }
</style>
</head>
<body>
<h1 class="text-h1">All Screens</h1>
<p class="text-body-sm text-secondary">Paid — Internal Payment Operations Console. ${ALL_ROUTES.length} routes.</p>
<ul>${items}</ul>
</body>
</html>
`;
  writeFile("index.html", html);
}

// ---------------------------------------------------------------------------
// app.js — minimal progressive enhancement (select-open toggle on live click)
// ---------------------------------------------------------------------------
const appJs = `// Minimal progressive enhancement for local click-through only.
// Every state required for Figma import already exists as its own static route;
// this script only makes local browsing feel a little more alive.
document.querySelectorAll(".field-select").forEach((el) => {
  el.addEventListener("click", () => el.classList.toggle("is-open"));
});
`;

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
writeFile("assets/css/tokens.css", buildTokensCss());
writeFile("assets/css/base.css", baseCss);
writeFile("assets/css/components.css", componentsCss);
writeFile("assets/js/app.js", appJs);

for (const role of ["admin", "user"]) {
  for (const state of ["default", "loading", "results", "empty"]) buildSearchScreen(role, "basic", state);
  for (const state of ["default", "validation", "results"]) buildSearchScreen(role, "advanced", state);
}
buildCover();
buildDesignSystem();
buildTransactionDetails();
buildExportSuccess();
buildIndex();

console.log(`Site generated at ${SITE_DIR}`);

// ---------------------------------------------------------------------------
// Figma-import export — self-contained duplicates of every page above, with
// the three linked stylesheets inlined into a single <style> block and the
// local-preview-only <script> tag stripped. Many HTML-to-Figma importers
// only read one file at a time and don't follow <link rel="stylesheet">,
// so this is the set to hand to the importer; /site stays link-based for
// local browsing (`npm start` / http.server) and stays untouched.
// ---------------------------------------------------------------------------
const FIGMA_DIR = path.join(ROOT, "site-figma-export");
const combinedCss = [buildTokensCss(), baseCss, componentsCss].join("\n");
const LINK_TAGS_RE = /<link rel="stylesheet" href="\/assets\/css\/tokens\.css" \/>\n<link rel="stylesheet" href="\/assets\/css\/base\.css" \/>\n<link rel="stylesheet" href="\/assets\/css\/components\.css" \/>/;
const SCRIPT_TAG_RE = /<script src="\/assets\/js\/app\.js"><\/script>\n?/;

function collectHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectHtmlFiles(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function buildFigmaExport() {
  const htmlFiles = collectHtmlFiles(SITE_DIR);
  for (const file of htmlFiles) {
    const rel = path.relative(SITE_DIR, file);
    let html = fs.readFileSync(file, "utf8");
    html = html.replace(LINK_TAGS_RE, `<style>\n${combinedCss}\n</style>`);
    html = html.replace(SCRIPT_TAG_RE, "");
    const outPath = path.join(FIGMA_DIR, rel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, "utf8");
  }
  console.log(`Figma-import export (self-contained HTML, CSS inlined) written to ${FIGMA_DIR} — ${htmlFiles.length} files`);
}
buildFigmaExport();
