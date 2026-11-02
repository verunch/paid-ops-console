// UI language. Russian is the source: templates render Russian and, for
// English, the finished markup goes through html() — text nodes and the few
// attributes people read (placeholder, aria-label, title) are looked up in
// en.js. Values (data-*, input value) are never touched, so filters,
// validation and exports keep working on the Russian keys.
import { EN, EN_PATTERNS } from "./en.js";

export const LANGS = ["ru", "en"];
let lang = "ru";
export const getLang = () => lang;
export function setLang(l) { lang = LANGS.includes(l) ? l : "ru"; }

const CYR = /[А-Яа-яЁё]/;
const MONEY = /^(-?\d{1,3}(?:[\s  ]\d{3})*),(\d{2})(\s(?:BYN|USD|EUR))?$/;
const SEPARATORS = [" · ", " — ", " → ", ", "];

function translate(s) {
  if (Object.hasOwn(EN, s)) return EN[s];
  const money = MONEY.exec(s);
  if (money) return `${money[1].replace(/[\s  ]/g, ",")}.${money[2]}${money[3] || ""}`;
  if (!CYR.test(s)) return s;
  for (const [re, fn] of EN_PATTERNS) {
    const m = re.exec(s);
    if (m) return fn(m, translate);
  }
  for (const sep of SEPARATORS) if (s.includes(sep)) return s.split(sep).map(translate).join(sep);
  return s;
}

// Plain text (textContent, toasts, announcements)
export function t(s) {
  if (lang === "ru" || typeof s !== "string") return s;
  const core = s.trim();
  if (!core) return s;
  const out = translate(core);
  return out === core ? s : s.replace(core, () => out);
}

const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Rendered markup
export function html(markup) {
  if (lang === "ru") return markup;
  const tr = (raw) => { const v = unesc(raw); const out = t(v); return out === v ? raw : esc(out); };
  return markup
    .replace(/(\s(?:placeholder|aria-label|title|data-placeholder|data-tip-name|data-tip-persistent|alt)=")([^"]*)(")/g, (m, a, v, b) => a + tr(v) + b)
    .replace(/>([^<]+)</g, (m, txt) => `>${tr(txt)}<`);
}
