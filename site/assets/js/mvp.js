// Paid — live MVP of the payment operations console.
// Same field maps, tooltips, icons and components as the static screens in
// /screens; here every state is real: dropdowns, hover/focus tooltips,
// validation, loading, filtering, sorting, selection, pagination, the
// transaction drawer and an actual .xlsx export. No dependencies.

"use strict";

const DATA = JSON.parse(document.getElementById("mvp-data").textContent);
const { fieldMaps, tooltips: PERSISTENT_TOOLTIPS, icons: ICONS, columnWidths: COLUMN_WIDTHS } = DATA;

ICONS.toastInfo = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15"/><path d="M10 6v5M10 14h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pad = (n) => String(n).padStart(2, "0");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const contains = (hay, needle) => String(hay).toLowerCase().includes(needle.trim().toLowerCase());
const DAY = 86400000;

function parseField(raw) {
  const [label, ...flags] = raw.split("|");
  return { label, flags };
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// ---------------------------------------------------------------------------
// Reference data (fictional)
// ---------------------------------------------------------------------------
const TIMEZONES = [
  { label: "(GMT + 00:00) UTC", offset: 0 },
  { label: "(GMT + 01:00) Amsterdam", offset: 60 },
  { label: "(GMT + 03:00) Minsk", offset: 180 },
];
const DEFAULT_TZ = TIMEZONES[1]; // the reference tooltip names Amsterdam as the default

const PROCESSORS = ["EPay Gateway", "Paid Core", "SecurePay"];
const MERCHANTS = [
  { name: "ООО «Технопарк»", shops: ["technopark.example", "Технопарк — Минск"] },
  { name: "ИП Соколова", shops: ["flowers.example"] },
  { name: "ООО «Цифра»", shops: ["cifra.example", "Цифра Premium"] },
  { name: "ООО «Книжный дом»", shops: ["books.example"] },
  { name: "Тестовый магазин", shops: ["sandbox.example"] },
];
const COUNTRIES = ["Беларусь", "Польша", "Литва", "Германия", "Казахстан"];
const PERSONS = [
  ["Иван", "Петров", "IVAN PETROV", "ivan.petrov"],
  ["Анна", "Соколова", "ANNA SOKOLOVA", "anna.s"],
  ["Сергей", "Иванов", "SERGEI IVANOV", "s.ivanov"],
  ["Мария", "Козлова", "MARIA KOZLOVA", "maria.k"],
  ["Дмитрий", "Новиков", "DMITRY NOVIKOV", "dnovikov"],
  ["Ольга", "Морозова", "OLGA MOROZOVA", "olga.m"],
  ["Алексей", "Волков", "ALEXEY VOLKOV", "a.volkov"],
  ["Екатерина", "Лебедева", "EKATERINA LEBEDEVA", "kate.l"],
  ["Павел", "Смирнов", "PAVEL SMIRNOV", "psmirnov"],
  ["Наталья", "Кузнецова", "NATALIA KUZNETSOVA", "n.kuz"],
];
const STATUS_BADGE = { "Одобрена": "success", "В обработке": "warning", "Отклонена": "error", "Возврат": "info", "Отменена": "neutral" };

const SELECT_OPTIONS = {
  "Выберите тип транзакции": ["Оплата", "Возврат", "Авторизация", "Отмена"],
  "Выберите статус": Object.keys(STATUS_BADGE),
  "Выберите процессор": PROCESSORS,
  "Способ оплаты": ["Visa", "Mastercard", "Белкарт"],
  "Выберите наименование торговца": MERCHANTS.map((m) => m.name),
  "Выберите название магазина": MERCHANTS.flatMap((m) => m.shops),
  "Страна банка-эмитета": COUNTRIES,
  "Показать фрод": ["Все операции", "Только подозрительные", "Без фрод-маркера"],
  "Дата создания": ["Сегодня", "Последние 7 дней", "Последние 30 дней", "Последние 90 дней"],
  "Временная зона": TIMEZONES.map((t) => t.label),
};

// Deterministic generator so every visitor sees the same data set.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRows(count) {
  const rnd = mulberry32(20260721);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const digits = (n) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");
  const hex = (n) => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join("");
  const rows = [];
  let t = Date.now() - 25 * 60 * 1000;
  for (let i = 0; i < count; i++) {
    t -= Math.floor((0.5 + rnd() * 30) * 3600 * 1000);
    const order = 4521 - i * 3;
    const r = rnd();
    const type = r < 0.7 ? "Оплата" : r < 0.85 ? "Возврат" : r < 0.93 ? "Авторизация" : "Отмена";
    const s = rnd();
    const status = type === "Возврат" ? "Возврат" : type === "Отмена" ? "Отменена" : s < 0.7 ? "Одобрена" : s < 0.85 ? "В обработке" : "Отклонена";
    const desc = {
      "Оплата": pick([`Оплата заказа №${order}`, "Оплата подписки Premium", "Пополнение баланса", `Оплата доставки №${order}`]),
      "Возврат": `Возврат по заказу №${order}`,
      "Авторизация": `Предавторизация заказа №${order}`,
      "Отмена": `Отмена заказа №${order}`,
    }[type];
    const merchant = rnd() < 0.08 ? MERCHANTS[4] : pick(MERCHANTS.slice(0, 4));
    const test = merchant === MERCHANTS[4];
    const b = rnd();
    const brand = b < 0.45 ? "Visa" : b < 0.85 ? "Mastercard" : "Белкарт";
    const bin = brand === "Visa" ? `4${digits(5)}` : brand === "Mastercard" ? `5${pick("12345")}${digits(4)}` : `9112${digits(2)}`;
    const person = pick(PERSONS);
    const fraudRoll = rnd();
    const fraud = status === "Отклонена" && fraudRoll < 0.45 ? "Высокий риск" : fraudRoll < 0.06 ? "Проверка" : "—";
    rows.push({
      uid: `PMT-${8842190 - i * 13 - Math.floor(rnd() * 9)}`,
      tracking: `TRK-${2291001 - i * 11 - Math.floor(rnd() * 7)}`,
      createdAt: t,
      desc: test ? "Тестовый платёж" : desc,
      type,
      status,
      amount: test ? 1 : Math.round((5 + rnd() * 420) * 100) / 100,
      brand,
      bin,
      last4: digits(4),
      holder: person[2],
      name: `${person[0]} ${person[1]}`,
      email: `${person[3]}${Math.floor(rnd() * 90 + 10)}@${pick(["example.com", "example.by", "example.org"])}`,
      phone: `+375 ${pick(["29", "33", "44", "25"])} ${digits(3)}-${digits(2)}-${digits(2)}`,
      ip: `${pick([37, 46, 93, 178, 185, 212])}.${Math.floor(rnd() * 255)}.${Math.floor(rnd() * 255)}.${Math.floor(rnd() * 254) + 1}`,
      country: rnd() < 0.7 ? "Беларусь" : pick(COUNTRIES.slice(1)),
      processor: pick(PROCESSORS),
      merchant: merchant.name,
      shop: pick(merchant.shops),
      fraud,
      test,
      rnn: digits(12),
      erip: digits(8),
      bankId: pick(["104", "117", "226", "310", "742"]),
      hash: hex(32),
    });
  }
  return rows;
}

const ROWS = generateRows(57);

// ---------------------------------------------------------------------------
// Formatting / masking
// ---------------------------------------------------------------------------
function activeTz() {
  const label = activeLabels().includes("Временная зона") ? state.values["Временная зона"] : "";
  return TIMEZONES.find((t) => t.label === label) || DEFAULT_TZ;
}
function fmtDate(ms, full = false) {
  const d = new Date(ms + activeTz().offset * 60000);
  const date = `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}${full ? `.${d.getUTCFullYear()}` : ""}`;
  return `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
const fmtAmount = (n) => `${n.toFixed(2)} BYN`;
const maskEmail = (e) => `${e[0]}***@${e.split("@")[1]}`;
const maskPhone = (p) => `${p.slice(0, 8)} ***-**-${p.slice(-2)}`;
const maskHash = (h) => `${h.slice(0, 4)}•••••••${h.slice(-4)}`;
const maskIp = (ip) => ip.split(".").map((o, i) => (i === 1 || i === 2 ? "•••" : o)).join(".");
const method = (r) => `${r.brand} •••• ${r.last4}`;

function persistentTip(label, flags = []) {
  if (label === "Временная зона" && state.values[label]) return `Временная зона ${state.values[label]}`;
  const flag = flags.find((f) => f.startsWith("tooltip-persistent:"));
  return flag ? flag.slice("tooltip-persistent:".length) : PERSISTENT_TOOLTIPS[label] || null;
}

// ---------------------------------------------------------------------------
// State + routing (#admin/basic, #user/advanced …)
// ---------------------------------------------------------------------------
const state = {
  role: "admin",
  mode: "basic",
  values: {},      // field label -> string | boolean, kept across role/mode switches
  errors: {},      // field label -> message
  results: null,   // null = no search yet
  loading: false,
  sort: { key: "createdAt", dir: "desc" },
  page: 1,
  perPage: 10,
  selected: new Set(),
};

function readRoute() {
  const [role, mode] = location.hash.replace(/^#\/?/, "").split("/");
  state.role = role === "user" ? "user" : "admin";
  state.mode = mode === "advanced" ? "advanced" : "basic";
}
function go(role, mode) {
  location.hash = `#${role}/${mode}`;
}

function currentMap() {
  return fieldMaps[`${state.role}${state.mode === "basic" ? "Basic" : "Advanced"}`];
}
function activeLabels() {
  return currentMap().groups.flatMap((g) => g.rows.flat().map((f) => parseField(f).label));
}

// ---------------------------------------------------------------------------
// Validation + filtering
// ---------------------------------------------------------------------------
function parseDate(v) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(v.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (check.getUTCDate() !== d || check.getUTCMonth() !== mo - 1) return null;
  return ms - activeTz().offset * 60000; // start of that day in the active time zone
}

const RULES = {
  "Сумма": [(v) => /^\d+([.,]\d{1,2})?$/.test(v), "Введите сумму, например 145.00"],
  "xxxx xxxx xxxx 1234": [(v) => /^\d{4}$/.test(v), "Введите последние 4 цифры карты"],
  "БИН карты": [(v) => /^\d{6}$/.test(v), "БИН — первые 6 цифр карты"],
  "Маска карты": [(v) => /^\d{6}\s*[xх*•]{4}\s*\d{4}$/i.test(v), "Формат маски: 123456 xxxx 1234"],
  "С": [(v) => parseDate(v) !== null, "Введите дату в формате дд.мм.гггг"],
  "По": [(v) => parseDate(v) !== null, "Введите дату в формате дд.мм.гггг"],
  "IP клиента": [(v) => /^[\d.]+$/.test(v), "Допустимы только цифры и точки"],
  "E-mail клиента": [(v) => !/\s/.test(v), "E-mail не может содержать пробелы"],
};

function validate() {
  const errors = {};
  for (const label of activeLabels()) {
    const v = state.values[label];
    if (typeof v !== "string" || !v.trim()) continue;
    const rule = RULES[label];
    if (rule && !rule[0](v.trim())) errors[label] = rule[1];
  }
  const from = state.values["С"], to = state.values["По"];
  if (!errors["С"] && !errors["По"] && from && to && activeLabels().includes("С") && parseDate(to) < parseDate(from)) {
    errors["По"] = "Дата «По» не может быть раньше даты «С»";
  }
  return errors;
}

const FILTERS = {
  "UID операции": (r, v) => contains(r.uid, v),
  "Трекинг ID": (r, v) => contains(r.tracking, v),
  "Описание платежа": (r, v) => contains(r.desc, v),
  "Сумма": (r, v) => Math.abs(r.amount - parseFloat(v.replace(",", "."))) < 0.005,
  "RNN": (r, v) => r.rnn.includes(v.replace(/\s/g, "")),
  "ID банка": (r, v) => contains(r.bankId, v),
  "Выберите тип транзакции": (r, v) => r.type === v,
  "Выберите статус": (r, v) => r.status === v,
  "Выберите процессор": (r, v) => r.processor === v,
  "Способ оплаты": (r, v) => r.brand === v,
  "Номер счёта ЕРИП": (r, v) => r.erip.includes(v.replace(/\s/g, "")),
  "С": (r, v) => r.createdAt >= parseDate(v),
  "По": (r, v) => r.createdAt < parseDate(v) + DAY,
  "Выберите наименование торговца": (r, v) => r.merchant === v,
  "Выберите название магазина": (r, v) => r.shop === v,
  "xxxx xxxx xxxx 1234": (r, v) => r.last4 === v.trim(),
  "БИН карты": (r, v) => r.bin === v.trim(),
  "Владелец карты": (r, v) => contains(r.holder, v),
  "Маска карты": (r, v) => {
    const d = v.replace(/\D/g, "");
    return r.bin === d.slice(0, 6) && r.last4 === d.slice(-4);
  },
  "Хэш карты": (r, v) => contains(r.hash, v),
  "Страна банка-эмитета": (r, v) => r.country === v,
  "E-mail клиента": (r, v) => contains(r.email, v),
  "Имя клиента": (r, v) => contains(r.name, v),
  "Телефон клиента": (r, v) => r.phone.replace(/\D/g, "").includes(v.replace(/\D/g, "")),
  "IP клиента": (r, v) => r.ip.includes(v.trim()),
  "Показать фрод": (r, v) => (v === "Только подозрительные" ? r.fraud !== "—" : v === "Без фрод-маркера" ? r.fraud === "—" : true),
  "Дата создания": (r, v) => {
    if (v === "Сегодня") {
      const off = activeTz().offset * 60000;
      return r.createdAt >= Math.floor((Date.now() + off) / DAY) * DAY - off;
    }
    const days = { "Последние 7 дней": 7, "Последние 30 дней": 30, "Последние 90 дней": 90 }[v];
    return r.createdAt >= Date.now() - days * DAY;
  },
  "Тестовые транзакции": (r, v) => (v ? r.test : true),
};

function filterRows() {
  const active = activeLabels()
    .map((label) => [label, state.values[label]])
    .filter(([label, v]) => FILTERS[label] && (v === true || (typeof v === "string" && v.trim())));
  return ROWS.filter((r) => active.every(([label, v]) => FILTERS[label](r, v)));
}

// ---------------------------------------------------------------------------
// Rendering — header + form
// ---------------------------------------------------------------------------
let idSeq = 0;
const nextId = (p) => `${p}-${++idSeq}`;

function checkboxHtml({ label, checked = false, hiddenLabel = false, attrs = "" }) {
  return `<label class="checkbox"><input type="checkbox" ${checked ? "checked" : ""} ${attrs}/><span class="box" aria-hidden="true">${ICONS.check}</span><span class="${hiddenLabel ? "visually-hidden" : ""}">${esc(label)}</span></label>`;
}

function selectHtml({ id, label, value, options, attrs = "", reset = true }) {
  const lb = `${id}-lb`;
  const opts = [...(reset ? [{ v: "", t: "Не выбрано" }] : []), ...options.map((o) => ({ v: String(o), t: String(o) }))];
  return `<div class="field-select${value ? " filled" : ""}" id="${id}" tabindex="0" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="${lb}" aria-label="${esc(label)}" ${attrs}><span class="value">${esc(value || label)}</span>${ICONS.chevron}</div>
    <ul class="select-panel" id="${lb}" role="listbox" aria-label="${esc(label)}" hidden>${opts
      .map((o, i) => `<li role="option" id="${lb}-${i}" class="opt${o.v === "" ? " is-reset" : ""}" data-value="${esc(o.v)}" aria-selected="${o.v === String(value || "")}">${esc(o.t)}</li>`)
      .join("")}</ul>`;
}

const INPUT_ATTRS = {
  "xxxx xxxx xxxx 1234": 'inputmode="numeric" maxlength="4" data-digits',
  "БИН карты": 'inputmode="numeric" maxlength="6" data-digits',
  "Сумма": 'inputmode="decimal"',
  "С": 'inputmode="numeric" maxlength="10" data-date',
  "По": 'inputmode="numeric" maxlength="10" data-date',
  "Телефон клиента": 'inputmode="tel"',
  "E-mail клиента": 'inputmode="email"',
  "IP клиента": 'inputmode="decimal"',
};

function fieldHtml(raw) {
  const { label, flags } = parseField(raw);
  const value = state.values[label];
  const checkboxFlag = flags.find((f) => f.startsWith("checkbox("));
  if (checkboxFlag) {
    return `<div class="field-wrap field-wrap-check" data-label="${esc(label)}">${checkboxHtml({ label, checked: value === true, attrs: `data-field="${esc(label)}"` })}</div>`;
  }

  const id = nextId("f");
  const tip = persistentTip(label, flags);
  const err = state.errors[label];
  const describedBy = [tip ? `${id}-tip` : "", `${id}-err`].filter(Boolean).join(" ");
  const tipAttrs = tip ? `data-tip-field="${esc(label)}" data-tip-flags="${esc(flags.join("|"))}"` : "";
  const errAttrs = `aria-describedby="${describedBy}"${err ? ' aria-invalid="true"' : ""}`;

  let control;
  if (flags.includes("select")) {
    control = selectHtml({
      id, label, value: value || "", options: SELECT_OPTIONS[label] || [],
      attrs: `data-field="${esc(label)}" ${tipAttrs} ${errAttrs}`,
    });
  } else {
    const cls = ["field-input", flags.includes("cardnum") ? "is-cardnum" : "", err ? "has-error" : ""].filter(Boolean).join(" ");
    control = `<input id="${id}" class="${cls}" type="text" autocomplete="off" spellcheck="false" value="${esc(value || "")}" placeholder="${esc(label)}" aria-label="${esc(label)}" data-field="${esc(label)}" ${INPUT_ATTRS[label] || ""} ${tipAttrs} ${errAttrs}/>`;
  }
  if (err && flags.includes("select")) control = control.replace('class="field-select', 'class="field-select has-error');

  return `<div class="field-wrap" data-label="${esc(label)}">${control}${tip ? `<span class="visually-hidden" id="${id}-tip">${esc(tip)}</span>` : ""}<div class="field-error" id="${id}-err"${err ? "" : " hidden"}>${esc(err || "")}</div></div>`;
}

function renderHeader() {
  const isAdmin = state.role === "admin";
  $("#app-header").innerHTML = `<header class="app-header">
    <h1 class="page-title text-h1">Список платежей</h1>
    <div class="header-meta">
      <span class="role-badge role-${state.role}"><span class="dot" aria-hidden="true"></span>Роль: ${isAdmin ? "Администратор" : "Клиент"}</span>
      <button type="button" class="role-switch-link" data-action="switch-role">Переключить на ${isAdmin ? "Клиента" : "Администратора"}</button>
      <div class="mode-tabs" role="group" aria-label="Режим поиска">
        <button type="button" data-mode="basic" aria-pressed="${state.mode === "basic"}">Простой</button>
        <button type="button" data-mode="advanced" aria-pressed="${state.mode === "advanced"}">Расширенный</button>
      </div>
    </div>
  </header>`;
}

function renderForm() {
  const map = currentMap();
  const groups = map.groups
    .map((g) => `<fieldset class="field-group" style="border:0;padding:0;margin-inline:0;min-width:0;">
      <legend class="field-group-title text-h3 text-secondary" style="padding:0;">${esc(g.title)}</legend>
      ${g.rows.map((row) => `<div class="field-row">${row.map(fieldHtml).join("")}</div>`).join("")}
    </fieldset>`)
    .join("");
  $("#search-form").innerHTML = `<div class="form-banner field-error" id="form-banner" role="alert"></div>
    ${groups}
    <div class="footer-row">
      <div class="footer-left">
        <button type="submit" class="btn btn-primary" id="btn-search">Искать</button>
        <button type="button" class="btn btn-secondary" data-action="export">Экспортировать в XLSX</button>
      </div>
      <div class="footer-right">
        ${checkboxHtml({ label: "Расширенный поиск", checked: state.mode === "advanced", attrs: 'id="adv-toggle"' })}
        <button type="button" class="btn btn-secondary" data-action="clear">Очистить поля</button>
      </div>
    </div>`;
  syncErrors();
}

// Update error UI in place so focus and caret are never lost.
function syncErrors() {
  for (const wrap of $$("#search-form .field-wrap[data-label]")) {
    const label = wrap.dataset.label;
    const control = wrap.querySelector("[data-field]");
    const errEl = wrap.querySelector(".field-error");
    if (!errEl || !control) continue;
    const err = state.errors[label];
    control.classList.toggle("has-error", Boolean(err));
    if (err) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
    errEl.textContent = err || "";
    errEl.hidden = !err;
  }
  const count = Object.keys(state.errors).filter((l) => activeLabels().includes(l)).length;
  $("#form-banner").textContent = count ? `Форма содержит ошибки (${count}). Проверьте выделенные поля.` : "";
}

// ---------------------------------------------------------------------------
// Rendering — results
// ---------------------------------------------------------------------------
const SORTABLE = { "Дата и время": "createdAt", "Тип транзакции": "type", "Сумма": "amount", "Статус": "status" };
const DEFAULT_DIR = { createdAt: "desc", amount: "desc", type: "asc", status: "asc" };

function sortedResults() {
  const { key, dir } = state.sort;
  const mul = dir === "asc" ? 1 : -1;
  return [...state.results].sort((a, b) => {
    const x = a[key], y = b[key];
    return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "ru")) * mul;
  });
}

function columns() {
  const base = fieldMaps.resultsTableColumns.filter((c) => c !== "Действия");
  return state.role === "admin" ? [...base, ...fieldMaps.resultsTableColumnsAdminExtra] : base;
}

function colgroup(cols) {
  const widths = [COLUMN_WIDTHS.check, ...cols.map((c) => COLUMN_WIDTHS[c] || 110), COLUMN_WIDTHS["Действия"]];
  return `<colgroup>${widths.map((w) => `<col style="width:${w}px">`).join("")}</colgroup>`;
}

function headerRow(cols, pageRows) {
  const onPage = pageRows.filter((r) => state.selected.has(r.uid)).length;
  const all = pageRows.length > 0 && onPage === pageRows.length;
  const cells = cols.map((c) => {
    const cls = [c === "Сумма" ? "num" : "", c === "Статус" ? "status-col" : ""].filter(Boolean).join(" ");
    const key = SORTABLE[c];
    if (!key) return `<th class="${cls}" scope="col"><span class="th-inner text-overline">${esc(c)}</span></th>`;
    const sorted = state.sort.key === key;
    const ariaSort = sorted ? (state.sort.dir === "asc" ? "ascending" : "descending") : "none";
    const icon = sorted ? ICONS.sortAsc.replace("<svg", '<svg class="sort-icon" aria-hidden="true"') : ICONS.sortNone.replace("<svg", '<svg aria-hidden="true"');
    return `<th class="${cls}" scope="col" aria-sort="${ariaSort}"><button type="button" class="th-sort text-overline" data-sort="${key}">${esc(c)}${icon}</button></th>`;
  });
  return `<tr><th class="row-check" scope="col">${checkboxHtml({
    label: "Выбрать все на странице", hiddenLabel: true, checked: all,
    attrs: `id="check-page" data-indeterminate="${onPage > 0 && !all}"${pageRows.length ? "" : " disabled"}`,
  })}</th>${cells.join("")}<th scope="col"><span class="text-overline">Действия</span></th></tr>`;
}

function rowHtml(r) {
  const sel = state.selected.has(r.uid);
  const cells = [
    `<td class="row-check">${checkboxHtml({ label: `Выбрать операцию ${r.uid}`, hiddenLabel: true, checked: sel, attrs: `data-row-check="${r.uid}"` })}</td>`,
    `<td class="mono">${r.uid}</td>`,
    `<td class="mono">${r.tracking}</td>`,
    `<td>${fmtDate(r.createdAt)}</td>`,
    `<td>${esc(r.desc)}</td>`,
    `<td>${esc(r.type)}</td>`,
    `<td>${esc(maskEmail(r.email))}</td>`,
    `<td class="num mono">${fmtAmount(r.amount)}</td>`,
    `<td>${method(r)}</td>`,
    `<td class="status-col">${statusBadge(r.status)}</td>`,
  ];
  if (state.role === "admin") {
    cells.push(
      `<td>${esc(r.processor)}</td>`,
      `<td>${esc(r.merchant)}</td>`,
      `<td>${fraudBadge(r.fraud)}</td>`,
      `<td>${r.test ? "Да" : "Нет"}</td>`,
    );
  }
  cells.push(`<td><div class="actions-cell">
    <button type="button" class="icon-btn" data-action="open" data-uid="${r.uid}" aria-label="Детали операции ${r.uid}">${ICONS.eye}</button>
    ${state.role === "admin" ? `<button type="button" class="icon-btn" data-action="flag" data-uid="${r.uid}" aria-pressed="${r.fraud !== "—"}" aria-label="Пометить ${r.uid} как подозрительную">${ICONS.flag}</button>` : ""}
  </div></td>`);
  return `<tr class="is-clickable${sel ? " selected" : ""}" data-uid="${r.uid}">${cells.join("")}</tr>`;
}

const statusBadge = (s) => `<span class="status-badge ${STATUS_BADGE[s]}">${ICONS.statusDotSuccess}${esc(s)}</span>`;
const fraudBadge = (f) => (f === "—" ? "—" : `<span class="status-badge ${f === "Высокий риск" ? "error" : "warning"}">${esc(f)}</span>`);

function pagesList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, page - 1, page, page + 1]);
  const out = [];
  let prev = 0;
  for (const p of [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

function renderResults() {
  const el = $("#results");
  const cols = columns();
  hideTooltip();

  if (state.loading) {
    el.setAttribute("aria-busy", "true");
    const skel = Array.from({ length: 6 }, () => `<tr class="skeleton-row">${Array.from({ length: cols.length + 2 }, () => '<td><span class="skeleton-block" style="width:70%;height:14px;"></span></td>').join("")}</tr>`).join("");
    el.innerHTML = `<div class="results-toolbar"><h2 class="text-h2">Результаты поиска</h2><div class="results-meta">Загрузка…</div></div>
      <div class="table-scroll"><table class="data-table">${colgroup(cols)}<thead>${headerRow(cols, [])}</thead><tbody>${skel}</tbody></table></div>`;
    return;
  }
  el.removeAttribute("aria-busy");

  if (state.results === null) {
    el.innerHTML = `<div class="empty-state"><div class="hint text-body-sm">Задайте параметры поиска и нажмите «Искать» — результаты появятся здесь. Пустой запрос покажет все операции.</div></div>`;
    return;
  }

  if (!state.results.length) {
    el.innerHTML = `<div class="results-toolbar"><h2 class="text-h2">Результаты поиска</h2></div>
      <div class="empty-state"><div class="icon" aria-hidden="true">${ICONS.search}</div><div class="title">Нет результатов</div>
      <div class="hint text-body-sm">По заданным параметрам ничего не найдено. Измените условия и попробуйте снова.</div>
      <button type="button" class="btn btn-secondary" style="margin-top:12px" data-action="reset-search">Очистить фильтры</button></div>`;
    return;
  }

  const rows = sortedResults();
  const pages = Math.max(1, Math.ceil(rows.length / state.perPage));
  state.page = Math.min(Math.max(1, state.page), pages);
  const start = (state.page - 1) * state.perPage;
  const pageRows = rows.slice(start, start + state.perPage);
  const selCount = state.selected.size;

  el.innerHTML = `<div class="results-toolbar">
      <h2 class="text-h2">Результаты поиска</h2>
      <div class="results-meta">
        <span>Найдено: <strong>${rows.length}</strong></span>
        ${selCount ? `<span>· Выбрано: <strong>${selCount}</strong></span><button type="button" class="btn btn-ghost btn-sm" data-action="clear-selection">Снять выделение</button>` : ""}
      </div>
    </div>
    <div class="table-scroll"><table class="data-table">
      <caption class="visually-hidden">Платежи, страница ${state.page} из ${pages}</caption>
      ${colgroup(cols)}<thead>${headerRow(cols, pageRows)}</thead><tbody>${pageRows.map(rowHtml).join("")}</tbody>
    </table></div>
    <div class="pagination">
      <div class="rows-per-page"><span id="per-page-label">Показывать по</span>
        <div class="select-wrap">${selectHtml({ id: "per-page", label: "Строк на странице", value: String(state.perPage), options: [10, 20, 50], reset: false, attrs: 'data-per-page aria-labelledby="per-page-label"' })}</div>
        <span>строк</span><span class="range">${start + 1}–${start + pageRows.length} из ${rows.length}</span>
      </div>
      <nav class="pages" aria-label="Страницы результатов">
        <button type="button" class="page-btn" data-page="${state.page - 1}" aria-label="Предыдущая страница" ${state.page === 1 ? "disabled" : ""}>‹</button>
        ${pagesList(state.page, pages).map((p) => (p === "…" ? '<span class="page-ellipsis">…</span>' : `<button type="button" class="page-btn${p === state.page ? " active" : ""}" data-page="${p}" ${p === state.page ? 'aria-current="page"' : ""} aria-label="Страница ${p}">${p}</button>`)).join("")}
        <button type="button" class="page-btn" data-page="${state.page + 1}" aria-label="Следующая страница" ${state.page === pages ? "disabled" : ""}>›</button>
      </nav>
    </div>`;
  const pageCheck = $("#check-page");
  if (pageCheck) pageCheck.indeterminate = pageCheck.dataset.indeterminate === "true";
}

function announce(text) {
  const el = $("#sr-status");
  el.textContent = "";
  setTimeout(() => { el.textContent = text; }, 50);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
async function runSearch() {
  closeListbox();
  state.errors = validate();
  syncErrors();
  const firstInvalid = $("#search-form [aria-invalid='true']");
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }
  const btn = $("#btn-search");
  btn.setAttribute("aria-busy", "true");
  btn.textContent = "Поиск…";
  state.loading = true;
  state.page = 1;
  state.selected.clear();
  renderResults();
  await delay(650);
  state.results = filterRows();
  state.loading = false;
  renderResults();
  const b = $("#btn-search");
  if (b) { b.removeAttribute("aria-busy"); b.textContent = "Искать"; }
  const n = state.results.length;
  announce(n ? `Найдено ${n} ${plural(n, "операция", "операции", "операций")}` : "Ничего не найдено");
}

function clearFields(focusSelector = '[data-action="clear"]') {
  state.values = {};
  state.errors = {};
  renderForm();
  $(focusSelector)?.focus();
  announce("Поля очищены");
}

function rerenderAll(focusSelector) {
  renderHeader();
  renderForm();
  if (state.results && !Object.keys(validate()).length) {
    state.results = filterRows();
    const visible = new Set(state.results.map((r) => r.uid));
    state.selected.forEach((uid) => { if (!visible.has(uid)) state.selected.delete(uid); });
  }
  renderResults();
  if (focusSelector) $(focusSelector)?.focus();
}

function toggleFlag(uid) {
  const r = ROWS.find((x) => x.uid === uid);
  const marked = r.fraud === "—";
  r.fraud = marked ? "Проверка" : "—";
  renderResults();
  $(`[data-action="flag"][data-uid="${uid}"]`)?.focus();
  toast(marked
    ? { kind: "info", title: "Операция отмечена", body: `${uid} отправлена на проверку фрод-аналитику` }
    : { kind: "info", title: "Отметка снята", body: `${uid} больше не помечена как подозрительная` });
}

// ---------------------------------------------------------------------------
// Select (APG "select-only combobox")
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
  openSelect = { box, panel, opts, idx, typed: "", typedAt: 0 };
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
  const { box, opts } = openSelect;
  const value = opt.dataset.value;
  opts.forEach((o) => o.setAttribute("aria-selected", String(o === opt)));
  closeListbox(true);

  if (box.hasAttribute("data-per-page")) {
    state.perPage = Number(value);
    state.page = 1;
    renderResults();
    $("#per-page")?.focus();
    return;
  }

  const label = box.dataset.field;
  state.values[label] = value;
  box.querySelector(".value").textContent = value || label;
  box.classList.toggle("filled", Boolean(value));
  clearError(label);
  if (label === "Временная зона") {
    const tipEl = document.getElementById(`${box.id}-tip`);
    if (tipEl) tipEl.textContent = persistentTip(label);
    if (state.results) renderResults(); // times are shown in the selected zone
  }
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
// Tooltips — persistent ones on hover/focus, plus overflow tooltips for
// filled-and-truncated values (per field-maps.json tooltipRules)
// ---------------------------------------------------------------------------
const tipEl = $("#tooltip");
const TIP_SELECTOR = "[data-tip-field], .field-input, .field-select, table.data-table td";
let tipTarget = null;
let tipTimer = null;

function tooltipText(el) {
  if (el.dataset.tipField) return persistentTip(el.dataset.tipField, (el.dataset.tipFlags || "").split("|"));
  if (el.matches(".field-input")) return el.value && el.scrollWidth > el.clientWidth ? el.value : null;
  if (el.matches(".field-select")) {
    const v = el.querySelector(".value");
    return el.classList.contains("filled") && v.scrollWidth > v.clientWidth ? v.textContent : null;
  }
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
  const el = e.target.closest(TIP_SELECTOR);
  hideTooltip();
  if (el && !el.matches("td")) showTooltip(el);
});
document.addEventListener("focusout", hideTooltip);
window.addEventListener("scroll", hideTooltip, true);
window.addEventListener("resize", () => { hideTooltip(); closeListbox(); });

// ---------------------------------------------------------------------------
// Drawer — modal dialog with focus trap
// ---------------------------------------------------------------------------
let drawerReturnFocus = null;

function openDrawer(uid) {
  const r = ROWS.find((x) => x.uid === uid);
  const isAdmin = state.role === "admin";
  const field = (k, v, mono = false) => `<div class="drawer-field"><span class="k">${k}</span><span class="v${mono ? " mono" : ""}">${v}</span></div>`;
  const section = (title, body) => `<h3 class="drawer-section-title text-caption text-overline">${title}</h3>${body}`;
  drawerReturnFocus = document.activeElement;
  hideTooltip();
  $("#drawer-root").innerHTML = `<div class="drawer-overlay" data-action="close-drawer"></div>
    <div class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div class="drawer-header">
        <h2 class="text-h2" id="drawer-title">Детали транзакции</h2>
        <button type="button" class="drawer-close" data-action="close-drawer" aria-label="Закрыть">${ICONS.close}</button>
      </div>
      <div class="drawer-body">
        ${section("Операция", [
          field("UID операции", r.uid, true),
          field("Трекинг ID", r.tracking, true),
          field("Дата и время", `${fmtDate(r.createdAt, true)} <span class="text-muted">${esc(activeTz().label)}</span>`),
          field("Описание платежа", esc(r.desc)),
          field("Тип транзакции", esc(r.type)),
          field("Статус", statusBadge(r.status)),
          field("RNN", r.rnn, true),
        ].join(""))}
        ${section("Платёж", [
          field("Сумма", fmtAmount(r.amount), true),
          field("Способ оплаты", method(r)),
          field("Маска карты", `${r.bin} •••• ${r.last4}`, true),
          field("Страна банка-эмитента", esc(r.country)),
          isAdmin ? field("Хэш карты", maskHash(r.hash), true) : "",
        ].join(""))}
        ${section("Плательщик", [
          field("E-mail", esc(maskEmail(r.email))),
          field("Телефон", maskPhone(r.phone), true),
          field("IP клиента", isAdmin ? r.ip : maskIp(r.ip), true),
        ].join(""))}
        ${section("Обработка", isAdmin ? [
          field("Процессор", esc(r.processor)),
          field("Магазин/Мерчант", `${esc(r.merchant)}<br><span class="text-muted">${esc(r.shop)}</span>`),
          field("Фрод-маркер", fraudBadge(r.fraud)),
          field("Тестовая транзакция", r.test ? "Да" : "Нет"),
        ].join("") : field("Магазин", esc(r.shop)))}
      </div>
    </div>`;
  document.body.classList.add("has-drawer");
  $(".drawer-close").focus();
}

function closeDrawer() {
  if (!$("#drawer-root").firstChild) return;
  $("#drawer-root").innerHTML = "";
  document.body.classList.remove("has-drawer");
  if (drawerReturnFocus && document.contains(drawerReturnFocus)) drawerReturnFocus.focus();
}

function trapFocus(e) {
  const drawer = $(".drawer");
  if (!drawer || e.key !== "Tab") return;
  const focusables = $$('button, [href], input, [tabindex]:not([tabindex="-1"])', drawer);
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
function toast({ kind = "success", title, body }) {
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.setAttribute("role", kind === "warning" ? "alert" : "status");
  el.innerHTML = `<span class="toast-icon" aria-hidden="true">${kind === "success" ? ICONS.toastCheck : ICONS.toastInfo}</span>
    <div><div class="toast-title">${esc(title)}</div><div class="toast-body">${esc(body)}</div></div>
    <button type="button" class="toast-close" aria-label="Закрыть уведомление">${ICONS.close}</button>`;
  const dismiss = () => el.remove();
  el.querySelector(".toast-close").addEventListener("click", dismiss);
  $(".toast-region").append(el);
  setTimeout(dismiss, 6000);
}

// ---------------------------------------------------------------------------
// XLSX export — minimal OOXML workbook in a stored (uncompressed) zip
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(12, dosTime, true);
    cd.setUint16(14, dosDate, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function buildXlsx(sheetName, table) {
  const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const col = (i) => { let s = ""; for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
  const rows = table.map((cells, r) => `<row r="${r + 1}">${cells.map((v, c) => {
    const ref = `${col(c)}${r + 1}`;
    return typeof v === "number" ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
  }).join("")}</row>`).join("");
  const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const nsR = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const width = table[0].length;
  return zipStore([
    { name: "[Content_Types].xml", text: `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>` },
    { name: "_rels/.rels", text: `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", text: `${head}<workbook ${ns} ${nsR}><sheets><sheet name="${x(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", text: `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", text: `${head}<worksheet ${ns}><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="${width}" width="20" customWidth="1"/></cols><sheetData>${rows}</sheetData></worksheet>` },
  ]);
}

function exportColumns() {
  const cols = [
    ["UID операции", (r) => r.uid],
    ["Трекинг ID", (r) => r.tracking],
    ["Дата и время", (r) => fmtDate(r.createdAt, true)],
    ["Описание платежа", (r) => r.desc],
    ["Тип транзакции", (r) => r.type],
    ["Плательщик", (r) => maskEmail(r.email)],
    ["Сумма, BYN", (r) => r.amount],
    ["Способ оплаты", (r) => method(r)],
    ["Статус", (r) => r.status],
  ];
  if (state.role === "admin") {
    cols.push(["Процессор", (r) => r.processor], ["Магазин/Мерчант", (r) => r.merchant], ["Фрод-маркер", (r) => r.fraud], ["Тест", (r) => (r.test ? "Да" : "Нет")]);
  }
  return cols;
}

function exportXlsx() {
  if (state.loading) return;
  if (state.results === null) {
    toast({ kind: "warning", title: "Нечего экспортировать", body: "Сначала выполните поиск — в файл попадут найденные операции." });
    return;
  }
  const all = sortedResults();
  const rows = state.selected.size ? all.filter((r) => state.selected.has(r.uid)) : all;
  if (!rows.length) {
    toast({ kind: "warning", title: "Нечего экспортировать", body: "По текущему запросу нет операций." });
    return;
  }
  const cols = exportColumns();
  const blob = buildXlsx("Платежи", [cols.map((c) => c[0]), ...rows.map((r) => cols.map((c) => c[1](r)))]);
  const d = new Date();
  const name = `payments_export_${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}.xlsx`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  const n = rows.length;
  toast({ title: "Экспорт завершён", body: `${name} — ${n} ${plural(n, "операция", "операции", "операций")}${state.selected.size ? " (выбранные)" : ""}` });
}

// ---------------------------------------------------------------------------
// Events (delegated)
// ---------------------------------------------------------------------------
function clearError(label) {
  if (!state.errors[label]) return;
  delete state.errors[label];
  syncErrors();
}

function maskDate(v) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join(".");
}

const form = $("#search-form");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!state.loading) runSearch();
});

form.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.matches(".field-input")) return;
  if (el.hasAttribute("data-digits")) el.value = el.value.replace(/\D/g, "");
  if (el.hasAttribute("data-date")) el.value = maskDate(el.value);
  state.values[el.dataset.field] = el.value;
  clearError(el.dataset.field);
});

form.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "adv-toggle") go(state.role, el.checked ? "advanced" : "basic");
  else if (el.matches("input[type=checkbox][data-field]")) state.values[el.dataset.field] = el.checked;
});

document.addEventListener("keydown", (e) => {
  const box = e.target.closest?.('[role="combobox"]');
  if (box) { onComboKeydown(e, box); return; }
  if (e.key === "Escape") {
    if (!tipEl.hidden) hideTooltip();
    else if ($(".drawer")) closeDrawer();
  }
  trapFocus(e);
});

document.addEventListener("mousedown", (e) => {
  if (openSelect && !openSelect.box.parentElement.contains(e.target)) closeListbox();
  if (e.target.closest('[role="option"]')) e.preventDefault(); // keep focus on the combobox
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

  const action = t.closest("[data-action]")?.dataset.action;
  const uid = t.closest("[data-uid]")?.dataset.uid;
  switch (action) {
    case "switch-role": go(state.role === "admin" ? "user" : "admin", state.mode); return;
    case "clear": clearFields(); return;
    case "export": exportXlsx(); return;
    case "reset-search": clearFields("#btn-search"); runSearch(); return;
    case "clear-selection": state.selected.clear(); renderResults(); $("#check-page")?.focus(); return;
    case "open": openDrawer(uid); return;
    case "flag": toggleFlag(uid); return;
    case "close-drawer": closeDrawer(); return;
  }

  const modeBtn = t.closest(".mode-tabs [data-mode]");
  if (modeBtn) { go(state.role, modeBtn.dataset.mode); return; }

  const sortBtn = t.closest("[data-sort]");
  if (sortBtn) {
    const key = sortBtn.dataset.sort;
    state.sort = state.sort.key === key
      ? { key, dir: state.sort.dir === "asc" ? "desc" : "asc" }
      : { key, dir: DEFAULT_DIR[key] };
    state.page = 1;
    renderResults();
    $(`[data-sort="${key}"]`)?.focus();
    return;
  }

  const pageBtn = t.closest("[data-page]");
  if (pageBtn && !pageBtn.disabled) {
    state.page = Number(pageBtn.dataset.page);
    renderResults();
    ($(`[data-page="${state.page}"][aria-current]`) || $("#results .pages"))?.focus();
    return;
  }

  // a plain click on a row opens its details; controls inside the row don't
  const row = t.closest("tr.is-clickable");
  if (row && !t.closest("button, label, input, a")) openDrawer(row.dataset.uid);
});

document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "check-page") {
    const rows = sortedResults().slice((state.page - 1) * state.perPage, state.page * state.perPage);
    rows.forEach((r) => (el.checked ? state.selected.add(r.uid) : state.selected.delete(r.uid)));
    renderResults();
    $("#check-page")?.focus();
  } else if (el.dataset.rowCheck) {
    const id = el.dataset.rowCheck;
    if (el.checked) state.selected.add(id); else state.selected.delete(id);
    renderResults();
    $(`[data-row-check="${id}"]`)?.focus();
  }
});

window.addEventListener("hashchange", () => {
  const prev = `${state.role}/${state.mode}`;
  readRoute();
  if (`${state.role}/${state.mode}` === prev) return;
  const focus = document.activeElement?.id === "adv-toggle" ? "#adv-toggle"
    : document.activeElement?.dataset?.mode ? `[data-mode="${state.mode}"]`
    : document.activeElement?.dataset?.action === "switch-role" ? '[data-action="switch-role"]' : null;
  closeListbox();
  closeDrawer();
  rerenderAll(focus);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
readRoute();
rerenderAll();
