// Screen registry + pure renderers for the console. Layout comes from
// docs/figma-prototype-plan/field-maps-new.json (passed in via setSpec);
// behaviour (filters, columns, aggregates, actions) lives here. Everything is
// DOM-free: app.js uses it live, tools/build-site.mjs renders static screens.
import { ICONS } from "./icons.js";
import * as D from "./data.js";
import * as UI from "./ui.js";

const { esc } = UI;
let SPEC = null;
export function setSpec(spec) { SPEC = spec; }
export const spec = () => SPEC;

export const NAV = {
  payments: { label: "Платежи", icon: "payments" },
  events: { label: "Журнал событий", icon: "log" },
  rules: { label: "Антифрод-правила", icon: "shield" },
  ads: { label: "Реклама", icon: "megaphone" },
  users: { label: "Пользователи", icon: "users" },
  reports: { label: "Отчёты", icon: "report" },
  merchants: { label: "Торговцы", icon: "building" },
  shops: { label: "Магазины", icon: "store" },
  subscriptions: { label: "Подписки", icon: "sub" },
  lists: { label: "Чёрные и белые списки", icon: "ban" },
  "tx-edit": { label: "Изменение транзакции", icon: "edit" },
  resend: { label: "Повторные уведомления", icon: "bell" },
  payouts: { label: "Выплаты", icon: "payout" },
  "fin-reports": { label: "Финансовые отчёты", icon: "report" },
  deposits: { label: "Страховые депозиты", icon: "safe" },
  balance: { label: "Баланс", icon: "wallet" },
  "mass-payouts": { label: "Массовые выплаты", icon: "stack" },
  "fin-info": { label: "Финансовая информация", icon: "chart" },
};
const FX = { BYN: 1, USD: 3.27, EUR: 3.55 };
const TEST_KEY = "Тестовые транзакции";

// ---------------------------------------------------------------------------
// State + routing  (#/<workspace>/<screen>[/<mode|tab>])
// ---------------------------------------------------------------------------
export function workspace(id) {
  return SPEC.workspaces.find((w) => w.id === id) || SPEC.workspaces[0];
}
export const persona = (state) => workspace(state.ws).persona;

export function createState(data, route = {}) {
  const state = { ws: "admin", screen: "payments", mode: "basic", tab: "profit", forms: {}, lists: {}, data, now: data.now, ui: { drawer: null, editUser: null } };
  applyRoute(state, route);
  return state;
}

export function parseHash(hash) {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [ws, a, b, c] = parts;
  // legacy "#admin/basic" links from the first MVP
  if (["basic", "advanced"].includes(a)) return { ws, screen: "payments", mode: a };
  const screen = a && b && SPEC.screens[`${a}/${b}`] ? `${a}/${b}` : a;
  const rest = screen && screen.includes("/") ? c : b;
  return { ws, screen, sub: rest };
}

export function applyRoute(state, { ws, screen, mode, sub } = {}) {
  const w = workspace(ws);
  state.ws = w.id;
  const base = screen ? screen.split("/")[0] : "payments";
  state.screen = w.screens.includes(base) ? screen || base : w.screens[0];
  if (state.screen === "payments") state.mode = (mode || sub) === "advanced" && SPEC.payments[w.persona].advanced ? "advanced" : "basic";
  if (state.screen === "fin-info") state.tab = SPEC.screens["fin-info"].tabs[sub] ? sub : "profit";
}

export function routeHash(state, over = {}) {
  const s = { ...state, ...over };
  const tail = s.screen === "payments" && SPEC.payments[workspace(s.ws).persona].advanced ? `/${s.mode}` : s.screen === "fin-info" ? `/${s.tab}` : "";
  return `#/${s.ws}/${s.screen}${tail}`;
}

export function formKey(state) {
  return state.screen === "fin-info" ? `${state.ws}:fin-info:${state.tab}` : `${state.ws}:${state.screen}`;
}
export function form(state, key = formKey(state)) {
  if (!state.forms[key]) state.forms[key] = { values: defaultValues(state), errors: {} };
  return state.forms[key];
}
export function list(state, key = formKey(state)) {
  if (!state.lists[key]) state.lists[key] = { results: null, loading: false, sort: null, page: 1, perPage: 10, selected: new Set(), view: null, found: null, sent: null };
  return state.lists[key];
}

// ---------------------------------------------------------------------------
// Layout + fields
// ---------------------------------------------------------------------------
export function layout(state) {
  if (state.screen === "payments") {
    const p = SPEC.payments[persona(state)];
    const mode = p.advanced ? state.mode : "basic";
    return { title: "Список платежей", groups: p[mode], groupsInline: p.groupsInline, footer: p.footer, kind: persona(state) === "accounting" ? "agg-payments" : "payments", hasModes: Boolean(p.advanced) };
  }
  const s = SPEC.screens[state.screen];
  if (state.screen === "fin-info") {
    const t = s.tabs[state.tab];
    return { ...s, groups: t.groups, groupsInline: t.groupsInline, kind: "fin-info" };
  }
  return { ...s, kind: state.screen };
}

export function fieldKey(f) {
  return f.type === "checkbox" && f.extra.length && !["mode", "test"].includes(f.extra[0]) ? `${f.extra[0]}:${f.name}` : f.name;
}

function visible(f, state) {
  if (f.extra.includes("admin") && persona(state) !== "admin") return false;
  return true;
}

// Groups with persona/visibility rules applied (and dependent selects for rules)
export function groupsOf(state) {
  const L = layout(state);
  const groups = (L.groups || []).map((g) => ({
    title: g.title,
    rows: g.rows.map((row) => row.map(UI.parseField).filter((f) => visible(f, state))).filter((r) => r.length),
  }));
  if (L.dependent) {
    const vals = form(state).values;
    const extra = Object.entries(L.dependent).filter(([lvl]) => vals[`level:${lvl}`]).map(([, raw]) => UI.parseField(raw));
    if (extra.length) groups.push({ title: "", rows: [extra] });
  }
  return groups;
}

export function activeFields(state) {
  const fields = groupsOf(state).flatMap((g) => g.rows.flat());
  if (state.screen === "users/new") fields.push(...SPEC.screens["users/new"].form.map(UI.parseField));
  return fields;
}

function defaultValues(state) {
  const values = {};
  const L = layout(state);
  for (const g of L.groups || []) for (const row of g.rows) for (const raw of row) {
    const f = UI.parseField(raw);
    if (f.type === "checkbox" && f.extra.includes("all")) values[fieldKey(f)] = true;
  }
  if (state.screen === "users/new") values["Активирован"] = true;
  return values;
}

const activeTz = (state) => (activeFields(state).some((f) => f.name === "Временная зона") ? D.tzByLabel(form(state).values["Временная зона"]) : D.DEFAULT_TZ);

export function persistentTip(state, f) {
  if (f.name === "Временная зона" && form(state).values[f.name]) return `Временная зона ${form(state).values[f.name]}`;
  return f.tip || SPEC.tooltips.persistent[f.name] || null;
}

const isMulti = (state) => Boolean(layout(state).multiToggle && form(state).values.__multi);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const RULES = {
  "Сумма": [(v) => /^\d+([.,]\d{1,2})?$/.test(v), "Введите сумму, например 145.00"],
  "Последние 4 цифры карты": [(v) => /^\d{4}$/.test(v), "Введите последние 4 цифры карты"],
  "БИН карты": [(v) => /^\d{6}$/.test(v), "БИН — первые 6 цифр карты"],
  "Маска карты": [(v) => /^\d{6}\s*[xх*•]{4}\s*\d{4}$/i.test(v), "Формат маски: 123456 xxxx 1234"],
  "С": [(v) => D.parseDate(v) !== null, "Введите дату в формате дд.мм.гггг"],
  "По": [(v) => D.parseDate(v) !== null, "Введите дату в формате дд.мм.гггг"],
  "IP клиента": [(v) => /^[\d.]+$/.test(v), "Допустимы только цифры и точки"],
  "E-mail клиента": [(v) => !/\s/.test(v), "E-mail не может содержать пробелы"],
  "Email": [(v) => EMAIL.test(v), "Введите корректный e-mail"],
  "E-mail получателя отчёта": [(v) => EMAIL.test(v), "Введите корректный e-mail"],
  "RRN": [(v) => /^\d{12}$/.test(v), "RRN — 12 цифр"],
  "Bank code": [(v) => /^\d{2,3}$/.test(v), "Код ответа банка — 2–3 цифры"],
  "Payment date": [(v) => ISO.test(v), "Формат: 2026-10-24T18:03:06.140Z"],
  "Settled date": [(v) => ISO.test(v), "Формат: 2026-10-24T18:03:06.140Z"],
};

export function validate(state, fields = activeFields(state), values = form(state).values) {
  const errors = {};
  for (const f of fields) {
    const key = fieldKey(f);
    const v = values[key];
    const empty = v === undefined || v === "" || v === false || (Array.isArray(v) && !v.length);
    if (f.required && empty) { errors[key] = f.type === "select" ? "Выберите значение" : f.type === "file" ? "Прикрепите файл" : "Заполните поле"; continue; }
    if (typeof v !== "string" || !v.trim()) continue;
    const rule = RULES[f.name];
    if (rule && !rule[0](v.trim())) errors[key] = rule[1];
  }
  const names = fields.map((f) => f.name);
  if (!errors["С"] && !errors["По"] && values["С"] && values["По"] && names.includes("С") && D.parseDate(values["По"]) < D.parseDate(values["С"])) {
    errors["По"] = "Дата «По» не может быть раньше даты «С»";
  }
  if (state.screen === "users/new" && !D.ROLES.some((r) => values[`role:${r}`])) errors["Роли"] = "Выберите хотя бы одну роль";
  return errors;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------
const anyOf = (v, fn) => (Array.isArray(v) ? !v.length || v.some(fn) : fn(v));
const F = {
  contains: (k) => (r, v) => String(r[k] ?? "").toLowerCase().includes(v.trim().toLowerCase()),
  eq: (k) => (r, v) => anyOf(v, (x) => r[k] === x),
  digits: (k) => (r, v) => String(r[k]).replace(/\D/g, "").includes(v.replace(/\D/g, "")),
  from: (k) => (r, v, c) => r[k] >= D.parseDate(v, c.tz),
  to: (k) => (r, v, c) => r[k] < D.parseDate(v, c.tz) + D.DAY,
  rel: (k) => (r, v, c) => anyOf(v, (x) => r[k] >= D.relativeFrom(x, c.now, c.tz)),
  search: (keys) => (r, v) => keys.some((k) => String(r[k] ?? "").toLowerCase().includes(v.trim().toLowerCase())),
};

const PAYMENT_FILTERS = {
  "UID операции": F.contains("uid"),
  "Трекинг ID": F.contains("tracking"),
  "Описание платежа": F.contains("desc"),
  "Сумма": (r, v) => Math.abs(r.amount - parseFloat(v.replace(",", "."))) < 0.005,
  "RNN": F.digits("rnn"),
  "ID банка": F.contains("bankId"),
  "ID торговца": F.contains("merchantId"),
  "Тип транзакции": F.eq("type"),
  "Статус": F.eq("status"),
  "Процессор": F.eq("processor"),
  "Способ оплаты": F.eq("brand"),
  "Номер счёта ЕРИП": F.digits("erip"),
  "Торговец": F.eq("merchant"),
  "Магазин": F.eq("shop"),
  "С": F.from("createdAt"),
  "По": F.to("createdAt"),
  "Последние 4 цифры карты": (r, v) => r.last4 === v.trim(),
  "БИН карты": (r, v) => r.bin === v.trim(),
  "Владелец карты": F.contains("holder"),
  "Маска карты": (r, v) => { const d = v.replace(/\D/g, ""); return r.bin === d.slice(0, 6) && r.last4 === d.slice(-4); },
  "Хэш карты": F.contains("hash"),
  "Страна банка-эмитента": F.eq("country"),
  "Страна банка-эквайера": F.eq("acquirerCountry"),
  "Страна плательщика": F.eq("country"),
  "E-mail клиента": F.contains("email"),
  "Имя клиента": F.contains("name"),
  "Телефон клиента": F.digits("phone"),
  "IP клиента": F.contains("ip"),
  "Номер аккаунта": F.contains("account"),
  "Дата создания": F.rel("createdAt"),
  "Дата проведения операции": F.rel("createdAt"),
  "Дата создания транзакции": F.rel("createdAt"),
  "Результат проверки": F.eq("checkResult"),
  "PSP": F.eq("psp"),
  "Банк": F.eq("bank"),
  "Валюта": F.eq("currency"),
};

const SCREEN_FILTERS = {
  events: { "UID операции": F.contains("uid"), "Gateway ID запроса": F.contains("gatewayId"), "Уровень": F.eq("level") },
  shops: { "Торговец": F.eq("merchant"), "Поиск": F.search(["id", "name", "merchant", "url"]) },
  merchants: { "Поиск": F.search(["id", "name", "company", "email"]) },
  subscriptions: { "Статус": F.eq("status"), "С": F.from("createdAt"), "По": F.to("createdAt"), "Поиск": F.search(["id", "email", "merchant", "plan"]) },
  lists: { "Поиск": F.search(["value", "raw", "kind", "list", "reason", "addedBy"]) },
  payouts: { "Банк": F.eq("bank"), "С": F.from("date"), "По": F.to("date") },
  "fin-reports": { "Поиск": F.search(["id", "title", "merchant"]), "Статус": F.eq("status"), "Торговец": F.eq("merchant"), "Магазин": F.eq("shop"), "С": F.from("createdAt"), "По": F.to("createdAt") },
  deposits: { "Статус": F.eq("status"), "Торговец": F.eq("merchant"), "Магазин": F.eq("shop"), "Банк": F.eq("bank"), "С": F.from("createdAt"), "По": F.to("createdAt") },
  "mass-payouts": { "Поиск": F.search(["id", "file", "email", "merchant", "shop"]), "Статус": F.eq("status"), "Торговец": F.eq("merchant"), "Магазин": F.eq("shop"), "С": F.from("createdAt"), "По": F.to("createdAt") },
  rules: { "Торговец": F.eq("merchant"), "Магазин": F.eq("shop") },
};

const isSet = (v) => v === true || (typeof v === "string" && v.trim() !== "") || (Array.isArray(v) && v.length > 0);

function applyFilters(state, rows, filters) {
  const values = form(state).values;
  const ctx = { tz: activeTz(state), now: state.now };
  const active = activeFields(state).map((f) => [f.name, values[fieldKey(f)]]).filter(([name, v]) => filters[name] && isSet(v));
  return rows.filter((r) => active.every(([name, v]) => filters[name](r, v, ctx)));
}

// checkbox group with an "all" member → list of checked names (empty = all)
function groupPicks(state, group) {
  const values = form(state).values;
  const fields = activeFields(state).filter((f) => f.type === "checkbox" && f.extra[0] === group);
  if (fields.some((f) => f.extra.includes("all") && values[fieldKey(f)])) return [];
  return fields.filter((f) => values[fieldKey(f)]).map((f) => f.name);
}

// ---------------------------------------------------------------------------
// Queries (sync; the app adds a loading state around them)
// ---------------------------------------------------------------------------
const toByn = (r) => r.amount * (FX[r.currency] || 1);
const periodOf = (ms, by, tz) => {
  if (by === "По месяцам" || by === "month") return D.fmtMonth(ms, tz);
  if (by === "По неделям") {
    const d = new Date(ms + tz.offset * 60000);
    const monday = ms - (((d.getUTCDay() + 6) % 7) * D.DAY);
    return `Неделя с ${D.fmtDay(monday, tz)}`;
  }
  return D.fmtDay(ms, tz);
};

function aggregate(rows, keyFn, init, add) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!map.has(k)) map.set(k, init(r));
    add(map.get(k), r);
  }
  return [...map.values()];
}

export function query(state) {
  const L = layout(state);
  const d = state.data;
  const values = form(state).values;
  const tz = activeTz(state);
  switch (L.kind) {
    case "payments": {
      const test = Boolean(values[TEST_KEY]) && activeFooterChecks(state).includes("test");
      return applyFilters(state, d.payments, PAYMENT_FILTERS).filter((r) => r.test === test);
    }
    case "agg-payments": {
      const by = values["group:По дням"] ? "day" : values["group:По месяцам"] ? "month" : null;
      const rows = applyFilters(state, d.payments, PAYMENT_FILTERS).filter((r) => !r.test && r.status === "Одобрена");
      return aggregate(rows, (r) => `${by ? periodOf(r.createdAt, by, tz) : ""}|${r.psp}|${r.bank}`,
        (r) => ({ id: `${r.psp}-${r.bank}-${by ? periodOf(r.createdAt, by, tz) : "all"}`, period: by ? periodOf(r.createdAt, by, tz) : "Весь период", sortTime: r.createdAt, psp: r.psp, bank: r.bank, count: 0, turnover: 0 }),
        (a, r) => { a.count += 1; a.turnover += toByn(r); a.sortTime = Math.max(a.sortTime, r.createdAt); })
        .map((a) => ({ ...a, fee: a.turnover * 0.018, payable: a.turnover * 0.982 }));
    }
    case "reports": {
      const by = (Array.isArray(values["Способ группировки"]) ? values["Способ группировки"][0] : values["Способ группировки"]) || "По дням";
      const rows = applyFilters(state, d.payments, PAYMENT_FILTERS).filter((r) => !r.test);
      return aggregate(rows, (r) => `${periodOf(r.createdAt, by, tz)}|${r.merchant}|${r.type}|${r.currency}`,
        (r) => ({ id: `${periodOf(r.createdAt, by, tz)}|${r.merchant}|${r.type}|${r.currency}`, period: periodOf(r.createdAt, by, tz), sortTime: r.createdAt, merchant: r.merchant, type: r.type, currency: r.currency, count: 0, sum: 0 }),
        (a, r) => { a.count += 1; a.sum += r.amount; a.sortTime = Math.max(a.sortTime, r.createdAt); });
    }
    case "rules": {
      const levels = activeFields(state).filter((f) => f.extra[0] === "level").filter((f) => values[fieldKey(f)]).map((f) => f.name);
      const allowed = persona(state) === "admin" ? ["PSP", "Merchant", "Shop"] : ["Merchant", "Shop"];
      return applyFilters(state, d.rules, SCREEN_FILTERS.rules).filter((r) => allowed.includes(r.level) && (!levels.length || levels.includes(r.level)));
    }
    case "ads": {
      const cats = groupPicks(state, "cat").map((c) => ({ "PSP": "PSP", "Торговцы": "Торговцы", "Шлюзы": "Шлюзы" }[c]));
      const sts = groupPicks(state, "status").map((s) => ({ "Активные": "Активна", "Неактивные": "Неактивна", "Законченные": "Закончена" }[s]));
      return d.ads.filter((a) => (!cats.length || cats.includes(a.category)) && (!sts.length || sts.includes(a.status)));
    }
    case "merchants": {
      const st = groupPicks(state, "state");
      return applyFilters(state, d.merchants, SCREEN_FILTERS.merchants).filter((m) => !st.length || (st.includes("Активные") && m.active) || (st.includes("Отключённые") && !m.active));
    }
    case "users": return d.users;
    case "payouts": {
      const rows = applyFilters(state, d.payouts, SCREEN_FILTERS.payouts);
      return list(state).view === "history" ? rows.filter((p) => p.status === "Выплачена") : rows;
    }
    case "balance": {
      const m = values["Торговец"];
      if (!m) return [];
      const approved = d.payments.filter((p) => p.merchant === m && p.status === "Одобрена" && !p.test && p.createdAt > state.now - 30 * D.DAY);
      const gross = approved.reduce((s, p) => s + toByn(p), 0) * 0.982;
      const held = d.deposits.filter((x) => x.merchant === m && x.status === "Удерживается").reduce((s, x) => s + x.amount, 0);
      const merchant = d.merchants.find((x) => x.name === m);
      return [{ id: m, company: merchant ? merchant.company : m, balance: gross, available: Math.max(0, gross - held), held }];
    }
    case "fin-info": return finInfo(state);
    default: {
      const filters = SCREEN_FILTERS[state.screen];
      const ds = { events: "events", shops: "shops", subscriptions: "subscriptions", lists: "lists", "fin-reports": "finReports", deposits: "deposits", "mass-payouts": "massPayouts" }[state.screen];
      return ds ? applyFilters(state, d[ds], filters || {}) : [];
    }
  }
}

function finInfo(state) {
  const d = state.data;
  const pays = applyFilters(state, d.payments, PAYMENT_FILTERS).filter((r) => !r.test);
  if (state.tab === "deposits") {
    const deps = applyFilters(state, d.deposits.filter((x) => x.status === "Удерживается"), SCREEN_FILTERS.deposits);
    return aggregate(deps, (x) => x.merchant, (x) => ({ id: x.merchant, merchant: x.merchant, count: 0, amount: 0, nextRelease: Infinity }),
      (a, x) => { a.count += 1; a.amount += x.amount; a.nextRelease = Math.min(a.nextRelease, x.holdUntil); });
  }
  if (state.tab === "payable") {
    return aggregate(pays.filter((p) => p.status === "Одобрена"), (p) => `${p.merchant}|${p.shop}`, (p) => ({ id: `${p.merchant}|${p.shop}`, merchant: p.merchant, shop: p.shop, accrued: 0 }),
      (a, p) => { a.accrued += toByn(p) * 0.982; }).map((a) => ({ ...a, held: a.accrued * 0.05, payable: a.accrued * 0.95 }));
  }
  if (state.tab === "turnover") {
    return aggregate(pays, (p) => p.merchant, (p) => ({ id: p.merchant, merchant: p.merchant, count: 0, turnover: 0, refunds: 0 }),
      (a, p) => { if (p.status === "Одобрена") { a.count += 1; a.turnover += toByn(p); } if (p.status === "Возврат") a.refunds += toByn(p); })
      .map((a) => ({ ...a, net: a.turnover - a.refunds }));
  }
  return aggregate(pays.filter((p) => p.status === "Одобрена"), (p) => p.merchant, (p) => ({ id: p.merchant, merchant: p.merchant, turnover: 0 }),
    (a, p) => { a.turnover += toByn(p); }).map((a) => ({ ...a, fee: a.turnover * 0.018, cost: a.turnover * 0.009, profit: a.turnover * 0.009 }));
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------
const byn = (n) => D.money(n, "BYN");
const COLS = {
  events: [
    { key: "time", title: "Время", width: 130, sortable: true, render: (r, s) => D.fmtDate(r.time, s.tz, true) },
    { key: "level", title: "Уровень", width: 120, sortable: true, render: (r) => UI.badge(r.level) },
    { key: "uid", title: "UID операции", width: 130, mono: true },
    { key: "gatewayId", title: "Gateway ID запроса", width: 170, mono: true },
    { key: "source", title: "Источник", width: 120 },
    { key: "message", title: "Сообщение", width: 320 },
  ],
  rules: [
    { key: "id", title: "ID", width: 80, mono: true },
    { key: "name", title: "Правило", width: 280, sortable: true },
    { key: "level", title: "Уровень", width: 100, sortable: true },
    { key: "object", title: "Объект", width: 190 },
    { key: "action", title: "Действие", width: 140, center: true, render: (r) => UI.badge(r.action) },
    { key: "enabled", title: "Активно", width: 100, render: (r) => UI.switchControl({ label: `Правило ${r.id} активно`, checked: r.enabled, attrs: `data-rule-toggle="${r.id}"` }) },
    { key: "updatedAt", title: "Обновлено", width: 120, sortable: true, render: (r, s) => D.fmtDay(r.updatedAt, s.tz) },
  ],
  ads: [
    { key: "title", title: "Название", width: 300, sortable: true },
    { key: "category", title: "Категория", width: 110, sortable: true },
    { key: "target", title: "Получатель", width: 170 },
    { key: "start", title: "Период", width: 200, sortable: true, render: (r, s) => `${D.fmtDay(r.start, s.tz)} — ${D.fmtDay(r.end, s.tz)}` },
    { key: "status", title: "Статус", width: 130, center: true, sortable: true, render: (r) => UI.badge(r.status) },
    { key: "views", title: "Показы", width: 100, num: true, sortable: true, render: (r) => r.views.toLocaleString("ru-RU") },
  ],
  users: [
    { key: "name", title: "Имя", width: 190, sortable: true },
    { key: "email", title: "Email", width: 230 },
    { key: "roles", title: "Роли", width: 300, render: (r) => r.roles.map((x) => `<span class="chip">${esc(x)}</span>`).join(" ") },
    { key: "active", title: "Статус", width: 130, center: true, render: (r) => UI.badge(r.active ? "Активен" : "Отключён") },
    { key: "createdAt", title: "Создан", width: 120, sortable: true, render: (r, s) => D.fmtDay(r.createdAt, s.tz) },
    { key: "actions", title: "Действия", width: 90, render: (r) => `<div class="actions-cell"><button type="button" class="icon-btn" data-action="edit-user" data-uid="${r.id}" aria-label="Редактировать ${esc(r.name)}">${ICONS.edit}</button></div>` },
  ],
  reports: [
    { key: "sortTime", title: "Период", width: 170, sortable: true, render: (r) => esc(r.period) },
    { key: "merchant", title: "Торговец", width: 190, sortable: true },
    { key: "type", title: "Тип транзакции", width: 140, sortable: true },
    { key: "currency", title: "Валюта", width: 90 },
    { key: "count", title: "Операций", width: 110, num: true, sortable: true },
    { key: "sum", title: "Сумма", width: 150, num: true, mono: true, sortable: true, render: (r) => D.money(r.sum, r.currency) },
  ],
  merchants: [
    { key: "id", title: "ID", width: 90, mono: true },
    { key: "name", title: "Торговец", width: 210, sortable: true },
    { key: "company", title: "Компания", width: 170 },
    { key: "email", title: "Email", width: 230 },
    { key: "shopsCount", title: "Магазинов", width: 110, num: true, sortable: true },
    { key: "active", title: "Статус", width: 130, center: true, render: (r) => UI.badge(r.active ? "Активен" : "Отключён") },
    { key: "createdAt", title: "Создан", width: 120, sortable: true, render: (r, s) => D.fmtDay(r.createdAt, s.tz) },
  ],
  shops: [
    { key: "id", title: "ID", width: 90, mono: true },
    { key: "name", title: "Магазин", width: 210, sortable: true },
    { key: "merchant", title: "Торговец", width: 210, sortable: true },
    { key: "url", title: "Сайт", width: 220 },
    { key: "currency", title: "Валюта", width: 90 },
    { key: "active", title: "Статус", width: 130, center: true, render: (r) => UI.badge(r.active ? "Активен" : "Отключён") },
  ],
  subscriptions: [
    { key: "id", title: "ID подписки", width: 120, mono: true },
    { key: "email", title: "Клиент", width: 190, render: (r) => esc(D.maskEmail(r.email)) },
    { key: "merchant", title: "Торговец", width: 190, sortable: true },
    { key: "plan", title: "План", width: 110 },
    { key: "amount", title: "Сумма", width: 120, num: true, mono: true, sortable: true, render: (r) => D.money(r.amount, r.currency) },
    { key: "status", title: "Статус", width: 150, center: true, sortable: true, render: (r) => UI.badge(r.status) },
    { key: "nextCharge", title: "Следующее списание", width: 160, sortable: true, render: (r, s) => (r.nextCharge ? D.fmtDay(r.nextCharge, s.tz) : "—") },
  ],
  lists: [
    { key: "value", title: "Значение", width: 210, mono: true },
    { key: "kind", title: "Тип", width: 100, sortable: true },
    { key: "list", title: "Список", width: 110, center: true, sortable: true, render: (r) => UI.badge(r.list) },
    { key: "reason", title: "Причина", width: 240 },
    { key: "addedAt", title: "Добавлено", width: 120, sortable: true, render: (r, s) => D.fmtDay(r.addedAt, s.tz) },
    { key: "addedBy", title: "Кем", width: 170 },
  ],
  payouts: [
    { key: "id", title: "ID выплаты", width: 110, mono: true },
    { key: "merchant", title: "Торговец", width: 210, sortable: true },
    { key: "bank", title: "Банк", width: 150, sortable: true },
    { key: "amount", title: "Сумма", width: 150, num: true, mono: true, sortable: true, render: (r) => D.money(r.amount, r.currency) },
    { key: "status", title: "Статус", width: 150, center: true, sortable: true, render: (r) => UI.badge(r.status) },
    { key: "date", title: "Дата", width: 120, sortable: true, render: (r, s) => D.fmtDay(r.date, s.tz) },
  ],
  "fin-reports": [
    { key: "id", title: "ID", width: 100, mono: true },
    { key: "title", title: "Название", width: 280, sortable: true },
    { key: "merchant", title: "Торговец", width: 190, sortable: true },
    { key: "shop", title: "Магазин", width: 170 },
    { key: "status", title: "Статус", width: 140, center: true, sortable: true, render: (r) => UI.badge(r.status) },
    { key: "createdAt", title: "Сформирован", width: 130, sortable: true, render: (r, s) => D.fmtDay(r.createdAt, s.tz) },
    { key: "actions", title: "Файл", width: 70, render: (r) => (r.status === "Готов" ? `<div class="actions-cell"><button type="button" class="icon-btn" data-action="download-report" data-uid="${r.id}" aria-label="Скачать ${esc(r.title)}">${ICONS.download}</button></div>` : "—") },
  ],
  deposits: [
    { key: "id", title: "ID", width: 100, mono: true },
    { key: "merchant", title: "Торговец", width: 190, sortable: true },
    { key: "shop", title: "Магазин", width: 170 },
    { key: "bank", title: "Банк", width: 130 },
    { key: "amount", title: "Сумма", width: 140, num: true, mono: true, sortable: true, render: (r) => D.money(r.amount, r.currency) },
    { key: "createdAt", title: "Внесён", width: 110, sortable: true, render: (r, s) => D.fmtDay(r.createdAt, s.tz) },
    { key: "holdUntil", title: "Удержан до", width: 120, sortable: true, render: (r, s) => D.fmtDay(r.holdUntil, s.tz) },
    { key: "status", title: "Статус", width: 140, center: true, sortable: true, render: (r) => UI.badge(r.status) },
  ],
  "mass-payouts": [
    { key: "id", title: "ID", width: 90, mono: true },
    { key: "file", title: "Файл", width: 190, mono: true },
    { key: "merchant", title: "Торговец", width: 180, sortable: true },
    { key: "shop", title: "Магазин", width: 160 },
    { key: "email", title: "Получатель отчёта", width: 210 },
    { key: "rowsCount", title: "Строк", width: 80, num: true, sortable: true, render: (r) => (r.rowsCount ?? "—") },
    { key: "amount", title: "Сумма", width: 140, num: true, mono: true, sortable: true, render: (r) => (r.amount ? D.money(r.amount, r.currency) : "—") },
    { key: "status", title: "Статус", width: 140, center: true, sortable: true, render: (r) => UI.badge(r.status) },
    { key: "createdAt", title: "Создано", width: 110, sortable: true, render: (r, s) => D.fmtDay(r.createdAt, s.tz) },
  ],
  "agg-payments": [
    { key: "sortTime", title: "Период", width: 150, sortable: true, render: (r) => esc(r.period) },
    { key: "psp", title: "PSP", width: 130, sortable: true },
    { key: "bank", title: "Банк", width: 150, sortable: true },
    { key: "count", title: "Операций", width: 110, num: true, sortable: true },
    { key: "turnover", title: "Оборот, BYN", width: 160, num: true, mono: true, sortable: true, render: (r) => byn(r.turnover) },
    { key: "fee", title: "Комиссия", width: 140, num: true, mono: true, sortable: true, render: (r) => byn(r.fee) },
    { key: "payable", title: "К выплате", width: 160, num: true, mono: true, sortable: true, render: (r) => byn(r.payable) },
  ],
  "fin-info:profit": [
    { key: "merchant", title: "Торговец", width: 220, sortable: true },
    { key: "turnover", title: "Оборот", width: 170, num: true, mono: true, sortable: true, render: (r) => byn(r.turnover) },
    { key: "fee", title: "Комиссия", width: 160, num: true, mono: true, sortable: true, render: (r) => byn(r.fee) },
    { key: "cost", title: "Расходы процессинга", width: 190, num: true, mono: true, render: (r) => byn(r.cost) },
    { key: "profit", title: "Прибыль", width: 160, num: true, mono: true, sortable: true, render: (r) => byn(r.profit) },
  ],
  "fin-info:turnover": [
    { key: "merchant", title: "Торговец", width: 220, sortable: true },
    { key: "count", title: "Операций", width: 120, num: true, sortable: true },
    { key: "turnover", title: "Оборот", width: 170, num: true, mono: true, sortable: true, render: (r) => byn(r.turnover) },
    { key: "refunds", title: "Возвраты", width: 160, num: true, mono: true, render: (r) => byn(r.refunds) },
    { key: "net", title: "Чистый оборот", width: 170, num: true, mono: true, sortable: true, render: (r) => byn(r.net) },
  ],
  "fin-info:payable": [
    { key: "merchant", title: "Торговец", width: 210, sortable: true },
    { key: "shop", title: "Магазин", width: 190 },
    { key: "accrued", title: "Начислено", width: 160, num: true, mono: true, render: (r) => byn(r.accrued) },
    { key: "held", title: "Удержано (5%)", width: 150, num: true, mono: true, render: (r) => byn(r.held) },
    { key: "payable", title: "К выплате", width: 160, num: true, mono: true, sortable: true, render: (r) => byn(r.payable) },
  ],
  "fin-info:deposits": [
    { key: "merchant", title: "Торговец", width: 220, sortable: true },
    { key: "count", title: "Депозитов", width: 120, num: true },
    { key: "amount", title: "Удерживается", width: 170, num: true, mono: true, sortable: true, render: (r) => byn(r.amount) },
    { key: "nextRelease", title: "Ближайший возврат", width: 180, sortable: true, render: (r, s) => D.fmtDay(r.nextRelease, s.tz) },
  ],
};

const PAY_WIDTH = { "UID операции": 124, "Трекинг ID": 112, "Дата и время": 108, "Описание платежа": 200, "Тип транзакции": 124, "Плательщик": 150, "Сумма": 124, "Способ оплаты": 170, "Статус": 132, "Процессор": 110, "Магазин/Мерчант": 150, "Фрод-маркер": 120, "Тест": 60, "Действия": 90 };
function paymentColumns(state) {
  const internal = persona(state) !== "user";
  const cols = [
    { key: "uid", title: "UID операции", mono: true },
    { key: "tracking", title: "Трекинг ID", mono: true },
    { key: "createdAt", title: "Дата и время", sortable: true, render: (r, s) => D.fmtDate(r.createdAt, s.tz) },
    { key: "desc", title: "Описание платежа" },
    { key: "type", title: "Тип транзакции", sortable: true },
    { key: "email", title: "Плательщик", render: (r) => esc(D.maskEmail(r.email)) },
    { key: "amount", title: "Сумма", num: true, mono: true, sortable: true, render: (r) => D.money(r.amount, r.currency) },
    { key: "brand", title: "Способ оплаты", render: (r) => D.cardMethod(r) },
    { key: "status", title: "Статус", center: true, sortable: true, render: (r) => UI.badge(r.status) },
  ];
  if (internal) cols.push(
    { key: "processor", title: "Процессор" },
    { key: "merchant", title: "Магазин/Мерчант" },
    { key: "fraud", title: "Фрод-маркер", render: (r) => (r.fraud === "—" ? "—" : UI.badge(r.fraud)) },
    { key: "test", title: "Тест", render: (r) => (r.test ? "Да" : "Нет") },
  );
  cols.push({ key: "actions", title: "Действия", render: (r) => `<div class="actions-cell">
    <button type="button" class="icon-btn" data-action="open-payment" data-uid="${r.uid}" aria-label="Детали операции ${r.uid}">${ICONS.eye}</button>
    ${persona(state) === "admin" ? `<button type="button" class="icon-btn" data-action="flag" data-uid="${r.uid}" aria-pressed="${r.fraud !== "—"}" aria-label="Пометить ${r.uid} как подозрительную">${ICONS.flag}</button>` : ""}
  </div>` });
  return cols.map((c) => ({ ...c, width: PAY_WIDTH[c.title] }));
}

export function columns(state) {
  const L = layout(state);
  const tz = activeTz(state);
  const raw = L.kind === "payments" ? paymentColumns(state) : COLS[L.kind === "fin-info" ? `fin-info:${state.tab}` : L.kind] || [];
  // bind time zone into renderers
  return raw.map((c) => ({ ...c, render: c.render ? (r) => c.render(r, { tz }) : null }));
}

const DEFAULT_SORT = {
  payments: { key: "createdAt", dir: "desc" }, events: { key: "time", dir: "desc" }, reports: { key: "sortTime", dir: "desc" },
  "agg-payments": { key: "sortTime", dir: "desc" }, rules: { key: "updatedAt", dir: "desc" }, ads: { key: "start", dir: "desc" },
  users: { key: "createdAt", dir: "desc" }, merchants: { key: "name", dir: "asc" }, shops: { key: "name", dir: "asc" },
  subscriptions: { key: "nextCharge", dir: "asc" }, lists: { key: "addedAt", dir: "desc" }, payouts: { key: "date", dir: "desc" },
  "fin-reports": { key: "createdAt", dir: "desc" }, deposits: { key: "holdUntil", dir: "asc" }, "mass-payouts": { key: "createdAt", dir: "desc" },
};
export const defaultDir = (key) => (["name", "merchant", "title", "type", "status", "level", "category", "kind", "list", "psp", "bank"].includes(key) ? "asc" : "desc");

export function sorted(state) {
  const L = layout(state);
  const ls = list(state);
  const sort = ls.sort || DEFAULT_SORT[L.kind] || (L.kind === "fin-info" ? { key: columns(state)[1].key, dir: "desc" } : null);
  if (!sort || !ls.results) return ls.results || [];
  const mul = sort.dir === "asc" ? 1 : -1;
  return [...ls.results].sort((a, b) => {
    const x = a[sort.key], y = b[sort.key];
    if (x == null) return 1; if (y == null) return -1;
    return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "ru")) * mul;
  });
}
export const currentSort = (state) => list(state).sort || DEFAULT_SORT[layout(state).kind] || null;

// ---------------------------------------------------------------------------
// Rendering — shell
// ---------------------------------------------------------------------------
export function renderSidebar(state) {
  const w = workspace(state.ws);
  const base = state.screen.split("/")[0];
  return `<aside class="sidebar" aria-label="Навигация">
    <div class="sidebar-brand">${ICONS.logo}<span>Paid</span><span class="brand-sub">Operations</span></div>
    <div class="sidebar-ws">
      <span class="sidebar-label" id="ws-label">Рабочее место</span>
      <div class="select-wrap">${UI.select({ id: "ws-switch", label: "Рабочее место", placeholder: "", value: w.title, options: SPEC.workspaces.map((x) => x.title), reset: false, attrs: 'data-ws-switch aria-labelledby="ws-label"' })}</div>
    </div>
    <nav class="sidebar-nav"><ul>${w.screens.map((id) => `<li><a href="${routeHash({ ...state, screen: id, mode: "basic", tab: "profit" })}" class="nav-link"${id === base ? ' aria-current="page"' : ""}>${ICONS.nav[NAV[id].icon]}<span>${esc(NAV[id].label)}</span></a></li>`).join("")}</ul></nav>
    <div class="sidebar-foot text-caption"><a href="/new/design-system/">Дизайн-система</a><a href="/screens">Экраны для Figma</a><a href="/new">NEW экраны для Figma</a></div>
  </aside>`;
}

function personaBadge(state) {
  const w = workspace(state.ws);
  const cls = w.persona === "admin" ? "role-admin" : w.persona === "user" ? "role-user" : "role-neutral";
  return `<span class="role-badge ${cls}"><span class="dot" aria-hidden="true"></span>${esc(w.title)}</span>`;
}

function pageHead(state, L) {
  const actions = [];
  if (L.kind === "payments" || L.kind === "agg-payments") actions.push(personaBadge(state));
  if (L.hasModes) actions.push(`<div class="mode-tabs" role="group" aria-label="Режим поиска">
      <button type="button" data-mode="basic" aria-pressed="${state.mode === "basic"}">Простой</button>
      <button type="button" data-mode="advanced" aria-pressed="${state.mode === "advanced"}">Расширенный</button></div>`);
  for (const raw of L.headerActions || []) actions.push(UI.button(UI.parseAction(raw)));
  const crumb = L.parent ? `<a class="crumb" href="${routeHash({ ...state, screen: L.parent })}">← ${esc(SPEC.screens[L.parent].title)}</a>` : "";
  const title = state.screen === "users/new" && state.ui.editUser ? "Редактировать пользователя" : L.title;
  return `${crumb}<header class="app-header"><h1 class="page-title text-h1">${esc(title)}</h1><div class="header-meta">${actions.join("")}</div></header>`;
}

// ---------------------------------------------------------------------------
// Rendering — form
// ---------------------------------------------------------------------------
function activeFooterChecks(state) {
  const L = layout(state);
  return (L.footer?.right || []).map(UI.parseAction).filter((a) => a.variant === "checkbox" && (!a.extra.includes("advanced") || state.mode === "advanced")).map((a) => a.action);
}

let seq = 0;
function fieldHtml(state, f, opts = {}) {
  const key = fieldKey(f);
  const values = form(state).values;
  const errors = form(state).errors;
  if (f.type === "checkbox") {
    return `<div class="field-wrap field-wrap-check" data-name="${esc(key)}">${UI.checkbox({ label: f.name, checked: values[key] === true, attrs: `data-field="${esc(key)}" data-group="${esc(f.extra[0] || "")}"${f.extra.includes("all") ? " data-all" : ""}` })}</div>`;
  }
  const id = `f-${++seq}`;
  return UI.field(f, {
    id,
    value: values[key],
    error: errors[key],
    options: f.type === "select" ? optionsFor(state, f) : null,
    multiple: f.type === "select" && isMulti(state),
    tip: persistentTip(state, f),
    staticTip: opts.staticTips ? staticTipFor(state, f) : null,
    open: opts.openSelect === f.name,
  });
}

function optionsFor(state, f) {
  if (f.name === "Магазин") {
    const m = form(state).values["Торговец"];
    const merchant = typeof m === "string" && m ? D.MERCHANTS.find((x) => x.name === m) : null;
    if (merchant) return merchant.shops;
  }
  return D.optionsFor(state.screen, f.name);
}

// static Figma screens: show the tooltip each field would show on hover
function staticTipFor(state, f) {
  const tip = persistentTip(state, f);
  if (tip) return tip;
  const v = form(state).values[fieldKey(f)];
  return isSet(v) ? f.name : null;
}

function groupsHtml(state, opts) {
  const L = layout(state);
  const groups = groupsOf(state);
  const html = groups.map((g) => `<fieldset class="field-group">
      ${g.title ? `<legend class="field-group-title text-h3 text-secondary">${esc(g.title)}</legend>` : ""}
      ${g.rows.map((row) => `<div class="field-row">${row.map((f) => fieldHtml(state, f, opts)).join("")}</div>`).join("")}
    </fieldset>`).join("");
  return L.groupsInline ? `<div class="groups-inline">${html}</div>` : html;
}

function footerHtml(state) {
  const L = layout(state);
  if (!L.footer) return "";
  const values = form(state).values;
  const test = Boolean(values[TEST_KEY]) && activeFooterChecks(state).includes("test");
  const left = (L.footer.left || []).map(UI.parseAction)
    .filter((a) => !(a.action === "export-xlsx" && L.kind === "payments" && test)) // test transactions are never exported
    .map((a) => UI.button({ ...a, type: a.action === "search" || a.action === "send" ? "submit" : "button", attrs: a.action === "search" ? 'id="btn-search"' : "" }));
  const right = (L.footer.right || []).map(UI.parseAction).map((a) => {
    if (a.variant !== "checkbox") return UI.button(a);
    if (a.extra.includes("advanced") && state.mode !== "advanced") return "";
    if (a.action === "mode") return UI.checkbox({ label: a.label, checked: state.mode === "advanced", attrs: 'id="adv-toggle"' });
    return UI.checkbox({ label: a.label, checked: test, attrs: `data-field="${esc(a.label)}" id="test-toggle"` });
  });
  return `<div class="footer-row${L.footer.left ? "" : " is-end"}"><div class="footer-left">${left.join("")}</div><div class="footer-right">${right.join("")}</div></div>`;
}

function formHtml(state, opts) {
  const L = layout(state);
  const errCount = Object.keys(form(state).errors).length;
  const banner = `<div class="form-banner field-error" id="form-banner" role="alert">${errCount ? `Форма содержит ошибки (${errCount}). Проверьте выделенные поля.` : ""}</div>`;
  let body = groupsHtml(state, opts);
  if (L.multiToggle) body += `<div class="form-option">${UI.checkbox({ label: L.multiToggle, checked: Boolean(form(state).values.__multi), attrs: 'id="multi-toggle"' })}</div>`;
  if (L.inlineSearch) {
    body = body.replace(/<\/div>\s*<\/fieldset>\s*$/, `${UI.button({ ...UI.parseAction(L.inlineSearch), type: "submit", attrs: 'id="btn-search"' })}</div></fieldset>`);
    const sample = state.data.payments[0].uid;
    body += `<p class="form-hint text-caption">Например: <button type="button" class="link-btn" data-action="fill-uid" data-uid="${sample}">${sample}</button></p>`;
  }
  return `${banner}${body}${L.inlineSearch ? "" : footerHtml(state)}`;
}

// ---------------------------------------------------------------------------
// Rendering — custom bodies
// ---------------------------------------------------------------------------
function userFormHtml(state) {
  const L = SPEC.screens["users/new"];
  const values = form(state).values;
  const errors = form(state).errors;
  const rows = L.form.map(UI.parseField).map((f) => {
    const id = `u-${++seq}`;
    let control;
    if (f.type === "roles") {
      control = `<div class="check-row" role="group" aria-labelledby="${id}-l">${D.ROLES.map((r) => UI.checkbox({ label: r, checked: Boolean(values[`role:${r}`]), attrs: `data-field="role:${esc(r)}"` })).join("")}</div><div class="field-error" id="${id}-err"${errors["Роли"] ? "" : " hidden"}>${esc(errors["Роли"] || "")}</div>`;
    } else if (f.type === "switch") {
      control = UI.switchControl({ label: f.name, checked: Boolean(values[f.name]), attrs: `data-field="${esc(f.name)}"` });
    } else {
      control = UI.field({ ...f, width: "" }, { id, value: values[f.name], error: errors[f.name] });
    }
    return `<div class="form-line"><span class="form-label" id="${id}-l">${esc(f.name)}</span><div class="form-control" data-name="${esc(f.name)}">${control}</div></div>`;
  }).join("");
  return `<div class="form-banner field-error" id="form-banner" role="alert"></div>${rows}${footerHtml(state)}`;
}

function txEditHtml(state) {
  const p = state.data.payments.find((x) => x.uid === list(state).found);
  if (!p) return "";
  const ek = `${formKey(state)}:edit`;
  const ef = form(state, ek);
  const fields = SPEC.screens["tx-edit"].edit.map(UI.parseField);
  const line = fields.map((f) => {
    if (f.type === "radio") return `<div class="inline-field"><span class="form-label">${esc(f.name)}:</span>${UI.radioGroup({ name: "tx-status", legend: f.name, choices: f.choices, value: ef.values[f.name], attrs: `data-edit-field="${esc(f.name)}"` })}</div>`;
    const id = `e-${++seq}`;
    return `<div class="inline-field"><label class="form-label" for="${id}">${esc(f.name)}</label>${UI.field({ ...f, width: "" }, { id, value: ef.values[f.name], error: ef.errors[f.name] }).replace(/data-field=/g, "data-edit-field=")}</div>`;
  });
  return `<section class="edit-block" aria-labelledby="edit-title">
    <h2 class="edit-title text-h3" id="edit-title">Изменение транзакции <span class="mono">${esc(p.uid)}</span></h2>
    <p class="text-caption text-secondary">${esc(p.desc)} · ${esc(p.merchant)} · ${D.money(p.amount, p.currency)} · сейчас: ${UI.badge(p.status)}</p>
    <div class="form-banner field-error" id="edit-banner" role="alert"></div>
    <div class="radio-line">${line[0]}</div>
    <div class="inline-fields">${line.slice(1).join("")}</div>
    ${footerHtml(state)}
  </section>`;
}

export function editDefaults(p) {
  const iso = (ms) => (ms ? new Date(ms).toISOString() : "");
  return { "Статус": p.status === "Отклонена" ? "failed" : "successful", "RRN": p.rnn, "Bank code": p.bankCode || "", "Payment date": iso(p.createdAt), "Settled date": iso(p.settledAt) };
}

// ---------------------------------------------------------------------------
// Rendering — results
// ---------------------------------------------------------------------------
export function renderResults(state) {
  const L = layout(state);
  const ls = list(state);
  const cols = columns(state);
  const title = L.kind === "balance" ? "Баланс торговца" : L.kind === "reports" ? "Отчёт" : L.kind === "fin-info" ? SPEC.screens["fin-info"].tabs[state.tab].title : ls.view === "history" ? "История выплат" : "Результаты поиска";

  if (["tx-edit", "users/new", "mass-payouts/new"].includes(state.screen)) return "";
  if (state.screen === "resend") {
    if (!ls.sent) return "";
    const ok = ls.sent.filter((x) => x.status === "Отправлено").length;
    return `<div class="results-toolbar"><h2 class="text-h2">Отправленные уведомления</h2><div class="results-meta">Отправлено: <strong>${ok}</strong> из ${ls.sent.length}</div></div>
      ${UI.table({ columns: [
        { key: "uid", title: "UID операции", width: 160, mono: true },
        { key: "merchant", title: "Торговец", width: 220 },
        { key: "url", title: "Адрес уведомления", width: 280, mono: true },
        { key: "status", title: "Статус", width: 150, center: true, render: (r) => UI.badge(r.status) },
      ], rows: ls.sent, rowKey: "uid" })}`;
  }

  if (ls.loading) {
    return `<div class="results-toolbar"><h2 class="text-h2">${esc(title)}</h2><div class="results-meta">Загрузка…</div></div>${UI.table({ columns: cols, rows: [], skeleton: 6, selectable: L.kind === "payments" })}`;
  }
  if (ls.results === null) {
    const hint = L.kind === "balance" ? "Выберите торговца и нажмите «Искать» — здесь появятся баланс и сумма, доступная к выводу."
      : L.kind === "reports" ? "Задайте параметры и нажмите «Показать отчёт»."
      : "Задайте параметры поиска и нажмите «Искать» — результаты появятся здесь. Пустой запрос покажет все записи.";
    return UI.emptyState({ hint });
  }

  if (L.kind === "balance") {
    const b = ls.results[0];
    if (!b) return UI.emptyState({ title: "Нет данных", hint: "Выберите торговца." });
    return `<div class="results-toolbar"><h2 class="text-h2">${esc(b.company)}</h2></div>${UI.stats([
      { label: "Баланс", value: byn(b.balance), mono: true, hint: "Одобренные операции за 30 дней за вычетом комиссии" },
      { label: "Доступно к выводу", value: byn(b.available), mono: true, hint: "Баланс минус удерживаемые страховые депозиты" },
      { label: "Удерживается", value: byn(b.held), mono: true },
    ])}`;
  }

  const rows = sorted(state);
  if (!rows.length) {
    return `<div class="results-toolbar"><h2 class="text-h2">${esc(title)}</h2></div>${UI.emptyState({ title: "Нет результатов", hint: "По заданным параметрам ничего не найдено. Измените условия и попробуйте снова.", action: L.footer && !L.live ? `<button type="button" class="btn btn-secondary" style="margin-top:12px" data-action="reset-search">Очистить фильтры</button>` : "" })}`;
  }

  const pages = Math.max(1, Math.ceil(rows.length / ls.perPage));
  ls.page = Math.min(Math.max(1, ls.page), pages);
  const start = (ls.page - 1) * ls.perPage;
  const pageRows = rows.slice(start, start + ls.perPage);
  const selectable = L.kind === "payments";
  const selCount = ls.selected.size;
  const summary = summaryFor(state, rows);
  return `<div class="results-toolbar">
      <h2 class="text-h2">${esc(title)}</h2>
      <div class="results-meta"><span>Найдено: <strong>${rows.length}</strong></span>
      ${selCount ? `<span>· Выбрано: <strong>${selCount}</strong></span><button type="button" class="btn btn-ghost btn-sm" data-action="clear-selection">Снять выделение</button>` : ""}</div>
    </div>
    ${summary}
    ${UI.table({ columns: cols, rows, pageRows, sort: currentSort(state), selectable, selected: ls.selected, rowKey: L.kind === "payments" ? "uid" : "id", clickable: L.kind === "payments", caption: `${title}, страница ${ls.page} из ${pages}` })}
    ${UI.pagination({ page: ls.page, pages, perPage: ls.perPage, start, count: pageRows.length, total: rows.length })}`;
}

function summaryFor(state, rows) {
  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
  if (layout(state).kind === "agg-payments") return UI.stats([{ label: "Операций", value: String(sum("count")) }, { label: "Оборот", value: byn(sum("turnover")), mono: true }, { label: "К выплате", value: byn(sum("payable")), mono: true }]);
  if (layout(state).kind !== "fin-info") return "";
  const t = state.tab;
  if (t === "profit") return UI.stats([{ label: "Оборот", value: byn(sum("turnover")), mono: true }, { label: "Комиссия", value: byn(sum("fee")), mono: true }, { label: "Прибыль", value: byn(sum("profit")), mono: true }]);
  if (t === "turnover") return UI.stats([{ label: "Операций", value: String(sum("count")) }, { label: "Оборот", value: byn(sum("turnover")), mono: true }, { label: "Чистый оборот", value: byn(sum("net")), mono: true }]);
  if (t === "payable") return UI.stats([{ label: "Начислено", value: byn(sum("accrued")), mono: true }, { label: "Удержано", value: byn(sum("held")), mono: true }, { label: "К выплате", value: byn(sum("payable")), mono: true }]);
  return UI.stats([{ label: "Депозитов", value: String(sum("count")) }, { label: "Удерживается", value: byn(sum("amount")), mono: true }]);
}

// ---------------------------------------------------------------------------
// Rendering — page
// ---------------------------------------------------------------------------
export function renderMain(state, opts = {}) {
  const L = layout(state);
  seq = 0;
  let panel;
  if (state.screen === "users") panel = "";
  else if (state.screen === "users/new") panel = userFormHtml(state);
  else panel = formHtml(state, opts) + (state.screen === "tx-edit" ? txEditHtml(state) : "");
  const tabs = L.kind === "fin-info"
    ? UI.tabs({ id: "fin-tabs", items: Object.entries(SPEC.screens["fin-info"].tabs).map(([id, t]) => ({ id, title: t.title })), active: state.tab })
    : "";
  const panelHtml = panel ? `<form class="search-panel${tabs ? " has-tabs" : ""}" id="screen-form" novalidate aria-label="${esc(L.title)}"${tabs ? ` role="tabpanel" aria-labelledby="tab-${state.tab}" id="fin-tabs-panel"` : ""}>${panel}</form>` : "";
  return `${pageHead(state, L)}${tabs}${panelHtml}<section class="section-block" id="results" aria-label="Результаты">${renderResults(state)}</section>`;
}

export function renderPaymentDrawer(state, uid, isStatic = false) {
  const r = state.data.payments.find((x) => x.uid === uid);
  const internal = persona(state) !== "user";
  const tz = activeTz(state);
  const F_ = UI.drawerField;
  const sec = (t, body) => `<h3 class="drawer-section-title text-caption text-overline">${t}</h3>${body}`;
  const body = [
    sec("Операция", [F_("UID операции", r.uid, true), F_("Трекинг ID", r.tracking, true), F_("Дата и время", `${D.fmtDate(r.createdAt, tz, true)} <span class="text-muted">${esc(tz.label)}</span>`), F_("Описание платежа", esc(r.desc)), F_("Тип транзакции", esc(r.type)), F_("Статус", UI.badge(r.status)), F_("RRN", r.rnn, true)].join("")),
    sec("Платёж", [F_("Сумма", D.money(r.amount, r.currency), true), F_("Способ оплаты", D.cardMethod(r)), F_("Маска карты", `${r.bin} •••• ${r.last4}`, true), F_("Страна банка-эмитента", esc(r.country)), internal ? F_("Хэш карты", D.maskHash(r.hash), true) : ""].join("")),
    sec("Плательщик", [F_("E-mail", esc(D.maskEmail(r.email))), F_("Телефон", D.maskPhone(r.phone), true), F_("IP клиента", internal ? r.ip : D.maskIp(r.ip), true)].join("")),
    sec("Обработка", internal
      ? [F_("Процессор", esc(r.processor)), F_("PSP / банк", `${esc(r.psp)} · ${esc(r.bank)}`), F_("Магазин/Мерчант", `${esc(r.merchant)}<br><span class="text-muted">${esc(r.shop)}</span>`), F_("Результат проверки", UI.badge(r.checkResult)), F_("Тестовая транзакция", r.test ? "Да" : "Нет")].join("")
      : F_("Магазин", esc(r.shop))),
  ].join("");
  return UI.drawer({ title: "Детали транзакции", body, static: isStatic });
}

export const DRAWER_FIELDS = {
  ad: ["Название|required", "Получатель|select|required|ph:Выберите получателя", "С|date|required", "По|date|required"].map(UI.parseField),
  merchant: ["Название|required", "Компания|required", "Email|email|required"].map(UI.parseField),
};

export function createDrawer(kind, state, isStatic = false) {
  const cat = state.ui.drawer?.category;
  const title = kind === "ad" ? `Новая реклама — ${cat === "Торговец" ? "для торговца" : cat === "Шлюз" ? "для шлюза" : "для PSP"}` : "Новый торговец";
  const ef = form(state, `drawer:${kind}`);
  const body = DRAWER_FIELDS[kind].map((f) => {
    const id = `d-${++seq}`;
    const options = f.name === "Получатель" ? (cat === "Торговец" ? D.MERCHANTS.map((m) => m.name) : cat === "Шлюз" ? D.PROCESSORS : D.PSPS) : [];
    return `<div class="form-stack"><label class="form-label" for="${id}">${esc(f.name)}</label>${UI.field({ ...f, width: "" }, { id, value: ef.values[f.name], error: ef.errors[f.name], options }).replace(/data-field=/g, "data-drawer-field=")}</div>`;
  }).join("");
  const footer = `${UI.button({ label: "Создать", variant: "primary", action: `save-${kind}` })}${UI.button({ label: "Отмена", variant: "secondary", action: "close-drawer" })}`;
  return UI.drawer({ title, body: `<div class="form-banner field-error" id="drawer-banner" role="alert"></div>${body}`, footer, static: isStatic });
}

// ---------------------------------------------------------------------------
// Exports (xlsx / csv) — columns as plain values
// ---------------------------------------------------------------------------
export function exportTable(state, rows) {
  const L = layout(state);
  const tz = activeTz(state);
  if (L.kind === "payments") {
    const cols = [
      ["UID операции", (r) => r.uid], ["Трекинг ID", (r) => r.tracking], ["Дата и время", (r) => D.fmtDate(r.createdAt, tz, true)],
      ["Описание платежа", (r) => r.desc], ["Тип транзакции", (r) => r.type], ["Плательщик", (r) => D.maskEmail(r.email)],
      ["Сумма", (r) => r.amount], ["Валюта", (r) => r.currency], ["Способ оплаты", (r) => D.cardMethod(r)], ["Статус", (r) => r.status],
    ];
    if (persona(state) !== "user") cols.push(["Процессор", (r) => r.processor], ["Магазин/Мерчант", (r) => r.merchant], ["Фрод-маркер", (r) => r.fraud], ["Тест", (r) => (r.test ? "Да" : "Нет")]);
    return { headers: cols.map((c) => c[0]), rows: rows.map((r) => cols.map((c) => c[1](r))) };
  }
  if (L.kind === "reports") {
    return { headers: ["Период", "Торговец", "Тип транзакции", "Валюта", "Операций", "Сумма"], rows: rows.map((r) => [r.period, r.merchant, r.type, r.currency, r.count, Math.round(r.sum * 100) / 100]) };
  }
  return null;
}
