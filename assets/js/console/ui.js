// Design-system components as pure HTML-string helpers. Class names match
// components.css (existing controls) and console.css (components added for
// the new screens), so static Figma screens and the live MVP render the same
// markup. No DOM access here.
import { ICONS } from "./icons.js";

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lowerFirst = (s) => (s.length > 1 && s[1] === s[1].toLowerCase() ? s[0].toLowerCase() + s.slice(1) : s);

const TYPES = ["select", "date", "search", "textarea", "email", "cardnum", "checkbox", "file", "switch", "roles"];

// "Name|flag|flag…" → field descriptor (see field-maps-new.json for the syntax)
export function parseField(raw) {
  const [name, ...flags] = raw.split("|");
  const f = { name, raw, type: "text", width: "", ph: null, tip: null, required: false, choices: null, extra: [] };
  for (const fl of flags) {
    if (TYPES.includes(fl)) f.type = fl;
    else if (["xs", "sm", "lg"].includes(fl)) f.width = fl;
    else if (fl.startsWith("ph:")) f.ph = fl.slice(3);
    else if (fl.startsWith("tooltip-persistent:")) f.tip = fl.slice("tooltip-persistent:".length);
    else if (fl.startsWith("radio:")) { f.type = "radio"; f.choices = fl.slice(6).split(","); }
    else if (fl === "required") f.required = true;
    else f.extra.push(fl);
  }
  if (!f.ph) f.ph = f.type === "select" ? `Выберите ${lowerFirst(name)}` : name;
  return f;
}

// "Label|variant|action" → button descriptor
export function parseAction(raw) {
  const [label, variant = "secondary", action = "", ...rest] = raw.split("|");
  return { label, variant, action, extra: rest };
}

export function button({ label, variant = "secondary", action = "", type = "button", attrs = "", size = "" }) {
  return `<button type="${type}" class="btn btn-${variant}${size ? ` btn-${size}` : ""}" ${action ? `data-action="${esc(action)}"` : ""} ${attrs}>${esc(label)}</button>`;
}

export function checkbox({ label, checked = false, hiddenLabel = false, attrs = "", disabled = false }) {
  return `<label class="checkbox${disabled ? " disabled" : ""}"><input type="checkbox" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} ${attrs}/><span class="box" aria-hidden="true">${ICONS.check}</span><span class="${hiddenLabel ? "visually-hidden" : ""}">${esc(label)}</span></label>`;
}

export function switchControl({ label, checked = false, attrs = "", hiddenLabel = true }) {
  return `<label class="switch"><input type="checkbox" role="switch" ${checked ? "checked" : ""} ${attrs}/><span class="switch-track" aria-hidden="true"><span class="switch-text">${checked ? "On" : "Off"}</span><span class="switch-thumb"></span></span><span class="${hiddenLabel ? "visually-hidden" : "switch-label"}">${esc(label)}</span></label>`;
}

export function radioGroup({ name, legend, choices, value, attrs = "" }) {
  return `<div class="radio-group" role="radiogroup" aria-label="${esc(legend)}">${choices
    .map((c) => `<label class="radio"><input type="radio" name="${esc(name)}" value="${esc(c)}" ${c === value ? "checked" : ""} ${attrs}/><span class="radio-dot" aria-hidden="true"></span><span>${esc(c)}</span></label>`)
    .join("")}</div>`;
}

// APG "select-only combobox"; `multiple` turns the listbox into a multi-select.
export function select({ id, label, placeholder, value, options, attrs = "", reset = true, multiple = false, open = false }) {
  const lb = `${id}-lb`;
  const values = multiple ? (Array.isArray(value) ? value : value ? [value] : []) : [];
  const filled = multiple ? values.length > 0 : Boolean(value);
  const display = multiple
    ? values.length === 0 ? placeholder : values.length <= 2 ? values.join(", ") : `${values[0]}, +${values.length - 1}`
    : value || placeholder;
  const opts = [...(reset && !multiple ? [{ v: "", t: "Не выбрано" }] : []), ...options.map((o) => ({ v: String(o), t: String(o) }))];
  const isSel = (v) => (multiple ? values.includes(v) : v === String(value || ""));
  return `<div class="field-select${filled ? " filled" : ""}${open ? " is-open" : ""}" id="${id}" tabindex="0" role="combobox" aria-haspopup="listbox" aria-expanded="${open}" aria-controls="${lb}" aria-label="${esc(label)}" ${attrs}><span class="value">${esc(display)}</span>${ICONS.chevron}</div>
    <ul class="select-panel${multiple ? " is-multi" : ""}" id="${lb}" role="listbox" aria-label="${esc(label)}"${multiple ? ' aria-multiselectable="true"' : ""}${open ? "" : " hidden"}>${opts
      .map((o, i) => `<li role="option" id="${lb}-${i}" class="opt${o.v === "" ? " is-reset" : ""}${open && i === 0 ? " active" : ""}" data-value="${esc(o.v)}" aria-selected="${isSel(o.v)}">${multiple ? `<span class="opt-box" aria-hidden="true">${ICONS.check}</span>` : ""}${esc(o.t)}</li>`)
      .join("")}</ul>`;
}

const INPUT_ATTRS = {
  cardnum: 'inputmode="numeric" maxlength="4" data-digits',
  date: 'inputmode="numeric" maxlength="10" data-date',
  email: 'inputmode="email" type="email"',
};
const NAME_ATTRS = {
  "БИН карты": 'inputmode="numeric" maxlength="6" data-digits',
  "Сумма": 'inputmode="decimal"',
  "Телефон клиента": 'inputmode="tel"',
  "IP клиента": 'inputmode="decimal"',
  "RRN": 'inputmode="numeric" maxlength="12" data-digits',
};

// One form field incl. persistent-tooltip description and error slot.
// ctx: { id, value, error, options, multiple, tip, staticTip, open }
export function field(f, ctx) {
  const { id, value, error } = ctx;
  const wrapCls = ["field-wrap", f.width ? `w-${f.width}` : "", `t-${f.type}`].filter(Boolean).join(" ");
  const tip = ctx.tip || null;
  const describedBy = [tip ? `${id}-tip` : "", `${id}-err`].filter(Boolean).join(" ");
  const common = `data-field="${esc(f.name)}" data-tip-name="${esc(f.name)}" ${tip ? `data-tip-persistent="${esc(tip)}"` : ""} aria-describedby="${describedBy}"${error ? ' aria-invalid="true"' : ""}${f.required ? ' aria-required="true"' : ""}`;
  let control;
  switch (f.type) {
    case "select":
      control = select({ id, label: f.name, placeholder: f.ph, value, options: ctx.options || [], multiple: ctx.multiple, open: ctx.open, attrs: common });
      if (error) control = control.replace('class="field-select', 'class="field-select has-error');
      break;
    case "textarea":
      control = `<textarea id="${id}" class="field-input field-textarea${error ? " has-error" : ""}" rows="4" placeholder="${esc(f.ph)}" aria-label="${esc(f.name)}" spellcheck="false" ${common}>${esc(value || "")}</textarea>`;
      break;
    case "file":
      control = `<div class="file-field"><label class="btn btn-secondary file-btn"><input type="file" class="visually-hidden" id="${id}" accept=".csv,.xlsx" ${common}/>${ICONS.paperclip}<span>Прикрепите файл</span></label><span class="file-name${value ? " has-file" : ""}" id="${id}-name">${esc(value || "Файл не выбран")}</span></div>`;
      break;
    default: {
      const cls = ["field-input", f.type === "cardnum" ? "is-cardnum" : "", f.type === "search" ? "is-search" : "", error ? "has-error" : "", value ? "filled" : ""].filter(Boolean).join(" ");
      const type = f.type === "email" ? "email" : f.type === "search" ? "search" : "text";
      const extra = (INPUT_ATTRS[f.type] || "").replace(/type="email"/, "") + " " + (NAME_ATTRS[f.name] || "");
      control = `<input id="${id}" class="${cls}" type="${type}" autocomplete="off" spellcheck="false" value="${esc(value || "")}" placeholder="${esc(f.ph)}" aria-label="${esc(f.name)}" ${extra} ${common}/>`;
    }
  }
  const tipHtml = tip ? `<span class="visually-hidden" id="${id}-tip">${esc(tip)}</span>` : "";
  const staticTip = ctx.staticTip ? `<div class="tooltip tooltip-static" aria-hidden="true">${esc(ctx.staticTip)}</div>` : "";
  return `<div class="${wrapCls}" data-name="${esc(f.name)}">${control}${tipHtml}${staticTip}<div class="field-error" id="${id}-err"${error ? "" : " hidden"}>${esc(error || "")}</div></div>`;
}

export function tabs({ id, items, active }) {
  return `<div class="tabs" role="tablist" id="${id}">${items
    .map((t) => `<button type="button" role="tab" class="tab" id="tab-${t.id}" data-tab="${t.id}" aria-selected="${t.id === active}" aria-controls="${id}-panel" tabindex="${t.id === active ? 0 : -1}">${esc(t.title)}</button>`)
    .join("")}</div>`;
}

const BADGE_KIND = {
  success: ["Одобрена", "Активна", "Активен", "Готов", "Выплачена", "Обработан", "Возвращён", "Пройдена", "Отправлено", "Включено", "Разрешить", "INFO"],
  warning: ["В обработке", "Формируется", "Приостановлена", "Удерживается", "Запланирована", "На проверку", "Неактивна", "Подозрительная", "Проверка", "WARNING"],
  error: ["Отклонена", "Ошибка", "Просрочена", "Списан", "Блокировать", "Чёрный", "Отключён", "Отклонена антифродом", "Высокий риск", "Не найдено", "ERROR"],
  info: ["Возврат", "Белый"],
  neutral: ["Отменена", "Закончена", "Не проверялась", "Выключено", "DEBUG"],
};
export function badgeKind(label) {
  return Object.keys(BADGE_KIND).find((k) => BADGE_KIND[k].includes(label)) || "neutral";
}
export function badge(label, kind = badgeKind(label)) {
  return `<span class="status-badge ${kind}">${ICONS.dot}${esc(label)}</span>`;
}

export function stats(items) {
  return `<div class="stat-grid">${items
    .map((s) => `<div class="stat"><div class="stat-label">${esc(s.label)}</div><div class="stat-value${s.mono ? " mono" : ""}">${esc(s.value)}</div>${s.hint ? `<div class="stat-hint">${esc(s.hint)}</div>` : ""}</div>`)
    .join("")}</div>`;
}

export function emptyState({ title, hint, action = "" }) {
  return `<div class="empty-state">${title ? `<div class="icon" aria-hidden="true">${ICONS.search}</div><div class="title">${esc(title)}</div>` : ""}<div class="hint text-body-sm">${esc(hint)}</div>${action}</div>`;
}

// Generic data table. columns: [{ key, title, width, num, center, mono, sortable, render(row) }]
export function table({ columns, rows, sort, selectable = false, selected = new Set(), rowKey = "id", caption = "", clickable = false, skeleton = 0, pageRows }) {
  const widths = [...(selectable ? [36] : []), ...columns.map((c) => c.width || 120)];
  const colgroup = `<colgroup>${widths.map((w) => `<col style="width:${w}px">`).join("")}</colgroup>`;
  const visible = pageRows || rows;
  const onPage = visible.filter((r) => selected.has(r[rowKey])).length;
  const all = visible.length > 0 && onPage === visible.length;
  const head = [
    selectable ? `<th class="row-check" scope="col">${checkbox({ label: "Выбрать все на странице", hiddenLabel: true, checked: all, attrs: `id="check-page" data-indeterminate="${onPage > 0 && !all}"${visible.length ? "" : " disabled"}` })}</th>` : "",
    ...columns.map((c) => {
      const cls = [c.num ? "num" : "", c.center ? "status-col" : ""].filter(Boolean).join(" ");
      if (!c.sortable) return `<th class="${cls}" scope="col"><span class="th-inner text-overline">${esc(c.title)}</span></th>`;
      const on = sort && sort.key === c.key;
      const aria = on ? (sort.dir === "asc" ? "ascending" : "descending") : "none";
      return `<th class="${cls}" scope="col" aria-sort="${aria}"><button type="button" class="th-sort" data-sort="${c.key}">${esc(c.title)}${on ? ICONS.sortAsc : ICONS.sortNone}</button></th>`;
    }),
  ].join("");
  let body;
  if (skeleton) {
    body = Array.from({ length: skeleton }, () => `<tr class="skeleton-row">${widths.map(() => '<td><span class="skeleton-block" style="width:70%;height:14px;"></span></td>').join("")}</tr>`).join("");
  } else {
    body = visible.map((r) => {
      const sel = selected.has(r[rowKey]);
      const cells = columns.map((c) => {
        const cls = [c.num ? "num" : "", c.center ? "status-col" : "", c.mono ? "mono" : ""].filter(Boolean).join(" ");
        const html = c.render ? c.render(r) : esc(r[c.key]);
        return `<td class="${cls}">${html}</td>`;
      });
      if (selectable) cells.unshift(`<td class="row-check">${checkbox({ label: `Выбрать ${r[rowKey]}`, hiddenLabel: true, checked: sel, attrs: `data-row-check="${esc(r[rowKey])}"` })}</td>`);
      return `<tr class="${[clickable ? "is-clickable" : "", sel ? "selected" : ""].filter(Boolean).join(" ")}" data-uid="${esc(r[rowKey])}">${cells.join("")}</tr>`;
    }).join("");
  }
  return `<div class="table-scroll"><table class="data-table">${caption ? `<caption class="visually-hidden">${esc(caption)}</caption>` : ""}${colgroup}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function pagesList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = [...new Set([1, total, page - 1, page, page + 1])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of set) { if (p - prev > 1) out.push("…"); out.push(p); prev = p; }
  return out;
}

export function pagination({ page, pages, perPage, start, count, total }) {
  return `<div class="pagination">
    <div class="rows-per-page"><span id="per-page-label">Показывать по</span>
      <div class="select-wrap">${select({ id: "per-page", label: "Строк на странице", placeholder: "", value: String(perPage), options: [10, 20, 50], reset: false, attrs: 'data-per-page aria-labelledby="per-page-label"' })}</div>
      <span>строк</span><span class="range">${total ? `${start + 1}–${start + count} из ${total}` : "0 из 0"}</span>
    </div>
    <nav class="pages" aria-label="Страницы результатов">
      <button type="button" class="page-btn" data-page="${page - 1}" aria-label="Предыдущая страница" ${page === 1 ? "disabled" : ""}>‹</button>
      ${pagesList(page, pages).map((p) => (p === "…" ? '<span class="page-ellipsis">…</span>' : `<button type="button" class="page-btn${p === page ? " active" : ""}" data-page="${p}" ${p === page ? 'aria-current="page"' : ""} aria-label="Страница ${p}">${p}</button>`)).join("")}
      <button type="button" class="page-btn" data-page="${page + 1}" aria-label="Следующая страница" ${page === pages ? "disabled" : ""}>›</button>
    </nav>
  </div>`;
}

export function drawer({ title, body, footer = "", static: isStatic = false }) {
  return `<div class="drawer-overlay" data-action="close-drawer"></div>
  <div class="drawer${isStatic ? " is-static" : ""}" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
    <div class="drawer-header"><h2 class="text-h2" id="drawer-title">${esc(title)}</h2><button type="button" class="drawer-close" data-action="close-drawer" aria-label="Закрыть">${ICONS.close}</button></div>
    <div class="drawer-body">${body}</div>
    ${footer ? `<div class="drawer-footer">${footer}</div>` : ""}
  </div>`;
}

export function drawerField(k, v, mono = false) {
  return `<div class="drawer-field"><span class="k">${esc(k)}</span><span class="v${mono ? " mono" : ""}">${v}</span></div>`;
}

export function toast({ kind = "success", title, body, isStatic = false }) {
  return `<div class="toast toast-${kind}${isStatic ? " is-static" : ""}" role="${kind === "warning" ? "alert" : "status"}"><span class="toast-icon" aria-hidden="true">${kind === "success" ? ICONS.toastCheck : ICONS.toastInfo}</span><div><div class="toast-title">${esc(title)}</div><div class="toast-body">${esc(body)}</div></div><button type="button" class="toast-close" aria-label="Закрыть уведомление">${ICONS.close}</button></div>`;
}
