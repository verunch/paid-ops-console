// One consolidated design-system sheet for Figma conversion:
// foundations (tokens) + every component with its variants and states drawn
// explicitly, so an HTML→Figma importer gets clean, named frames instead of
// auto-generated "variant 1…N" sets. Rendered with the same ui.js as the MVP.
import fs from "node:fs";
import path from "node:path";
import * as UI from "../src/console/ui.js";
import { ICONS } from "../src/console/icons.js";

const esc = UI.esc;
let seq = 0;
const uid = (p) => `${p}-${++seq}`;

// state helpers: inject the static state classes/attributes into rendered markup
const withClass = (html, base, cls) => html.replace(`class="${base}`, `class="${base} ${cls}`);
const disable = (html, tag) => html.replace(`<${tag} `, `<${tag} disabled `);

// ---- layout primitives ------------------------------------------------------
const cell = (name, html, note = "") => `<div class="ds-cell" data-name="${esc(name)}">${html}${note ? `<span class="ds-note">${esc(note)}</span>` : ""}</div>`;

// rows × states grid; rows: [{ name, cells: [html|null per state] }]
function matrix(component, states, rows) {
  const cols = `grid-template-columns: 140px repeat(${states.length}, minmax(0, 1fr))`;
  const head = `<div class="ds-matrix-head" style="${cols}"><span></span>${states.map((s) => `<span>${esc(s)}</span>`).join("")}</div>`;
  const body = rows.map((r) => `<div class="ds-matrix-row" style="${cols}"><span class="ds-row-label">${esc(r.name)}</span>${r.cells.map((c, i) => (c == null ? `<span class="ds-empty">—</span>` : cell(`${component} / ${r.name} / ${states[i]}`, c))).join("")}</div>`).join("");
  return `<div class="ds-matrix">${head}${body}</div>`;
}

function section(id, title, intro, html) {
  return `<section class="ds-block" id="${id}" data-name="${esc(title)}">
  <header class="ds-block-head"><h2 class="text-h2">${esc(title)}</h2>${intro ? `<p class="ds-intro">${esc(intro)}</p>` : ""}</header>
  ${html}
</section>`;
}

function chapter(n, title) {
  return `<div class="ds-chapter" id="chapter-${n}"><span class="ds-chapter-num">${String(n).padStart(2, "0")}</span><h1 class="text-h1">${esc(title)}</h1></div>`;
}

// ---- foundations ------------------------------------------------------------
function colors(tokens) {
  const vars = tokens.collections.Color.variables;
  const groups = {};
  for (const [name, v] of Object.entries(vars)) (groups[name.split("/")[0]] ||= []).push([name, { ...v, desc: v.desc && !/Ascendra/.test(v.desc) ? v.desc : "" }]);
  const TITLES = { bg: "Background", surface: "Surface", text: "Text", border: "Border", action: "Action", accent: "Role accent", status: "Status", focus: "Focus", disabled: "Disabled" };
  return Object.entries(groups).map(([g, list]) => `<div class="ds-sub"><h3 class="text-h3">${esc(TITLES[g] || g)}</h3><div class="ds-swatches">${list.map(([name, v]) => `<div class="ds-swatch" data-name="color/${esc(name)}"><span class="ds-chip" style="background:${v.hex}"></span><span class="ds-swatch-name">${esc(name)}</span><span class="ds-swatch-hex">${v.hex}</span>${v.desc ? `<span class="ds-swatch-desc">${esc(v.desc)}</span>` : ""}</div>`).join("")}</div></div>`).join("");
}

function typography(tokens) {
  const t = tokens.typography;
  const cls = { Display: "text-display", H1: "text-h1", H2: "text-h2", H3: "text-h3", Body: "text-body", "Body-sm": "text-body-sm", Caption: "text-caption", Overline: "text-overline" };
  const rows = Object.entries(t.styles).map(([name, s]) => `<div class="ds-type-row" data-name="text/${esc(name)}"><span class="ds-type-meta"><b>${esc(name)}</b><br>${s.size}/${Math.round((s.size * s.lineHeightPct) / 100)} · ${esc(s.weight)}${s.letterSpacingPct ? ` · +${s.letterSpacingPct}%` : ""}${s.uppercase ? " · UPPER" : ""}</span><span class="${cls[name]}">Список платежей</span></div>`).join("");
  const mono = `<div class="ds-type-row" data-name="text/Mono"><span class="ds-type-meta"><b>Mono</b><br>13 · Regular · ${esc(t.monoFamily)}</span><span class="mono" style="font-family:var(--font-family-mono);font-size:13px">PMT-8842190 · 158,49 BYN</span></div>`;
  return `<p class="ds-intro">Основной шрифт ${esc(t.fontFamily)}, идентификаторы и суммы ${esc(t.monoFamily)}. Не больше двух начертаний в одной таблице.</p>${rows}${mono}`;
}

function scale(tokens) {
  const sp = Object.entries(tokens.collections.Spacing.variables).map(([n, v]) => [n, v.value ?? v]);
  const rd = Object.entries(tokens.collections.Radius.variables).map(([n, v]) => [n, v.value ?? v]);
  const el = Object.entries(tokens.elevation);
  const ch = tokens.layout.controlHeight;
  return `<div class="ds-sub"><h3 class="text-h3">Spacing</h3>${sp.map(([n, v]) => `<div class="ds-space" data-name="${esc(n)}"><span class="ds-swatch-name">${esc(n)}</span><span class="ds-space-bar" style="width:${v}px"></span><span class="ds-swatch-hex">${v}px</span></div>`).join("")}</div>
  <div class="ds-sub"><h3 class="text-h3">Radius</h3><div class="ds-swatches">${rd.map(([n, v]) => `<div class="ds-swatch" data-name="${esc(n)}"><span class="ds-chip ds-radius" style="border-radius:${Math.min(v, 28)}px"></span><span class="ds-swatch-name">${esc(n)}</span><span class="ds-swatch-hex">${v}px</span></div>`).join("")}</div></div>
  <div class="ds-sub"><h3 class="text-h3">Elevation</h3><div class="ds-swatches">${el.map(([n, e]) => `<div class="ds-swatch" data-name="${esc(n)}"><span class="ds-chip ds-elev" style="box-shadow:0 ${e.offsetY}px ${e.blur}px rgba(30,41,38,${e.opacity})"></span><span class="ds-swatch-name">${esc(n)}</span><span class="ds-swatch-hex">y${e.offsetY} · blur ${e.blur} · ${Math.round(e.opacity * 100)}%</span></div>`).join("")}</div></div>
  <div class="ds-sub"><h3 class="text-h3">Control height · layout</h3><div class="ds-swatches">${Object.entries(ch).map(([k, v]) => `<div class="ds-swatch" data-name="control/${k}"><span class="ds-control" style="height:${v}px">${k}</span><span class="ds-swatch-hex">${v}px</span></div>`).join("")}<div class="ds-swatch"><span class="ds-swatch-name">Frame ${tokens.layout.frameWidth} · content ${tokens.layout.contentMaxWidth}</span><span class="ds-swatch-hex">${tokens.layout.gridColumns} cols · gutter ${tokens.layout.gutter} · row ${tokens.layout.rowHeightCompact}</span></div></div></div>`;
}

function icons() {
  const flat = Object.entries(ICONS).filter(([k]) => k !== "nav");
  const tile = (name, svg) => `<div class="ds-icon" data-name="Icon/${esc(name)}"><span class="ds-icon-box">${svg}</span><span class="ds-swatch-name">${esc(name)}</span></div>`;
  return `<div class="ds-sub"><h3 class="text-h3">UI</h3><div class="ds-icons">${flat.map(([k, v]) => tile(k, v)).join("")}</div></div>
  <div class="ds-sub"><h3 class="text-h3">Navigation</h3><div class="ds-icons">${Object.entries(ICONS.nav).map(([k, v]) => tile(`nav/${k}`, v)).join("")}</div></div>`;
}

// ---- components -------------------------------------------------------------
function buttons() {
  const STATES = ["Default", "Hover", "Focus", "Disabled"];
  const b = (variant, state, size = "", label = "Искать") => {
    let h = UI.button({ label, variant, size });
    if (state === "Hover") h = withClass(h, `btn btn-${variant}`, "is-hover");
    if (state === "Focus") h = withClass(h, `btn btn-${variant}`, "is-focus");
    if (state === "Disabled") h = disable(h, "button");
    return h;
  };
  const rows = ["primary", "secondary", "ghost", "destructive"].map((v) => ({ name: v[0].toUpperCase() + v.slice(1), cells: STATES.map((s) => b(v, s, "", v === "destructive" ? "Удалить" : "Искать")) }));
  const sizes = matrix("Button size", ["sm · 28", "md · 40", "lg · 48"], [{ name: "Primary", cells: ["sm", "", "lg"].map((s) => b("primary", "Default", s)) }, { name: "Secondary", cells: ["sm", "", "lg"].map((s) => b("secondary", "Default", s)) }]);
  const icon = (svg, label, state) => `<button type="button" class="icon-btn${state === "Hover" ? " is-hover" : state === "Focus" ? " is-focus" : ""}" aria-label="${esc(label)}">${svg}</button>`;
  const iconRows = [["eye", "Детали"], ["flag", "Пометить"], ["edit", "Редактировать"], ["download", "Скачать"], ["trash", "Удалить"]].map(([k, l]) => ({ name: k, cells: ["Default", "Hover", "Focus"].map((s) => `<div class="ds-table-ctx">${icon(ICONS[k], l, s)}</div>`) }));
  const withIcon = `<div class="ds-inline">${UI.button({ label: "Прикрепите файл", variant: "secondary" }).replace(">Прикрепите", `>${ICONS.paperclip}<span>Прикрепите`).replace("файл</button>", "файл</span></button>")}<button type="button" class="link-btn">PMT-8842190</button><a class="crumb" href="#">← Список пользователей</a></div>`;
  return section("button", "Button", "Primary — одно главное действие на форме. Secondary — остальные действия. Ghost — второстепенные действия в шапке и тулбаре. Destructive — удаление.", matrix("Button", STATES, rows))
    + section("button-size", "Button · size", "md — по умолчанию в формах; sm — тулбары таблиц; lg — редкие крупные CTA.", sizes)
    + section("icon-button", "Icon button", "Действия в строке таблицы. Всегда с aria-label.", matrix("Icon button", ["Default", "Hover", "Focus"], iconRows))
    + section("button-misc", "Button with icon · Link · Breadcrumb", "", withIcon);
}

function inputs() {
  const STATES = ["Default", "Hover", "Focus", "Filled", "Disabled", "Error"];
  const make = (raw, state, value, error) => {
    const f = UI.parseField(raw);
    let h = UI.field(f, { id: uid("in"), value: state === "Filled" || state === "Error" ? value : "", error: state === "Error" ? error : null });
    const base = f.type === "textarea" ? "field-input field-textarea" : "field-input";
    if (state === "Hover") h = withClass(h, base, "is-hover");
    if (state === "Focus") h = withClass(h, base, "is-focus");
    if (state === "Disabled") h = disable(h, f.type === "textarea" ? "textarea" : "input");
    return h;
  };
  const rows = [
    { name: "Text", raw: "UID операции", value: "PMT-8842190", error: "Операция не найдена" },
    { name: "Amount", raw: "Сумма|sm", value: "145.00", error: "Введите сумму, например 145.00" },
    { name: "Card number", raw: "Маска карты|cardnum|ph:123456 xxxx 1234", value: "472839 xxxx 5829", error: "Формат маски: 123456 xxxx 1234" },
    { name: "Date", raw: "С|date|ph:дд.мм.гггг", value: "25.10.2026", error: "Введите дату в формате дд.мм.гггг" },
    { name: "Search", raw: "Поиск|search|ph:Введите данные для поиска…", value: "Технопарк", error: "Минимум 2 символа" },
    { name: "Textarea", raw: "UIDs|textarea|ph:Пожалуйста, разделяйте UID переводом строки", value: "PMT-8842190\nPMT-8842177", error: "Укажите хотя бы один UID или e-mail" },
  ].map((r) => ({ name: r.name, cells: STATES.map((s) => make(r.raw, s, r.value, r.error)) }));
  return section("input", "Text input", "Высота 40. Плейсхолдер равен имени поля. Ошибка — рамка error и сообщение под полем; у заполненного поля тултип показывает имя поля.", matrix("Input", STATES, rows));
}

function selects() {
  const STATES = ["Default", "Hover", "Focus", "Filled", "Disabled", "Error"];
  const opts = ["Одобрена", "В обработке", "Отклонена", "Возврат", "Отменена"];
  const s = (state) => {
    let h = UI.select({ id: uid("sel"), label: "Статус", placeholder: "Выберите статус", value: state === "Filled" ? "Одобрена" : "", options: opts });
    if (state === "Hover") h = withClass(h, "field-select", "is-hover");
    if (state === "Focus") h = withClass(h, "field-select", "is-focus");
    if (state === "Disabled") h = withClass(h, "field-select", "is-disabled").replace('tabindex="0"', 'tabindex="-1" aria-disabled="true"');
    if (state === "Error") h = withClass(h, "field-select", "has-error");
    return `<div class="field-wrap t-select">${h}${state === "Error" ? `<div class="field-error">Выберите значение</div>` : ""}</div>`;
  };
  const open = (multiple) => `<div class="field-wrap t-select ds-open-host">${UI.select({ id: uid("sel"), label: "Способ оплаты", placeholder: "Выберите способ оплаты", value: multiple ? ["Visa", "Mastercard"] : "Visa", options: ["Visa", "Mastercard", "Белкарт"], multiple, open: true })}</div>`;
  const tz = UI.field(UI.parseField("Временная зона|select|tooltip-persistent:Временная зона (GMT + 01:00) Amsterdam"), { id: uid("tz"), value: "(GMT + 01:00) Amsterdam", options: [], staticTip: "Временная зона (GMT + 01:00) Amsterdam" });
  return section("select", "Select", "Список с выбором одного значения; «Не выбрано» сбрасывает поле. Мультивыбор включается на экранах отчётов: список не закрывается после выбора, в поле показываются первые значения и счётчик.", matrix("Select", STATES, [{ name: "Single", cells: STATES.map(s) }])
    + `<div class="ds-matrix-row ds-tall" style="grid-template-columns:140px repeat(3, minmax(0, 1fr))"><span class="ds-row-label">Open</span>${cell("Select / Single / Open", open(false))}${cell("Select / Multi / Open", open(true))}${cell("Select / With persistent tooltip", `<div class="ds-tip-host">${tz}</div>`)}</div>`);
}

function choice() {
  const cb = (label, checked, state) => {
    let h = UI.checkbox({ label, checked, disabled: state === "Disabled" });
    if (state === "Focus") h = h.replace('class="checkbox', 'class="checkbox is-focus');
    return h;
  };
  const sw = (on, state) => {
    let h = UI.switchControl({ label: "Активно", checked: on });
    if (state === "Focus") h = h.replace('class="switch"', 'class="switch is-focus"');
    if (state === "Disabled") h = h.replace('class="switch"', 'class="switch is-disabled"').replace("<input ", "<input disabled ");
    return h;
  };
  const rd = (state) => {
    let h = UI.radioGroup({ name: uid("r"), legend: "Статус", choices: ["successful", "failed"], value: state === "Selected" ? "failed" : "" });
    if (state === "Focus") h = h.replace('class="radio"', 'class="radio is-focus"');
    return h;
  };
  const STATES = ["Default", "Focus", "Disabled"];
  return section("checkbox", "Checkbox · Switch · Radio", "Checkbox — фильтры и выбор строк. Switch — мгновенное включение (правило, «Активирован»). Radio — выбор одного из двух-трёх значений.",
    matrix("Checkbox", STATES, [{ name: "Unchecked", cells: STATES.map((s) => cb("Тестовые транзакции", false, s)) }, { name: "Checked", cells: STATES.map((s) => cb("Тестовые транзакции", true, s)) }])
    + matrix("Switch", STATES, [{ name: "Off", cells: STATES.map((s) => sw(false, s)) }, { name: "On", cells: STATES.map((s) => sw(true, s)) }])
    + matrix("Radio", ["Unselected", "Selected", "Focus"], [{ name: "Group", cells: ["Unselected", "Selected", "Focus"].map(rd) }]));
}

function navigation() {
  const seg = (state) => `<div class="mode-tabs" role="group" aria-label="Режим поиска"><button type="button" aria-pressed="true">Простой</button><button type="button" aria-pressed="false"${state === "Hover" ? ' class="is-hover"' : state === "Focus" ? ' class="is-focus"' : ""}>Расширенный</button></div>`;
  const tabsHtml = (state) => {
    let h = UI.tabs({ id: uid("tabs"), items: [{ id: uid("a"), title: "Прибыль" }, { id: uid("b"), title: "Оборот" }, { id: uid("c"), title: "К выплате" }], active: null });
    const btns = h.split('class="tab"');
    // first tab: selected; second tab: the shown state
    h = btns[0] + 'class="tab"' + btns[1].replace('aria-selected="false"', 'aria-selected="true"') + `class="tab${state === "Hover" ? " is-hover" : state === "Focus" ? " is-focus" : ""}"` + btns.slice(2).join('class="tab"');
    return h;
  };
  const nav = (state) => `<a class="nav-link${state === "Hover" ? " is-hover" : state === "Focus" ? " is-focus" : ""}" href="#"${state === "Current" ? ' aria-current="page"' : ""}>${ICONS.nav.payments}<span>Платежи</span></a>`;
  const pag = (state) => UI.pagination({ page: 2, pages: 6, perPage: 10, start: 10, count: 10, total: 57 }).replace('class="page-btn" data-page="3"', `class="page-btn${state === "Hover" ? " is-hover" : state === "Focus" ? " is-focus" : ""}" data-page="3"`);
  return section("segmented", "Segmented control", "Переключение режима (Простой / Расширенный) и языка (RU / EN).", matrix("Segmented", ["Default", "Hover", "Focus"], [{ name: "2 options", cells: ["Default", "Hover", "Focus"].map(seg) }]))
    + section("tabs", "Tabs", "Разделы одного экрана (Финансовая информация). Переключение стрелками.", matrix("Tabs", ["Default", "Hover", "Focus"], [{ name: "3 tabs", cells: ["Default", "Hover", "Focus"].map(tabsHtml) }]))
    + section("nav-item", "Nav item", "Пункт бокового меню: иконка + подпись. Current — текущий экран.", matrix("Nav item", ["Default", "Hover", "Focus", "Current"], [{ name: "Item", cells: ["Default", "Hover", "Focus", "Current"].map((s) => `<div class="ds-nav-ctx">${nav(s)}</div>`) }]))
    + section("pagination", "Pagination", "Строк на странице + номера страниц. Текущая — заливка action.", matrix("Pagination", ["Default", "Hover on page 3", "Focus on page 3"], [{ name: "Bar", cells: ["Default", "Hover", "Focus"].map(pag) }]));
}

function feedback() {
  const KINDS = ["success", "warning", "error", "info", "neutral"];
  const labels = { success: "Одобрена", warning: "В обработке", error: "Отклонена", info: "Возврат", neutral: "Отменена" };
  const badges = `<div class="ds-inline">${KINDS.map((k) => cell(`Badge / ${k}`, UI.badge(labels[k], k), k)).join("")}</div>`;
  const roles = `<div class="ds-inline">${[["role-admin", "Администрирование"], ["role-user", "Клиент"], ["role-neutral", "Поддержка"]].map(([c, l]) => cell(`Role badge / ${c}`, `<span class="role-badge ${c}"><span class="dot" aria-hidden="true"></span>${l}</span>`)).join("")}${["Администрирование", "Бухгалтерия"].map((r) => cell("Chip", `<span class="chip">${r}</span>`)).join("")}</div>`;
  const tips = `<div class="ds-inline ds-tip-row">${cell("Tooltip / Field name", `<div class="ds-tip-host">${UI.field(UI.parseField("Сумма|sm"), { id: uid("t"), value: "10000", staticTip: "Сумма" })}</div>`, "имя поля — у заполненного поля")}${cell("Tooltip / Persistent", `<div class="ds-tip-host">${UI.field(UI.parseField("Последние 4 цифры карты|xs"), { id: uid("t"), value: "", staticTip: "Введите последние 4 цифры карты" })}</div>`, "подсказка формата — всегда")}${cell("Tooltip / Truncated cell", `<div class="ds-tip-host"><div class="tooltip tooltip-static" style="position:static">Возврат по заказу №4498 — частичный, 2 позиции</div></div>`, "полный текст обрезанной ячейки")}</div>`;
  const toasts = `<div class="ds-inline">${cell("Toast / Success", UI.toast({ title: "Экспорт завершён", body: "payments_export_24-10-2026.xlsx — 51 строк", isStatic: true }))}${cell("Toast / Warning", UI.toast({ kind: "warning", title: "Нечего экспортировать", body: "Сначала выполните поиск — в файл попадут найденные записи.", isStatic: true }))}</div>`;
  const errors = `<div class="ds-inline">${cell("Form banner", `<div class="form-banner field-error" role="alert">Форма содержит ошибки (3). Проверьте выделенные поля.</div>`)}${cell("Field error", `<div class="field-error">Введите корректный e-mail</div>`)}</div>`;
  return section("badge", "Status badge", "Статус всегда текстом и точкой, не только цветом.", badges)
    + section("role-badge", "Role badge · Chip", "Рабочее место в шапке экрана; роли пользователя в таблице.", roles)
    + section("tooltip", "Tooltip", "Правила одинаковы для клиента и админа.", tips)
    + section("toast", "Toast", "Справа снизу, исчезает через 6 секунд; warning — role=alert.", toasts)
    + section("errors", "Validation messages", "", errors);
}

function data() {
  const cols = [
    { key: "uid", title: "UID операции", width: 130, mono: true, sortable: true },
    { key: "date", title: "Дата и время", width: 120, sortable: true },
    { key: "desc", title: "Описание платежа", width: 220 },
    { key: "amount", title: "Сумма", width: 110, num: true, mono: true, sortable: true },
    { key: "status", title: "Статус", width: 130, center: true, render: (r) => UI.badge(r.status) },
    { key: "act", title: "Действия", width: 80, render: () => `<div class="actions-cell"><button type="button" class="icon-btn" aria-label="Детали">${ICONS.eye}</button></div>` },
  ];
  const rows = [
    { id: "PMT-8842190", uid: "PMT-8842190", date: "24.10 08:43", desc: "Оплата заказа №4521", amount: "158,49 BYN", status: "Одобрена" },
    { id: "PMT-8842177", uid: "PMT-8842177", date: "24.10 07:12", desc: "Возврат по заказу №4498", amount: "62,50 BYN", status: "Возврат" },
    { id: "PMT-8842158", uid: "PMT-8842158", date: "23.10 21:05", desc: "Оплата подписки Premium", amount: "29,90 BYN", status: "В обработке" },
    { id: "PMT-8842133", uid: "PMT-8842133", date: "23.10 18:40", desc: "Оплата доставки №4487", amount: "310,00 BYN", status: "Отклонена" },
  ];
  let t = UI.table({ columns: cols, rows, sort: { key: "date", dir: "desc" }, selectable: true, selected: new Set(["PMT-8842158"]) });
  t = t.replace('<tr class="" data-uid="PMT-8842177"', '<tr class="is-hover" data-uid="PMT-8842177"');
  const rowStates = `<div class="ds-legend"><span>Строка 1 — Default</span><span>Строка 2 — Hover</span><span>Строка 3 — Selected</span><span>«Дата и время» — Sort desc, остальные сортируемые — None</span></div>`;
  const skeleton = UI.table({ columns: cols, rows: [], skeleton: 3, selectable: true });
  const empty = UI.emptyState({ title: "Нет результатов", hint: "По заданным параметрам ничего не найдено. Измените условия и попробуйте снова.", action: UI.button({ label: "Очистить фильтры", variant: "secondary" }) });
  const stat = UI.stats([{ label: "Баланс", value: "12 480,00 BYN", mono: true, hint: "Одобренные операции за 30 дней" }, { label: "Доступно к выводу", value: "9 310,50 BYN", mono: true }, { label: "Операций", value: "312" }]);
  return section("table", "Table", "Заголовки — Overline; идентификаторы и суммы — Mono, суммы по правому краю, статус по центру. Высота строки 36 (compact).", `${t}${rowStates}`)
    + section("pagination-ctx", "Loading skeleton", "Показывается на время поиска вместо строк.", skeleton)
    + section("empty", "Empty state", "", `<div class="ds-card">${empty}</div>`)
    + section("stat", "Stat tile", "Итоги на экранах Баланс и Финансовая информация.", stat);
}

function overlays() {
  const body = `<h3 class="text-overline drawer-section-title">Операция</h3>${UI.drawerField("UID операции", "PMT-8842190", true)}${UI.drawerField("Статус", UI.badge("Одобрена"))}${UI.drawerField("Сумма", "158,49 BYN", true)}<h3 class="text-overline drawer-section-title">Платёж</h3>${UI.drawerField("Карта", "Visa •••• 4471", true)}${UI.drawerField("Плательщик", "a***@example.com")}`;
  const view = UI.drawer({ title: "Детали транзакции", body, static: true });
  const form = UI.drawer({ title: "Новая реклама — для PSP", body: `<div class="form-stack">${UI.field(UI.parseField("Название|required"), { id: uid("d"), value: "Осенняя акция" })}${UI.field(UI.parseField("Получатель|select|required|ph:Выберите получателя"), { id: uid("d"), value: "", options: [], error: "Выберите значение" })}</div>`, footer: `${UI.button({ label: "Создать", variant: "primary" })}${UI.button({ label: "Отмена", variant: "secondary" })}`, static: true });
  return section("drawer", "Drawer", "Боковая панель 480px поверх затемнения: просмотр деталей или короткая форма создания. Закрывается крестиком, кликом по фону и Esc.", `<div class="ds-inline ds-drawers">${cell("Drawer / View", `<div class="ds-drawer-box">${view}</div>`)}${cell("Drawer / Form", `<div class="ds-drawer-box">${form}</div>`)}</div>`);
}

function patterns() {
  const f = (raw, v) => UI.field(UI.parseField(raw), { id: uid("p"), value: v, options: [] });
  const panel = `<div class="section-block"><form class="search-panel" onsubmit="return false">
    <fieldset class="field-group"><legend class="field-group-title text-h3 text-secondary">Поиск по данным операции:</legend>
      <div class="field-row">${f("UID операции")}${f("Трекинг ID")}${f("Сумма|sm")}${f("Статус|select|ph:Выберите статус")}</div></fieldset>
    <div class="footer-row"><div class="footer-left">${UI.button({ label: "Искать", variant: "primary" })}${UI.button({ label: "Экспортировать в XLSX" })}${UI.button({ label: "Очистить поля" })}</div><div class="footer-right">${UI.checkbox({ label: "Расширенный поиск" })}${UI.checkbox({ label: "Тестовые транзакции" })}</div></div>
  </form></div>`;
  const header = `<header class="app-header"><h1 class="page-title text-h1">Список платежей</h1><div class="header-meta"><span class="role-badge role-admin"><span class="dot" aria-hidden="true"></span>Администрирование</span><div class="mode-tabs" role="group"><button type="button" aria-pressed="true">Простой</button><button type="button" aria-pressed="false">Расширенный</button></div>${UI.button({ label: "Заполнить пример", variant: "ghost" })}</div></header>`;
  const sidebar = `<div class="ds-sidebar-box"><aside class="sidebar"><div class="sidebar-brand">${ICONS.logo}<span>Paid</span><span class="brand-sub">Operations</span></div>
    <div class="sidebar-ws"><span class="sidebar-label">Рабочее место</span><div class="select-wrap">${UI.select({ id: uid("ws"), label: "Рабочее место", placeholder: "", value: "Администрирование", options: [], reset: false })}</div></div>
    <nav class="sidebar-nav"><ul>${[["payments", "Платежи", true], ["log", "Журнал событий"], ["shield", "Антифрод-правила"], ["megaphone", "Реклама"], ["users", "Пользователи"]].map(([i, l, cur]) => `<li><a href="#" class="nav-link"${cur ? ' aria-current="page"' : ""}>${ICONS.nav[i]}<span>${l}</span></a></li>`).join("")}</ul></nav></aside></div>`;
  return section("page-header", "Page header", "Заголовок экрана + рабочее место + режим + действия шапки.", header)
    + section("filter-panel", "Filter panel", "Группы полей с заголовком, ряды по 3–5 полей, футер: действия слева, переключатели справа.", panel)
    + section("sidebar", "Sidebar", "Логотип, выбор рабочего места, меню экранов.", sidebar);
}

// ---- page -------------------------------------------------------------------
const PAGE_CSS = `
body.ds-page { background: var(--color-bg-canvas); margin: 0; }
.ds-wrap { max-width: 1360px; margin: 0 auto; padding: 48px 40px 96px; }
.ds-cover { padding: 8px 0 32px; border-bottom: 1px solid var(--color-border-default); margin-bottom: 16px; }
.ds-cover p { color: var(--color-text-secondary); max-width: 760px; }
.ds-toc { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 13px; margin-top: 16px; }
.ds-toc a { color: var(--color-text-secondary); }
.ds-chapter { display: flex; align-items: baseline; gap: 16px; margin: 64px 0 8px; }
.ds-chapter-num { font-family: var(--font-family-mono); color: var(--color-action-primary); font-size: 14px; }
.ds-chapter h1 { margin: 0; }
.ds-block { background: var(--color-surface-default); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); padding: 32px; margin-top: 24px; }
.ds-block-head { margin-bottom: 24px; }
.ds-block-head h2 { margin: 0 0 6px; }
.ds-intro { margin: 0; color: var(--color-text-secondary); font-size: var(--font-body-sm-size); max-width: 820px; }
.ds-sub { margin-top: 24px; }
.ds-sub:first-child { margin-top: 0; }
.ds-sub h3 { margin: 0 0 12px; }
.ds-swatches { display: flex; flex-wrap: wrap; gap: 16px; }
.ds-swatch { display: flex; flex-direction: column; gap: 4px; width: 148px; }
.ds-chip { width: 148px; height: 56px; border-radius: var(--radius-md); border: 1px solid var(--color-border-default); }
.ds-radius { background: var(--color-surface-sunken); }
.ds-elev { background: var(--color-surface-default); border-color: transparent; }
.ds-swatch-name { font-size: 12px; color: var(--color-text-primary); font-weight: 500; }
.ds-swatch-hex { font-family: var(--font-family-mono); font-size: 11px; color: var(--color-text-muted); }
.ds-swatch-desc { font-size: 11px; color: var(--color-text-muted); }
.ds-control { display: flex; align-items: center; justify-content: center; width: 148px; border: 1px dashed var(--color-border-strong); border-radius: var(--radius-md); font-size: 12px; color: var(--color-text-secondary); }
.ds-space { display: grid; grid-template-columns: 120px auto 60px; align-items: center; gap: 12px; margin-bottom: 6px; }
.ds-space-bar { height: 12px; background: var(--color-action-primary); border-radius: 2px; }
.ds-type-row { display: grid; grid-template-columns: 220px 1fr; align-items: center; gap: 24px; padding: 12px 0; border-bottom: 1px solid var(--color-border-default); }
.ds-type-meta { font-size: 12px; color: var(--color-text-muted); }
.ds-type-meta b { color: var(--color-text-primary); font-weight: 600; }
.ds-icons { display: flex; flex-wrap: wrap; gap: 12px; }
.ds-icon { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 96px; }
.ds-icon-box { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); background: var(--color-surface-subtle); }
.ds-icon-box svg path[stroke="white"] { stroke: var(--color-text-primary); }
.ds-matrix + .ds-matrix { margin-top: 32px; }
.ds-matrix-head, .ds-matrix-row { display: grid; gap: 16px; align-items: start; }
.ds-matrix-head { font-size: var(--font-overline-size); text-transform: uppercase; letter-spacing: .08em; color: var(--color-text-muted); padding-bottom: 8px; border-bottom: 1px solid var(--color-border-default); margin-bottom: 12px; }
.ds-matrix-row { padding: 10px 0; }
.ds-matrix-row.ds-tall { padding-bottom: 190px; margin-top: 16px; border-top: 1px solid var(--color-border-default); padding-top: 20px; }
.ds-row-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); padding-top: 10px; }
.ds-empty { color: var(--color-text-muted); padding-top: 10px; }
.ds-cell { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-width: 0; }
.ds-cell > .field-wrap, .ds-cell > .ds-tip-host, .ds-cell > .ds-drawer-box, .ds-cell > .pagination { align-self: stretch; }
.ds-cell .field-wrap { width: 100%; flex: none; }
.ds-note { font-size: 11px; color: var(--color-text-muted); }
.ds-inline { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
.ds-tip-row { padding-bottom: 8px; }
.ds-tip-host { position: relative; width: 260px; padding-bottom: 44px; }
.ds-open-host { position: relative; }
.ds-table-ctx { display: inline-flex; padding: 6px; }
.ds-table-ctx .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--radius-md); border: 1px solid var(--color-border-default); background: var(--color-surface-default); color: var(--color-text-secondary); }
.ds-nav-ctx { width: 220px; }
.ds-legend { display: flex; flex-wrap: wrap; gap: 8px 24px; margin-top: 12px; font-size: 12px; color: var(--color-text-muted); }
.ds-card { border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); }
.ds-drawers .ds-cell { width: 520px; }
.ds-drawer-box { position: relative; height: 460px; overflow: hidden; border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); background: var(--color-surface-subtle); }
.ds-drawer-box .drawer-overlay { display: none; }
.ds-drawer-box .drawer { position: absolute; top: 0; right: 0; bottom: 0; width: 480px; max-width: 100%; }
.ds-sidebar-box { width: 260px; height: 420px; border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); overflow: hidden; }
.ds-sidebar-box .sidebar { position: static; height: 100%; }
.toast.is-static { position: static; }

/* static stand-ins for interactive states (the importer can't see :hover/:focus) */
.btn-primary.is-focus { box-shadow: 0 0 0 2px var(--color-surface-default), 0 0 0 4px var(--color-focus-ring); }
.btn-secondary.is-focus { border-color: var(--color-focus-ring); box-shadow: inset 0 0 0 1px var(--color-focus-ring); }
.btn-destructive.is-hover { filter: brightness(.9); }
.btn-destructive.is-focus { box-shadow: 0 0 0 2px var(--color-surface-default), 0 0 0 4px var(--color-focus-ring); }
.icon-btn.is-hover { border-color: var(--color-border-strong); background: var(--color-surface-subtle); }
.icon-btn.is-focus { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
.field-textarea.is-hover { border-color: var(--color-border-strong); }
.checkbox.is-focus .box, .radio.is-focus .radio-dot, .switch.is-focus .switch-track { box-shadow: 0 0 0 2px var(--color-surface-default), 0 0 0 4px var(--color-focus-ring); }
.switch.is-disabled { opacity: .5; }
.mode-tabs button.is-hover { background: var(--color-surface-hover); }
.mode-tabs button.is-focus { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }
.tab.is-hover { color: var(--color-text-primary); background: var(--color-surface-hover); }
.tab.is-focus { outline: 2px solid var(--color-focus-ring); outline-offset: -2px; }
.nav-link.is-hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
.nav-link.is-focus { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
.pagination .page-btn.is-hover { background: var(--color-surface-hover); }
.pagination .page-btn.is-focus { outline: 2px solid var(--color-focus-ring); outline-offset: 1px; }
table.data-table tbody tr.is-hover { background: var(--color-accent-admin-bg); }
`;

export function buildDesignSystemSheet({ PLAN_DIR, writeFile, HEAD_LINKS }) {
  const tokens = JSON.parse(fs.readFileSync(path.join(PLAN_DIR, "design-tokens.json"), "utf8"));
  seq = 0;
  const toc = [["Foundations", ["color", "typography", "scale", "icons"]], ["Components", ["button", "icon-button", "input", "select", "checkbox", "segmented", "tabs", "nav-item", "pagination", "badge", "tooltip", "toast", "table", "drawer"]], ["Patterns", ["page-header", "filter-panel", "sidebar"]]];
  const body = `<div class="ds-wrap">
<div class="ds-cover"><h1 class="text-display">Paid — Design System</h1>
<p>Все токены и компоненты консоли в одном файле. Каждое состояние нарисовано отдельно (Default, Hover, Focus, Filled, Disabled, Error), подписи строк и колонок — это будущие свойства вариантов в Figma: Component / Variant / State.</p>
<div class="ds-toc">${toc.map(([g, ids]) => `<span><b>${g}:</b> ${ids.map((i) => `<a href="#${i}">${i}</a>`).join(" · ")}</span>`).join("")}</div></div>
${chapter(1, "Foundations")}
${section("color", "Color", "Переменные: группа/роль. В компонентах используются только переменные, без «сырых» hex.", colors(tokens))}
${section("typography", "Typography", "", typography(tokens))}
${section("scale", "Spacing · Radius · Elevation · Layout", "", scale(tokens))}
${section("icons", "Icons", "Отдельный компонент на каждую иконку: Icon/name. Цвет наследуется от текста.", icons())}
${chapter(2, "Components")}
${buttons()}
${inputs()}
${selects()}
${choice()}
${navigation()}
${feedback()}
${data()}
${overlays()}
${chapter(3, "Patterns")}
${patterns()}
</div>`;
  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Paid — Design System</title>
${HEAD_LINKS}
<link rel="stylesheet" href="/assets/css/tokens.css" />
<link rel="stylesheet" href="/assets/css/base.css" />
<link rel="stylesheet" href="/assets/css/components.css" />
<link rel="stylesheet" href="/assets/css/console.css" />
<style>${PAGE_CSS}</style>
</head>
<body class="ds-page">
${body}
</body>
</html>
`;
  writeFile("ds/index.html", html);
  return html;
}
