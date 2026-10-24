// Paid console — live MVP controller. Rendering is delegated to screens.js
// (shared with the static Figma screens); this file owns state changes,
// routing, keyboard/mouse behaviour, tooltips, dialogs, toasts and exports.
import * as D from "./data.js";
import * as UI from "./ui.js";
import * as S from "./screens.js";
import { buildXlsx, buildCsv } from "./xlsx.js";

const SPEC = JSON.parse(document.getElementById("console-spec").textContent);
S.setSpec(SPEC);
const state = S.createState(D.createData());
state.ui.files = {};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const cssEsc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/"/g, '\\"'));
const TEST_KEY = "Тестовые транзакции";

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function render(focusSel) {
  closeListbox();
  hideTooltip();
  $("#sidebar-root").innerHTML = S.renderSidebar(state);
  $("#main").innerHTML = S.renderMain(state);
  afterRender();
  document.title = `${S.layout(state).title} — Paid`;
  if (focusSel) $(focusSel)?.focus();
}

function renderResults(focusSel) {
  hideTooltip();
  $("#results").innerHTML = S.renderResults(state);
  afterRender();
  if (focusSel) $(focusSel)?.focus();
}

function afterRender() {
  const pc = $("#check-page");
  if (pc) pc.indeterminate = pc.dataset.indeterminate === "true";
}

function announce(text) {
  const el = $("#sr-status");
  el.textContent = "";
  setTimeout(() => { el.textContent = text; }, 50);
}

const L = () => S.layout(state);
const F = () => S.form(state);
const LS = () => S.list(state);

// screens that show data without pressing a button
function ensureResults() {
  const l = L();
  if ((l.autoload || l.live) && LS().results === null) LS().results = S.query(state);
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------
function go(over) {
  location.hash = S.routeHash(state, over);
}

function onRoute(first = false) {
  const prev = `${state.ws}/${state.screen}/${state.mode}/${state.tab}`;
  S.applyRoute(state, S.parseHash(location.hash));
  const now = `${state.ws}/${state.screen}/${state.mode}/${state.tab}`;
  if (!first && now === prev) return;
  closeDrawer(false);
  ensureResults();
  const active = document.activeElement;
  const focus = active?.id === "adv-toggle" ? "#adv-toggle"
    : active?.dataset?.mode ? `[data-mode="${state.mode}"]`
    : active?.dataset?.tab ? `#tab-${state.tab}`
    : first ? null : ".page-title";
  render(focus);
  if (focus === ".page-title") $(".page-title")?.setAttribute("tabindex", "-1");
  if (focus === ".page-title") $(".page-title")?.focus();
}

window.addEventListener("hashchange", () => onRoute());

// ---------------------------------------------------------------------------
// Errors in place (no re-render while typing)
// ---------------------------------------------------------------------------
function clearError(key, scope = $("#screen-form"), errors = F().errors, bannerId = "form-banner") {
  if (!errors[key]) return;
  delete errors[key];
  const wrap = scope && $(`[data-name="${cssEsc(key)}"]`, scope);
  if (wrap) {
    const control = $("[data-field], [data-edit-field], [data-drawer-field]", wrap);
    control?.classList.remove("has-error");
    control?.removeAttribute("aria-invalid");
    const err = $(".field-error", wrap);
    if (err) { err.hidden = true; err.textContent = ""; }
  }
  const banner = document.getElementById(bannerId);
  const n = Object.keys(errors).length;
  if (banner) banner.textContent = n ? `Форма содержит ошибки (${n}). Проверьте выделенные поля.` : "";
}

function showErrors(focusFirst = true) {
  render();
  if (focusFirst) $("#main [aria-invalid='true']")?.focus();
}

// ---------------------------------------------------------------------------
// Search & screen actions
// ---------------------------------------------------------------------------
async function runSearch() {
  closeListbox();
  const f = F();
  f.errors = S.validate(state);
  if (Object.keys(f.errors).length) { showErrors(); return; }

  if (state.screen === "tx-edit") return findTransaction();
  if (state.screen === "resend") return sendNotifications();

  const ls = LS();
  ls.loading = true;
  ls.page = 1;
  ls.selected.clear();
  render();
  const btn = $("#btn-search");
  if (btn) { btn.setAttribute("aria-busy", "true"); btn.textContent = "Поиск…"; }
  await delay(550);
  ls.results = S.query(state);
  ls.loading = false;
  render();
  const n = ls.results.length;
  announce(n ? `Найдено записей: ${n}` : "Ничего не найдено");
}

function findTransaction() {
  const f = F();
  const uid = String(f.values["UID операции"] || "").trim();
  const p = state.data.payments.find((x) => x.uid.toLowerCase() === uid.toLowerCase());
  if (!p) {
    f.errors["UID операции"] = uid ? "Операция не найдена" : "Введите UID операции";
    showErrors();
    return;
  }
  LS().found = p.uid;
  const ef = S.form(state, `${S.formKey(state)}:edit`);
  ef.values = S.editDefaults(p);
  ef.errors = {};
  render("#edit-title");
  $("#edit-title")?.setAttribute("tabindex", "-1");
  $("#edit-title")?.focus();
  announce(`Найдена операция ${p.uid}`);
}

function sendNotifications() {
  const f = F();
  const uids = String(f.values["UIDs"] || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const email = String(f.values["Email"] || "").trim();
  if (!uids.length && !email) {
    f.errors["UIDs"] = "Укажите хотя бы один UID или e-mail";
    showErrors();
    return;
  }
  const rows = [];
  const seen = new Set();
  const push = (uid, p) => {
    if (seen.has(uid)) return;
    seen.add(uid);
    const shop = p && D.SHOPS.find((s) => s.name === p.shop);
    rows.push({ uid, merchant: p ? p.merchant : "—", url: p ? `${shop && shop.url !== "—" ? shop.url : "https://merchant.example"}/paid/notify` : "—", status: p ? "Отправлено" : "Не найдено" });
  };
  uids.forEach((u) => push(u, state.data.payments.find((p) => p.uid.toLowerCase() === u.toLowerCase())));
  if (email) state.data.payments.filter((p) => p.email.toLowerCase() === email.toLowerCase()).forEach((p) => push(p.uid, p));
  LS().sent = rows;
  render();
  const ok = rows.filter((r) => r.status === "Отправлено").length;
  toast(ok
    ? { title: "Уведомления отправлены", body: `${ok} из ${rows.length}${rows.length > ok ? " — часть UID не найдена" : ""}` }
    : { kind: "warning", title: "Ничего не отправлено", body: email && !uids.length ? "По этому e-mail операций не найдено." : "Ни один UID не найден." });
}

function applyTxEdit(action) {
  const key = `${S.formKey(state)}:edit`;
  const ef = S.form(state, key);
  const fields = SPEC.screens["tx-edit"].edit.map(UI.parseField).filter((f) => f.type !== "radio");
  const p = state.data.payments.find((x) => x.uid === LS().found);
  if (action !== "notify") {
    ef.errors = S.validate(state, fields.filter((f) => ef.values[f.name] || ["RRN", "Payment date"].includes(f.name)).map((f) => ({ ...f, required: ["RRN", "Payment date"].includes(f.name) })), ef.values);
    if (Object.keys(ef.errors).length) {
      render();
      const banner = $("#edit-banner");
      if (banner) banner.textContent = `Исправьте поля (${Object.keys(ef.errors).length}).`;
      $("#main .edit-block [aria-invalid='true']")?.focus();
      return;
    }
    p.status = ef.values["Статус"] === "failed" ? "Отклонена" : "Одобрена";
    p.rnn = ef.values["RRN"];
    p.bankCode = ef.values["Bank code"];
    p.createdAt = Date.parse(ef.values["Payment date"]);
    p.settledAt = ef.values["Settled date"] ? Date.parse(ef.values["Settled date"]) : null;
  }
  render(`[data-action="${action}"]`);
  const shop = D.SHOPS.find((s) => s.name === p.shop);
  if (action === "update") toast({ title: "Транзакция обновлена", body: `${p.uid}: статус «${p.status}»` });
  else if (action === "update-notify") toast({ title: "Обновлено, мерчант уведомлён", body: `${p.uid} → ${p.merchant}` });
  else toast({ title: "Уведомление отправлено", body: `${p.merchant}${shop && shop.url !== "—" ? ` · ${shop.url}` : ""}` });
}

function clearScreen(focusSel = '[data-action="clear"]') {
  const key = S.formKey(state);
  delete state.forms[key];
  const ls = LS();
  if (state.screen === "tx-edit") { ls.found = null; delete state.forms[`${key}:edit`]; }
  if (state.screen === "resend") ls.sent = null;
  if (state.screen === "mass-payouts/new") state.ui.files = {};
  if (L().live) ls.results = S.query(state);
  render(focusSel);
  announce("Поля очищены");
}

function exportRows(kind) {
  const ls = LS();
  if (ls.loading) return;
  if (ls.results === null) {
    toast({ kind: "warning", title: "Нечего экспортировать", body: "Сначала выполните поиск — в файл попадут найденные записи." });
    return;
  }
  const all = S.sorted(state);
  const rows = ls.selected.size ? all.filter((r) => ls.selected.has(r.uid)) : all;
  if (!rows.length) {
    toast({ kind: "warning", title: "Нечего экспортировать", body: "По текущему запросу нет записей." });
    return;
  }
  const t = S.exportTable(state, rows);
  const table = [t.headers, ...t.rows];
  const d = new Date();
  const base = `${L().kind === "reports" ? "report" : "payments"}_export_${D.pad(d.getDate())}-${D.pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  const name = `${base}.${kind}`;
  download(kind === "csv" ? buildCsv(table) : buildXlsx(L().kind === "reports" ? "Отчёт" : "Платежи", table), name);
  const n = rows.length;
  toast({ title: "Экспорт завершён", body: `${name} — ${n} ${D.plural(n, "строка", "строки", "строк")}${ls.selected.size ? " (выбранные)" : ""}` });
}

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function toggleFlag(uid) {
  const r = state.data.payments.find((x) => x.uid === uid);
  const marked = r.fraud === "—";
  r.fraud = marked ? "Проверка" : "—";
  renderResults(`[data-action="flag"][data-uid="${uid}"]`);
  toast(marked
    ? { kind: "info", title: "Операция отмечена", body: `${uid} отправлена на проверку фрод-аналитику` }
    : { kind: "info", title: "Отметка снята", body: `${uid} больше не помечена как подозрительная` });
}

function saveUser() {
  const f = F();
  const fields = SPEC.screens["users/new"].form.map(UI.parseField);
  f.errors = S.validate(state, fields, f.values);
  if (Object.keys(f.errors).length) { showErrors(); return; }
  const roles = D.ROLES.filter((r) => f.values[`role:${r}`]);
  const users = state.data.users;
  const editing = users.find((u) => u.id === state.ui.editUser);
  if (editing) Object.assign(editing, { name: f.values["Имя пользователя"].trim(), email: f.values["Email"].trim(), roles, active: Boolean(f.values["Активирован"]) });
  else users.push({ id: `U-${11 + users.length}`, name: f.values["Имя пользователя"].trim(), email: f.values["Email"].trim(), roles, active: Boolean(f.values["Активирован"]), createdAt: Date.now() });
  toast({ title: editing ? "Пользователь обновлён" : "Пользователь добавлен", body: `${f.values["Имя пользователя"]} · ${roles.join(", ")}` });
  delete state.forms[S.formKey(state)];
  state.ui.editUser = null;
  S.list(state, `${state.ws}:users`).results = null;
  go({ screen: "users" });
}

function editUser(id) {
  const u = state.data.users.find((x) => x.id === id);
  state.ui.editUser = id;
  const values = { "Имя пользователя": u.name, "Email": u.email, "Активирован": u.active };
  u.roles.forEach((r) => { values[`role:${r}`] = true; });
  state.forms[`${state.ws}:users/new`] = { values, errors: {} };
  go({ screen: "users/new" });
}

function saveMassPayout() {
  const f = F();
  f.errors = S.validate(state);
  if (Object.keys(f.errors).length) { showErrors(); return; }
  const file = state.ui.files["Файл выплат"];
  const finish = (rowsCount) => {
    const d = state.data;
    d.massPayouts.unshift({
      id: `MP-${181 + d.massPayouts.length}`, file: file.name, merchant: f.values["Торговец"], shop: f.values["Магазин"],
      email: f.values["E-mail получателя отчёта"], rowsCount, amount: 0, currency: "BYN", status: "В обработке", createdAt: Date.now(),
    });
    toast({ title: "Массовые выплаты созданы", body: `${file.name} — отчёт придёт на ${f.values["E-mail получателя отчёта"]}` });
    delete state.forms[S.formKey(state)];
    state.ui.files = {};
    S.list(state, `${state.ws}:mass-payouts`).results = null;
    go({ screen: "mass-payouts" });
    setTimeout(() => runSearch(), 0);
  };
  if (/\.csv$/i.test(file.name) && file.text) file.text().then((t) => finish(Math.max(0, t.split(/\r?\n/).filter(Boolean).length - 1))).catch(() => finish(null));
  else finish(null);
}

function downloadReport(id) {
  const r = state.data.finReports.find((x) => x.id === id);
  const rows = state.data.payments.filter((p) => p.merchant === r.merchant && !p.test);
  const table = [["UID операции", "Дата", "Тип", "Статус", "Сумма", "Валюта"], ...rows.map((p) => [p.uid, D.fmtDate(p.createdAt, D.DEFAULT_TZ, true), p.type, p.status, p.amount, p.currency])];
  download(buildXlsx("Отчёт", table), `${r.id}.xlsx`);
  toast({ title: "Отчёт скачан", body: `${r.title} · ${r.merchant}` });
}

// ---------------------------------------------------------------------------
// Drawers (payment details, create forms) — modal dialog with focus trap
// ---------------------------------------------------------------------------
let drawerReturnFocus = null;

function openDrawer(html, focusSel = ".drawer-close") {
  if (!$("#drawer-root").firstChild) drawerReturnFocus = document.activeElement;
  hideTooltip();
  closeListbox();
  $("#drawer-root").innerHTML = html;
  document.body.classList.add("has-drawer");
  $(focusSel)?.focus();
}

function closeDrawer(restore = true) {
  if (!$("#drawer-root").firstChild) return;
  $("#drawer-root").innerHTML = "";
  document.body.classList.remove("has-drawer");
  state.ui.drawer = null;
  if (restore && drawerReturnFocus && document.contains(drawerReturnFocus)) drawerReturnFocus.focus();
}

function openCreate(kind, category) {
  state.ui.drawer = { kind, category };
  delete state.forms[`drawer:${kind}`];
  openDrawer(S.createDrawer(kind, state), "#drawer-root [data-drawer-field]");
}

function saveCreate(kind) {
  const f = S.form(state, `drawer:${kind}`);
  f.errors = S.validate(state, S.DRAWER_FIELDS[kind], f.values);
  if (kind === "ad" && !f.errors["По"] && f.values["С"] && f.values["По"] && D.parseDate(f.values["По"]) < D.parseDate(f.values["С"])) f.errors["По"] = "Дата «По» не может быть раньше даты «С»";
  if (Object.keys(f.errors).length) {
    $("#drawer-root").innerHTML = S.createDrawer(kind, state);
    $("#drawer-banner").textContent = `Исправьте поля (${Object.keys(f.errors).length}).`;
    $("#drawer-root [aria-invalid='true']")?.focus();
    return;
  }
  const d = state.data;
  if (kind === "ad") {
    const start = D.parseDate(f.values["С"]), end = D.parseDate(f.values["По"]) + D.DAY - 1;
    d.ads.unshift({ id: `AD-${50 + d.ads.length}`, title: f.values["Название"].trim(), category: { "PSP": "PSP", "Торговец": "Торговцы", "Шлюз": "Шлюзы" }[state.ui.drawer.category], target: f.values["Получатель"], start, end, status: end < Date.now() ? "Закончена" : start > Date.now() ? "Неактивна" : "Активна", views: 0 });
    toast({ title: "Реклама создана", body: f.values["Название"] });
  } else {
    d.merchants.unshift({ id: `M-${1001 + d.merchants.length}`, name: f.values["Название"].trim(), company: f.values["Компания"].trim(), email: f.values["Email"].trim(), active: true, shops: [], shopsCount: 0, createdAt: Date.now() });
    toast({ title: "Торговец создан", body: f.values["Название"] });
  }
  delete state.forms[`drawer:${kind}`];
  closeDrawer();
  LS().results = S.query(state);
  renderResults();
}

function trapFocus(e) {
  const drawer = $(".drawer");
  if (!drawer || e.key !== "Tab") return;
  const focusables = $$('button, [href], input:not([type="hidden"]), textarea, [tabindex]:not([tabindex="-1"])', drawer).filter((el) => !el.closest("[hidden]"));
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
function toast(t) {
  const wrap = document.createElement("div");
  wrap.innerHTML = UI.toast(t);
  const el = wrap.firstElementChild;
  const dismiss = () => el.remove();
  el.querySelector(".toast-close").addEventListener("click", dismiss);
  $(".toast-region").append(el);
  setTimeout(dismiss, 6000);
}

// ---------------------------------------------------------------------------
// Select (APG select-only combobox, single + multi)
// ---------------------------------------------------------------------------
let openSelect = null;

function openListbox(box) {
  closeListbox();
  hideTooltip();
  const panel = document.getElementById(box.getAttribute("aria-controls"));
  const opts = $$('[role="option"]', panel);
  panel.hidden = false;
  panel.classList.remove("is-above");
  const rect = box.getBoundingClientRect();
  if (rect.bottom + panel.offsetHeight + 8 > window.innerHeight && rect.top > panel.offsetHeight + 8) panel.classList.add("is-above");
  box.setAttribute("aria-expanded", "true");
  box.classList.add("is-open");
  const idx = Math.max(0, opts.findIndex((o) => o.getAttribute("aria-selected") === "true"));
  openSelect = { box, panel, opts, idx, typed: "", typedAt: 0, multi: panel.classList.contains("is-multi") };
  setActive(idx);
}

function setActive(i) {
  const s = openSelect;
  s.idx = Math.min(Math.max(0, i), s.opts.length - 1);
  s.opts.forEach((o, j) => o.classList.toggle("active", j === s.idx));
  s.box.setAttribute("aria-activedescendant", s.opts[s.idx].id);
  s.opts[s.idx].scrollIntoView({ block: "nearest" });
}

function closeListbox(focus = false) {
  if (!openSelect) return;
  const { box, panel } = openSelect;
  panel.hidden = true;
  box.setAttribute("aria-expanded", "false");
  box.classList.remove("is-open");
  box.removeAttribute("aria-activedescendant");
  openSelect = null;
  if (focus) box.focus();
}

function chooseOption(opt) {
  const { box, opts, multi } = openSelect;
  const value = opt.dataset.value;

  if (box.hasAttribute("data-per-page")) {
    closeListbox();
    LS().perPage = Number(value);
    LS().page = 1;
    renderResults("#per-page");
    return;
  }
  if (box.hasAttribute("data-ws-switch")) {
    closeListbox();
    const w = SPEC.workspaces.find((x) => x.title === value);
    go({ ws: w.id, screen: w.screens[0], mode: "basic" });
    return;
  }

  const drawerKey = box.dataset.drawerField;
  const key = drawerKey || box.dataset.field;
  const values = drawerKey ? S.form(state, `drawer:${state.ui.drawer.kind}`).values : F().values;

  if (multi) {
    const cur = Array.isArray(values[key]) ? values[key] : values[key] ? [values[key]] : [];
    values[key] = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    opt.setAttribute("aria-selected", String(values[key].includes(value)));
    const v = values[key];
    box.querySelector(".value").textContent = !v.length ? box.dataset.placeholder || placeholderOf(box) : v.length <= 2 ? v.join(", ") : `${v[0]}, +${v.length - 1}`;
    box.classList.toggle("filled", v.length > 0);
    clearError(key);
    return; // multi-select stays open
  }

  opts.forEach((o) => o.setAttribute("aria-selected", String(o === opt)));
  closeListbox(true);
  values[key] = value;
  box.querySelector(".value").textContent = value || placeholderOf(box);
  box.classList.toggle("filled", Boolean(value));
  if (drawerKey) { clearError(key, $("#drawer-root"), S.form(state, `drawer:${state.ui.drawer.kind}`).errors, "drawer-banner"); return; }
  clearError(key);

  if (key === "Торговец" && S.activeFields(state).some((f) => f.name === "Магазин")) {
    const m = D.MERCHANTS.find((x) => x.name === value);
    if (m && values["Магазин"] && !m.shops.includes(values["Магазин"])) values["Магазин"] = "";
    render(`#main [data-field="Торговец"]`);
  }
  if (key === "Временная зона") {
    const tip = document.getElementById(`${box.id}-tip`);
    if (tip) tip.textContent = `Временная зона ${value || D.DEFAULT_TZ.label}`;
    box.dataset.tipPersistent = `Временная зона ${value || D.DEFAULT_TZ.label}`;
    if (LS().results) renderResults();
  }
  if (L().live) { LS().results = S.query(state); renderResults(); }
}

function placeholderOf(box) {
  const lb = document.getElementById(box.getAttribute("aria-controls"));
  const f = S.activeFields(state).find((x) => x.name === box.dataset.field);
  return f ? f.ph : lb.getAttribute("aria-label");
}

function onComboKeydown(e, box) {
  const isOpen = openSelect && openSelect.box === box;
  const k = e.key;
  if (!isOpen) {
    if (["ArrowDown", "ArrowUp", "Enter", " ", "Home", "End"].includes(k)) {
      e.preventDefault();
      openListbox(box);
      if (k === "Home") setActive(0);
      if (k === "End") setActive(openSelect.opts.length - 1);
    }
    return;
  }
  const s = openSelect;
  switch (k) {
    case "ArrowDown": e.preventDefault(); setActive(s.idx + 1); break;
    case "ArrowUp": e.preventDefault(); if (e.altKey) chooseOption(s.opts[s.idx]); else setActive(s.idx - 1); break;
    case "Home": e.preventDefault(); setActive(0); break;
    case "End": e.preventDefault(); setActive(s.opts.length - 1); break;
    case "PageDown": e.preventDefault(); setActive(s.idx + 10); break;
    case "PageUp": e.preventDefault(); setActive(s.idx - 10); break;
    case "Enter": case " ": e.preventDefault(); chooseOption(s.opts[s.idx]); break;
    case "Escape": e.preventDefault(); e.stopPropagation(); closeListbox(true); break;
    case "Tab": closeListbox(); break;
    default:
      if (k.length === 1 && !e.ctrlKey && !e.metaKey) {
        const now = Date.now();
        s.typed = (now - s.typedAt < 600 ? s.typed : "") + k.toLowerCase();
        s.typedAt = now;
        const order = [...s.opts.slice(s.idx + (s.typed.length === 1 ? 1 : 0)), ...s.opts];
        const hit = order.find((o) => o.textContent.toLowerCase().startsWith(s.typed));
        if (hit) setActive(s.opts.indexOf(hit));
      }
  }
}

// ---------------------------------------------------------------------------
// Tooltips — persistent (card digits, mask, time zone) on hover/focus;
// any other field shows its name on hover once it is filled; truncated
// table cells show their full text.
// ---------------------------------------------------------------------------
const tipEl = $("#tooltip");
const TIP_SELECTOR = "[data-tip-name], table.data-table td";
let tipTarget = null;
let tipTimer = null;

function isFilled(el) {
  if (el.matches(".field-select")) return el.classList.contains("filled");
  if (el.type === "file") return Boolean(el.files && el.files.length);
  return Boolean(el.value);
}

function tooltipText(el) {
  if (el.dataset.tipPersistent) return el.dataset.tipPersistent;
  if (el.dataset.tipName) return isFilled(el) ? el.dataset.tipName : null;
  if (el.matches("td")) return el.scrollWidth > el.clientWidth + 1 ? el.textContent.trim() : null;
  return null;
}

function showTooltip(el) {
  if (openSelect && openSelect.box === el) return;
  const text = tooltipText(el);
  if (!text) return;
  tipEl.textContent = text;
  tipEl.hidden = false;
  const r = el.getBoundingClientRect();
  const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  let top = r.bottom + 8;
  const above = top + th > window.innerHeight - 8 && r.top - th - 8 > 0;
  if (above) top = r.top - th - 8;
  const left = Math.min(Math.max(8, r.left), window.innerWidth - tw - 8);
  tipEl.style.top = `${top}px`;
  tipEl.style.left = `${left}px`;
  tipEl.style.setProperty("--arrow-x", `${Math.min(Math.max(10, r.left + 16 - left), tw - 20)}px`);
  tipEl.classList.toggle("is-above", above);
  tipTarget = el;
}

function hideTooltip() {
  clearTimeout(tipTimer);
  tipEl.hidden = true;
  tipTarget = null;
}

document.addEventListener("mouseover", (e) => {
  const el = e.target.closest(TIP_SELECTOR);
  if (!el || el === tipTarget) return;
  hideTooltip();
  tipTimer = setTimeout(() => showTooltip(el), 250);
});
document.addEventListener("mouseout", (e) => {
  const el = e.target.closest(TIP_SELECTOR);
  if (el && !el.contains(e.relatedTarget)) hideTooltip();
});
document.addEventListener("focusin", (e) => {
  const el = e.target.closest("[data-tip-persistent]");
  hideTooltip();
  if (el) showTooltip(el);
});
document.addEventListener("focusout", hideTooltip);
window.addEventListener("scroll", () => { if (!tipEl.hidden) hideTooltip(); }, true);
window.addEventListener("resize", () => { hideTooltip(); closeListbox(); });

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
const maskDate = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join(".");
};

let liveTimer = null;
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.matches("input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea")) return;
  if (el.hasAttribute("data-digits")) el.value = el.value.replace(/\D/g, "");
  if (el.hasAttribute("data-date")) el.value = maskDate(el.value);
  el.classList.toggle("filled", Boolean(el.value));
  if (el.dataset.field) {
    F().values[el.dataset.field] = el.value;
    clearError(el.dataset.field);
    if (L().live) {
      clearTimeout(liveTimer);
      liveTimer = setTimeout(() => { LS().results = S.query(state); LS().page = 1; renderResults(); }, 200);
    }
  } else if (el.dataset.editField) {
    const ef = S.form(state, `${S.formKey(state)}:edit`);
    ef.values[el.dataset.editField] = el.value;
    clearError(el.dataset.editField, $(".edit-block"), ef.errors, "edit-banner");
  } else if (el.dataset.drawerField) {
    const df = S.form(state, `drawer:${state.ui.drawer.kind}`);
    df.values[el.dataset.drawerField] = el.value;
    clearError(el.dataset.drawerField, $("#drawer-root"), df.errors, "drawer-banner");
  }
});

document.addEventListener("change", (e) => {
  const el = e.target;
  const values = F().values;

  if (el.id === "adv-toggle") { go({ mode: el.checked ? "advanced" : "basic" }); return; }
  if (el.id === "multi-toggle") {
    values.__multi = el.checked;
    for (const f of S.activeFields(state).filter((x) => x.type === "select")) {
      const v = values[f.name];
      values[f.name] = el.checked ? (v ? [].concat(v) : []) : Array.isArray(v) ? v[0] || "" : v;
    }
    render("#multi-toggle");
    return;
  }
  if (el.id === "check-page") {
    const ls = LS();
    const rows = S.sorted(state).slice((ls.page - 1) * ls.perPage, ls.page * ls.perPage);
    rows.forEach((r) => (el.checked ? ls.selected.add(r.uid) : ls.selected.delete(r.uid)));
    renderResults("#check-page");
    return;
  }
  if (el.dataset.rowCheck) {
    const ls = LS();
    if (el.checked) ls.selected.add(el.dataset.rowCheck); else ls.selected.delete(el.dataset.rowCheck);
    renderResults(`[data-row-check="${cssEsc(el.dataset.rowCheck)}"]`);
    return;
  }
  if (el.dataset.ruleToggle) {
    const r = state.data.rules.find((x) => x.id === el.dataset.ruleToggle);
    r.enabled = el.checked;
    el.closest(".switch").querySelector(".switch-text").textContent = el.checked ? "On" : "Off";
    announce(`Правило ${r.id} ${el.checked ? "включено" : "выключено"}`);
    return;
  }
  if (el.type === "radio" && el.dataset.editField) {
    S.form(state, `${S.formKey(state)}:edit`).values[el.dataset.editField] = el.value;
    return;
  }
  if (el.type === "file" && el.dataset.field) {
    const file = el.files[0];
    state.ui.files[el.dataset.field] = file || null;
    values[el.dataset.field] = file ? file.name : "";
    const name = document.getElementById(`${el.id}-name`);
    if (name) { name.textContent = file ? file.name : "Файл не выбран"; name.classList.toggle("has-file", Boolean(file)); }
    clearError(el.dataset.field);
    return;
  }
  if (el.type === "checkbox" && el.dataset.field) {
    const key = el.dataset.field;
    const group = el.dataset.group;
    values[key] = el.checked;
    if (el.getAttribute("role") === "switch") {
      el.closest(".switch").querySelector(".switch-text").textContent = el.checked ? "On" : "Off";
      return;
    }
    if (key.startsWith("role:")) { clearError("Роли"); return; }
    const members = $$(`#screen-form input[data-group="${cssEsc(group || "")}"]`);
    if (group && members.some((m) => m.hasAttribute("data-all"))) {
      const all = members.find((m) => m.hasAttribute("data-all"));
      if (el === all && el.checked) members.forEach((m) => { if (m !== all) values[m.dataset.field] = false; });
      else if (el !== all && el.checked) values[all.dataset.field] = false;
      if (!members.some((m) => values[m.dataset.field])) values[all.dataset.field] = true;
    } else if (group === "group" && el.checked) {
      members.forEach((m) => { if (m !== el) values[m.dataset.field] = false; });
    }
    if (L().live) LS().results = S.query(state);
    render(`#screen-form [data-field="${cssEsc(key)}"]`);
  }
});

document.addEventListener("submit", (e) => {
  if (e.target.id !== "screen-form") return;
  e.preventDefault();
  if (LS().loading) return;
  LS().view = null; // "Искать" leaves the payout-history view
  runSearch();
});

document.addEventListener("keydown", (e) => {
  const box = e.target.closest?.('[role="combobox"]');
  if (box) { onComboKeydown(e, box); return; }
  const tab = e.target.closest?.('[role="tab"]');
  if (tab && ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
    e.preventDefault();
    const tabs = $$('[role="tab"]');
    const i = tabs.indexOf(tab);
    const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    go({ tab: tabs[next].dataset.tab });
    return;
  }
  if (e.key === "Escape") {
    if (!tipEl.hidden) hideTooltip();
    else if ($(".drawer")) closeDrawer();
  }
  trapFocus(e);
});

document.addEventListener("mousedown", (e) => {
  if (openSelect && !openSelect.box.parentElement.contains(e.target)) closeListbox();
  if (e.target.closest('[role="option"]')) e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
  const opt = e.target.closest('[role="option"]');
  if (opt && openSelect) {
    const i = openSelect.opts.indexOf(opt);
    if (i !== openSelect.idx && i >= 0) setActive(i);
  }
});

document.addEventListener("click", (e) => {
  const t = e.target;

  const opt = t.closest('[role="option"]');
  if (opt && openSelect) { chooseOption(opt); return; }

  const box = t.closest('[role="combobox"]');
  if (box) {
    if (openSelect && openSelect.box === box) closeListbox(true);
    else openListbox(box);
    return;
  }

  const actionEl = t.closest("[data-action]");
  const action = actionEl?.dataset.action;
  const uid = t.closest("[data-uid]")?.dataset.uid;
  if (action) {
    if (action.startsWith("go:")) {
      if (action === "go:users") state.ui.editUser = null;
      if (action === "go:users/new" && !state.ui.editUser) delete state.forms[`${state.ws}:users/new`];
      go({ screen: action.slice(3) });
      return;
    }
    if (action.startsWith("create-ad:")) { openCreate("ad", action.slice(10)); return; }
    switch (action) {
      case "export-xlsx": exportRows("xlsx"); return;
      case "export-csv": exportRows("csv"); return;
      case "clear": clearScreen(); return;
      case "reset-search": clearScreen("#btn-search"); runSearch(); return;
      case "clear-selection": LS().selected.clear(); renderResults("#check-page"); return;
      case "open-payment": openDrawer(S.renderPaymentDrawer(state, uid)); return;
      case "flag": toggleFlag(uid); return;
      case "close-drawer": closeDrawer(); return;
      case "create-merchant": openCreate("merchant"); return;
      case "save-ad": saveCreate("ad"); return;
      case "save-merchant": saveCreate("merchant"); return;
      case "save-user": saveUser(); return;
      case "edit-user": editUser(uid); return;
      case "save-mass-payout": saveMassPayout(); return;
      case "download-report": downloadReport(uid); return;
      case "update": case "update-notify": case "notify": applyTxEdit(action); return;
      case "history": LS().view = "history"; runSearch(); return;
      case "fill-uid": F().values["UID операции"] = uid; delete F().errors["UID операции"]; render('#main [data-field="UID операции"]'); return;
    }
  }

  const modeBtn = t.closest(".mode-tabs [data-mode]");
  if (modeBtn) { go({ mode: modeBtn.dataset.mode }); return; }

  const tabBtn = t.closest("[role=tab][data-tab]");
  if (tabBtn) { go({ tab: tabBtn.dataset.tab }); return; }

  const sortBtn = t.closest("[data-sort]");
  if (sortBtn) {
    const key = sortBtn.dataset.sort;
    const cur = S.currentSort(state);
    LS().sort = cur && cur.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: S.defaultDir(key) };
    LS().page = 1;
    renderResults(`[data-sort="${key}"]`);
    return;
  }

  const pageBtn = t.closest("[data-page]");
  if (pageBtn && !pageBtn.disabled) {
    LS().page = Number(pageBtn.dataset.page);
    renderResults(`[data-page="${LS().page}"][aria-current]`);
    return;
  }

  const row = t.closest("tr.is-clickable");
  if (row && !t.closest("button, label, input, a")) openDrawer(S.renderPaymentDrawer(state, row.dataset.uid));
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
if (!location.hash || location.hash === "#") history.replaceState(null, "", S.routeHash(state));
onRoute(true);
