// Console build step (called from build-site.mjs):
//   1. the live MVP page at /  (src/console/*, ES modules, no bundler)
//   2. NEW static screens under /new/… for Figma import, rendered with the
//      very same modules so the MVP and the screens cannot drift apart.
// The original static screens and their export are produced elsewhere and
// are deliberately not touched by anything in this file.
import fs from "node:fs";
import path from "node:path";
import * as D from "../src/console/data.js";
import * as S from "../src/console/screens.js";
import * as UI from "../src/console/ui.js";

// Fixed clock for static screens so every build produces identical files.
const STATIC_NOW = Date.UTC(2026, 9, 24, 12, 0, 0);
const TEST_KEY = "Тестовые транзакции";

export function buildConsole({ ROOT, PLAN_DIR, writeFile, HEAD_LINKS }) {
  const SRC = path.join(ROOT, "src/console");
  const spec = JSON.parse(fs.readFileSync(path.join(PLAN_DIR, "field-maps-new.json"), "utf8"));
  S.setSpec(spec);

  // ---- 1. live MVP --------------------------------------------------------
  for (const f of fs.readdirSync(SRC)) {
    if (f.endsWith(".js")) writeFile(`assets/js/console/${f}`, fs.readFileSync(path.join(SRC, f), "utf8"));
  }
  writeFile("assets/css/console.css", fs.readFileSync(path.join(SRC, "console.css"), "utf8"));
  const json = JSON.stringify(spec).replace(/</g, "\\u003c");
  writeFile("index.html", `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Paid — консоль операций</title>
<meta name="description" content="Paid — internal payment operations console, live MVP." />
${HEAD_LINKS}
<link rel="stylesheet" href="/assets/css/tokens.css" />
<link rel="stylesheet" href="/assets/css/base.css" />
<link rel="stylesheet" href="/assets/css/components.css" />
<link rel="stylesheet" href="/assets/css/console.css" />
</head>
<body class="console-body">
<a class="skip-link" href="#main">Перейти к содержимому</a>
<div class="console">
  <div id="sidebar-root"></div>
  <main class="console-main" id="main" tabindex="-1"></main>
</div>
<div id="drawer-root"></div>
<div class="toast-region" aria-live="polite"></div>
<div class="tooltip tooltip-floating" id="tooltip" role="tooltip" hidden></div>
<div class="visually-hidden" id="sr-status" aria-live="polite"></div>
<script type="application/json" id="console-spec">${json}</script>
<script type="module" src="/assets/js/console/app.js"></script>
</body>
</html>
`);

  // ---- 2. NEW static screens -----------------------------------------------
  const pages = [];
  const fresh = (ws, screen, route = {}) => S.createState(D.createData(STATIC_NOW), { ws, screen, ...route });
  const results = (st) => { S.list(st).results = S.query(st); return st; };
  const label = (ws) => S.workspace(ws).title;

  function page({ ws, screen, name, title, st, opts = {}, overlay = "" }) {
    const route = `new/${ws}/${screen.replace("/", "-")}/${name}`;
    const main = S.renderMain(st, opts);
    const sidebar = S.renderSidebar(st).replace(/href="#\//g, 'href="/#/');
    const fullTitle = `NEW · ${label(ws)} · ${title} · ${name}`;
    writeFile(`${route}/index.html`, `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${UI.esc(fullTitle)} — Paid Prototype</title>
${HEAD_LINKS}
<link rel="stylesheet" href="/assets/css/tokens.css" />
<link rel="stylesheet" href="/assets/css/base.css" />
<link rel="stylesheet" href="/assets/css/components.css" />
<link rel="stylesheet" href="/assets/css/console.css" />
</head>
<body>
<nav class="proto-nav">
  <span class="proto-tag">Prototype nav — NEW screen</span>
  <a href="/">Live MVP</a>
  <span class="sep">·</span>
  <a href="/new">NEW screens</a>
  <span class="sep">/</span>
  <span>/${route}</span>
</nav>
<div class="frame" id="frame-${route.replace(/\//g, "-")}">
  <div class="console is-static">
${sidebar}
    <main class="console-main">${main}</main>
  </div>
${overlay}
</div>
</body>
</html>
`);
    pages.push({ ws, screen, name, title, href: `/${route}` });
  }

  const PAY_SAMPLE = { "Сумма": "10000", "Владелец карты": "SIDOROV", "Хэш карты": "1234567891123456789112345678911234", "Имя клиента": "Сидоров", "Телефон клиента": "+375291235678" };

  for (const w of spec.workspaces) {
    for (const screen of w.screens) {
      const T = S.NAV[screen].label;
      if (screen === "payments") {
        if (w.persona === "accounting") {
          page({ ws: w.id, screen, name: "default", title: T, st: fresh(w.id, screen) });
          const st = fresh(w.id, screen);
          S.form(st).values["group:По дням"] = true;
          page({ ws: w.id, screen, name: "results-by-day", title: T, st: results(st) });
          continue;
        }
        for (const mode of ["basic", "advanced"]) {
          page({ ws: w.id, screen, name: `${mode}-default`, title: T, st: fresh(w.id, screen, { mode }) });
          page({ ws: w.id, screen, name: `${mode}-results`, title: T, st: results(fresh(w.id, screen, { mode })) });
        }
        // test transactions on → export button disappears (reference behaviour)
        const tst = fresh(w.id, screen, { mode: "advanced" });
        S.form(tst).values[TEST_KEY] = true;
        page({ ws: w.id, screen, name: "advanced-test-transactions", title: T, st: results(tst) });
        if (w.persona !== "admin") continue;
        const tips = fresh(w.id, screen, { mode: "advanced" });
        Object.assign(S.form(tips).values, PAY_SAMPLE);
        page({ ws: w.id, screen, name: "advanced-tooltips", title: T, st: tips, opts: { staticTips: true } });
        const val = fresh(w.id, screen, { mode: "advanced" });
        Object.assign(S.form(val).values, { "Сумма": "12ab", "С": "20.10.2026", "По": "01.10.2026", "Последние 4 цифры карты": "12" });
        S.form(val).errors = S.validate(val);
        page({ ws: w.id, screen, name: "advanced-validation", title: T, st: val });
        const drop = fresh(w.id, screen);
        page({ ws: w.id, screen, name: "basic-dropdown-open", title: T, st: drop, opts: { openSelect: "Статус" } });
        const load = fresh(w.id, screen);
        S.list(load).loading = true;
        page({ ws: w.id, screen, name: "basic-loading", title: T, st: load });
        const empty = fresh(w.id, screen);
        S.form(empty).values["UID операции"] = "NOPE-000";
        page({ ws: w.id, screen, name: "basic-empty", title: T, st: results(empty) });
        const det = results(fresh(w.id, screen));
        page({ ws: w.id, screen, name: "basic-details", title: T, st: det, overlay: S.renderPaymentDrawer(det, S.sorted(det)[0].uid, true) });
        const exp = results(fresh(w.id, screen));
        page({ ws: w.id, screen, name: "basic-export-success", title: T, st: exp, overlay: `<div class="toast-region" style="position:absolute">${UI.toast({ title: "Экспорт завершён", body: `payments_export_24-10-2026.xlsx — ${S.list(exp).results.length} строк`, isStatic: true })}</div>` });
        continue;
      }

      const T2 = spec.screens[screen].title;
      const L = spec.screens[screen];
      if (screen === "fin-info") {
        for (const tab of Object.keys(L.tabs)) {
          page({ ws: w.id, screen, name: `${tab}-default`, title: T2, st: fresh(w.id, screen, { sub: tab }) });
          page({ ws: w.id, screen, name: `${tab}-results`, title: T2, st: results(fresh(w.id, screen, { sub: tab })) });
        }
        continue;
      }
      if (L.live || L.autoload) {
        page({ ws: w.id, screen, name: "default", title: T2, st: results(fresh(w.id, screen)) });
      } else {
        page({ ws: w.id, screen, name: "default", title: T2, st: fresh(w.id, screen) });
      }

      switch (screen) {
        case "rules": {
          const st = fresh(w.id, screen);
          S.form(st).values["level:Merchant"] = true;
          S.form(st).values["Торговец"] = D.MERCHANTS[0].name;
          page({ ws: w.id, screen, name: "merchant-selected", title: T2, st: results(st) });
          break;
        }
        case "ads": {
          page({ ws: w.id, screen, name: "results", title: T2, st: results(fresh(w.id, screen)) });
          const st = results(fresh(w.id, screen));
          st.ui.drawer = { kind: "ad", category: "PSP" };
          page({ ws: w.id, screen, name: "create", title: T2, st, overlay: S.createDrawer("ad", st, true) });
          break;
        }
        case "users": {
          const add = fresh(w.id, "users/new");
          Object.assign(S.form(add).values, { "Имя пользователя": "Иван Иванов", "Email": "ivanov@paid.example", "role:Администрирование": true });
          page({ ws: w.id, screen: "users/new", name: "default", title: spec.screens["users/new"].title, st: add });
          const bad = fresh(w.id, "users/new");
          Object.assign(S.form(bad).values, { "Email": "ivanov@" });
          S.form(bad).errors = S.validate(bad, spec.screens["users/new"].form.map(UI.parseField), S.form(bad).values);
          page({ ws: w.id, screen: "users/new", name: "validation", title: spec.screens["users/new"].title, st: bad });
          break;
        }
        case "reports": {
          page({ ws: w.id, screen, name: "results", title: T2, st: results(fresh(w.id, screen)) });
          const st = fresh(w.id, screen);
          S.form(st).values.__multi = true;
          S.form(st).values["Способ оплаты"] = ["Visa", "Mastercard"];
          page({ ws: w.id, screen, name: "multiselect-open", title: T2, st, opts: { openSelect: "Способ оплаты" } });
          break;
        }
        case "merchants": {
          const st = results(fresh(w.id, screen));
          st.ui.drawer = { kind: "merchant" };
          page({ ws: w.id, screen, name: "create", title: T2, st, overlay: S.createDrawer("merchant", st, true) });
          break;
        }
        case "tx-edit": {
          const st = fresh(w.id, screen);
          const p = st.data.payments[0];
          S.form(st).values["UID операции"] = p.uid;
          S.list(st).found = p.uid;
          S.form(st, `${S.formKey(st)}:edit`).values = S.editDefaults(p);
          page({ ws: w.id, screen, name: "found", title: T2, st });
          break;
        }
        case "resend": {
          const st = fresh(w.id, screen);
          const uids = st.data.payments.slice(0, 3).map((p) => p.uid);
          S.form(st).values["UIDs"] = [...uids, "PMT-0000000"].join("\n");
          S.list(st).sent = [...uids.map((u) => { const p = st.data.payments.find((x) => x.uid === u); return { uid: u, merchant: p.merchant, url: "https://merchant.example/paid/notify", status: "Отправлено" }; }), { uid: "PMT-0000000", merchant: "—", url: "—", status: "Не найдено" }];
          page({ ws: w.id, screen, name: "sent", title: T2, st });
          break;
        }
        case "balance": {
          const st = fresh(w.id, screen);
          S.form(st).values["Торговец"] = D.MERCHANTS[0].name;
          page({ ws: w.id, screen, name: "result", title: T2, st: results(st) });
          break;
        }
        case "payouts": {
          page({ ws: w.id, screen, name: "results", title: T2, st: results(fresh(w.id, screen)) });
          const st = fresh(w.id, screen);
          S.list(st).view = "history";
          page({ ws: w.id, screen, name: "history", title: T2, st: results(st) });
          break;
        }
        case "mass-payouts": {
          page({ ws: w.id, screen, name: "results", title: T2, st: results(fresh(w.id, screen)) });
          page({ ws: w.id, screen: "mass-payouts/new", name: "default", title: spec.screens["mass-payouts/new"].title, st: fresh(w.id, "mass-payouts/new") });
          const bad = fresh(w.id, "mass-payouts/new");
          Object.assign(S.form(bad).values, { "Торговец": D.MERCHANTS[0].name, "E-mail получателя отчёта": "reports@" });
          S.form(bad).errors = S.validate(bad);
          page({ ws: w.id, screen: "mass-payouts/new", name: "validation", title: spec.screens["mass-payouts/new"].title, st: bad });
          break;
        }
        case "lists": break;
        default:
          page({ ws: w.id, screen, name: "results", title: T2, st: results(fresh(w.id, screen)) });
      }
    }
  }

  // ---- NEW design-system sheet: components added for the new screens --------
  {
    const st = fresh("admin", "payments");
    const cell = (label, html) => `<div class="ds-cell"><span class="ds-label">${UI.esc(label)}</span>${html}</div>`;
    const sel = (id, value, multiple = false, open = false) => `<div class="select-wrap">${UI.select({ id, label: "Способ оплаты", placeholder: "Выберите способ оплаты", value, options: ["Visa", "Mastercard", "Белкарт"], multiple, open })}</div>`;
    const sections = [
      ["Навигация (боковая панель)", `<div style="width:248px;border:1px solid var(--color-border-default);border-radius:var(--radius-lg);overflow:hidden">${S.renderSidebar(st).replace(/href="#\//g, 'href="/#/').replace('class="sidebar"', 'class="sidebar" style="position:static;height:auto"')}</div>`],
      ["Переключатель", `<div class="ds-row">${cell("Off", UI.switchControl({ label: "Активирован", checked: false }))}${cell("On", UI.switchControl({ label: "Активирован", checked: true }))}</div>`],
      ["Радиокнопки", `<div class="ds-row">${cell("Статус", UI.radioGroup({ name: "ds-radio", legend: "Статус", choices: ["successful", "failed"], value: "successful" }))}</div>`],
      ["Вкладки", UI.tabs({ id: "ds-tabs", items: [{ id: "a", title: "Прибыль" }, { id: "b", title: "Оборот" }, { id: "c", title: "К выплате" }, { id: "d", title: "Удерживаемые страховые депозиты" }], active: "b" })],
      ["Мультивыбор", `<div class="ds-row" style="padding-bottom:140px">${cell("Пусто", sel("ds-m1", [], true))}${cell("Выбрано 2", sel("ds-m2", ["Visa", "Mastercard"], true))}${cell("Открыт", sel("ds-m3", ["Visa"], true, true))}</div>`],
      ["Поиск, текстовая область, файл", `<div class="ds-row">${cell("Поиск", UI.field(UI.parseField("Поиск|search|ph:Введите данные для поиска…"), { id: "ds-s" }))}${cell("Текстовая область", UI.field(UI.parseField("UIDs|textarea|ph:Пожалуйста, разделяйте UID переводом строки"), { id: "ds-t" }))}${cell("Файл", UI.field(UI.parseField("Файл выплат|file"), { id: "ds-f" }))}${cell("Файл выбран", UI.field(UI.parseField("Файл выплат|file"), { id: "ds-f2", value: "payouts.csv" }))}</div>`],
      ["Показатели и метки", `${UI.stats([{ label: "Баланс", value: "12 480,00 BYN", mono: true, hint: "За 30 дней" }, { label: "Доступно к выводу", value: "9 310,50 BYN", mono: true }, { label: "Операций", value: "312" }])}<div class="ds-row">${["Администрирование", "Обслуживание", "Бухгалтерия", "Поддержка"].map((r) => `<span class="chip">${r}</span>`).join("")}</div>`],
      ["Статусы новых экранов", `<div class="ds-row">${["Активна", "Неактивна", "Закончена", "Готов", "Формируется", "Ошибка", "Удерживается", "Возвращён", "Выплачена", "Запланирована", "Чёрный", "Белый", "Блокировать", "На проверку", "INFO", "WARNING", "ERROR"].map((x) => UI.badge(x)).join("")}</div>`],
    ];
    const body = `<h1 class="page-title text-h1" style="margin:0 0 var(--spacing-xl)">Дизайн-система — новые компоненты <span class="role-badge role-neutral">NEW</span></h1>${sections.map(([t, h]) => `<section class="ds-section"><h2 class="text-h3">${UI.esc(t)}</h2>${h}</section>`).join("")}`;
    writeFile("new/design-system/index.html", `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NEW · Дизайн-система — Paid Prototype</title>
${HEAD_LINKS}
<link rel="stylesheet" href="/assets/css/tokens.css" />
<link rel="stylesheet" href="/assets/css/base.css" />
<link rel="stylesheet" href="/assets/css/components.css" />
<link rel="stylesheet" href="/assets/css/console.css" />
</head>
<body>
<nav class="proto-nav">
  <span class="proto-tag">Prototype nav — NEW screen</span>
  <a href="/">Live MVP</a>
  <span class="sep">·</span>
  <a href="/new">NEW screens</a>
  <span class="sep">·</span>
  <a href="/design-system">Базовая дизайн-система</a>
</nav>
<div class="frame" id="frame-new-design-system"><div class="frame-inner">${body}</div></div>
</body>
</html>
`);
    pages.push({ ws: "admin", screen: "design-system", name: "components", title: "NEW · Дизайн-система", href: "/new/design-system" });
  }

  // ---- NEW screens index -----------------------------------------------------
  const groups = spec.workspaces.map((w) => `<h2 class="text-h2" style="margin:32px 0 12px">${UI.esc(w.title)} <span class="new-tag">NEW</span></h2>
<ul>${pages.filter((p) => p.ws === w.id).map((p) => `<li><a class="swatch-card" style="display:block;" href="${p.href}">${UI.esc(p.title)}<div class="swatch-label">${UI.esc(p.name)}</div></a></li>`).join("")}</ul>`).join("");
  writeFile("new/index.html", `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NEW Screens — Paid Prototype</title>
${HEAD_LINKS}
<link rel="stylesheet" href="/assets/css/tokens.css" />
<link rel="stylesheet" href="/assets/css/base.css" />
<link rel="stylesheet" href="/assets/css/components.css" />
<link rel="stylesheet" href="/assets/css/console.css" />
<style>
  body { padding: 48px; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; max-width: 1280px; }
  ul a:hover { border-color: var(--color-border-strong); }
  .new-tag { display: inline-block; vertical-align: middle; font-size: 11px; font-weight: 700; letter-spacing: .08em; padding: 2px 8px; border-radius: 999px; background: var(--color-action-primary); color: #fff; }
</style>
</head>
<body>
<h1 class="text-h1">NEW Screens <span class="new-tag">NEW</span></h1>
<p class="text-body-sm text-secondary">Paid — новые экраны по референсам Group 7: ${pages.length} статичных состояний для импорта в Figma. Исходные экраны остаются в <a href="/screens">/screens</a>. Живая версия — <a href="/" style="color:var(--color-action-primary)">MVP →</a></p>
${groups}
</body>
</html>
`);
  return pages.length;
}
