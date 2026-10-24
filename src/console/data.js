// Fictional reference data + deterministic generators for every console screen.
// Pure module (no DOM): the browser app and the static-screen build both use it,
// so the live MVP and the Figma screens show the same numbers.

export const DAY = 86400000;
export const pad = (n) => String(n).padStart(2, "0");

export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Reference lists
// ---------------------------------------------------------------------------
export const TIMEZONES = [
  { label: "(GMT + 00:00) UTC", offset: 0 },
  { label: "(GMT + 01:00) Amsterdam", offset: 60 },
  { label: "(GMT + 03:00) Minsk", offset: 180 },
];
export const DEFAULT_TZ = TIMEZONES[1]; // the reference names Amsterdam as the default zone

export const PROCESSORS = ["EPay Gateway", "Paid Core", "SecurePay"];
export const PSPS = ["Paid PSP", "NorthPay", "Baltic Pay"];
export const BANKS = ["Банк Север", "Банк Восток", "Центр Банк", "Банк Запад"];
export const COUNTRIES = ["Беларусь", "Польша", "Литва", "Германия", "Казахстан"];
export const CURRENCIES = ["BYN", "USD", "EUR"];
export const STATUS_BADGE = { "Одобрена": "success", "В обработке": "warning", "Отклонена": "error", "Возврат": "info", "Отменена": "neutral" };
export const CHECK_RESULTS = ["Пройдена", "Подозрительная", "Отклонена антифродом", "Не проверялась"];
export const ROLES = ["Администрирование", "Обслуживание", "Бухгалтерия", "Поддержка"];
export const LOG_LEVELS = ["DEBUG", "INFO", "WARNING", "ERROR"];

export const MERCHANTS = [
  { id: "M-1001", name: "ООО «Технопарк»", company: "Технопарк", email: "billing@technopark.example", active: true, shops: ["technopark.example", "Технопарк — Минск"] },
  { id: "M-1002", name: "ИП Соколова", company: "Соколова А. В.", email: "sokolova@flowers.example", active: true, shops: ["flowers.example"] },
  { id: "M-1003", name: "ООО «Цифра»", company: "Цифра Групп", email: "finance@cifra.example", active: true, shops: ["cifra.example", "Цифра Premium"] },
  { id: "M-1004", name: "ООО «Книжный дом»", company: "Книжный дом", email: "pay@books.example", active: true, shops: ["books.example"] },
  { id: "M-1005", name: "ООО «Северный ветер»", company: "Северный ветер", email: "ops@wind.example", active: false, shops: ["wind.example"] },
  { id: "M-1006", name: "ИП Громов", company: "Громов Д. С.", email: "gromov@tools.example", active: true, shops: ["tools.example", "Инструменты Опт"] },
  { id: "M-1007", name: "Тестовый магазин", company: "Paid Sandbox", email: "sandbox@paid.example", active: true, shops: ["sandbox.example"] },
];
export const SHOPS = MERCHANTS.flatMap((m, mi) => m.shops.map((s, si) => ({
  id: `S-${2001 + mi * 10 + si}`, name: s, merchant: m.name, url: s.includes(".") ? `https://${s}` : "—",
  currency: si === 1 ? "USD" : "BYN", active: m.active,
})));

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

// Options for selects, by field name; some screens override (e.g. "Статус").
export const OPTIONS = {
  "Тип транзакции": ["Оплата", "Возврат", "Авторизация", "Отмена"],
  "Статус": Object.keys(STATUS_BADGE),
  "Процессор": PROCESSORS,
  "Способ оплаты": ["Visa", "Mastercard", "Белкарт"],
  "Торговец": MERCHANTS.map((m) => m.name),
  "Магазин": SHOPS.map((s) => s.name),
  "Страна банка-эмитента": COUNTRIES,
  "Страна банка-эквайера": COUNTRIES,
  "Страна плательщика": COUNTRIES,
  "Банк": BANKS,
  "PSP": PSPS,
  "Валюта": CURRENCIES,
  "Результат проверки": CHECK_RESULTS,
  "Дата создания": ["Сегодня", "Последние 7 дней", "Последние 30 дней", "Последние 90 дней"],
  "Дата проведения операции": ["Сегодня", "Последние 7 дней", "Последние 30 дней", "Последние 90 дней"],
  "Дата создания транзакции": ["Сегодня", "Последние 7 дней", "Последние 30 дней", "Последние 90 дней"],
  "Временная зона": TIMEZONES.map((t) => t.label),
  "Способ группировки": ["По дням", "По неделям", "По месяцам"],
  "Уровень": LOG_LEVELS,
};
export const SCREEN_OPTIONS = {
  subscriptions: { "Статус": ["Активна", "Приостановлена", "Отменена", "Просрочена"] },
  "fin-reports": { "Статус": ["Готов", "Формируется", "Ошибка"] },
  deposits: { "Статус": ["Удерживается", "Возвращён", "Списан"] },
  "mass-payouts": { "Статус": ["Обработан", "В обработке", "Ошибка"] },
};
export function optionsFor(screen, name) {
  return (SCREEN_OPTIONS[screen] && SCREEN_OPTIONS[screen][name]) || OPTIONS[name] || [];
}

// ---------------------------------------------------------------------------
// Formatting / masking
// ---------------------------------------------------------------------------
export function tzByLabel(label) {
  return TIMEZONES.find((t) => t.label === label) || DEFAULT_TZ;
}
export function fmtDate(ms, tz = DEFAULT_TZ, full = false) {
  const d = new Date(ms + tz.offset * 60000);
  const date = `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}${full ? `.${d.getUTCFullYear()}` : ""}`;
  return `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
export function fmtDay(ms, tz = DEFAULT_TZ) {
  const d = new Date(ms + tz.offset * 60000);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}
export function fmtMonth(ms, tz = DEFAULT_TZ) {
  const d = new Date(ms + tz.offset * 60000);
  return ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"][d.getUTCMonth()] + ` ${d.getUTCFullYear()}`;
}
export const money = (n, cur = "BYN") => `${n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, " ")} ${cur}`;
export const maskEmail = (e) => `${e[0]}***@${e.split("@")[1]}`;
export const maskPhone = (p) => `${p.slice(0, 8)} ***-**-${p.slice(-2)}`;
export const maskHash = (h) => `${h.slice(0, 4)}•••••••${h.slice(-4)}`;
export const maskIp = (ip) => ip.split(".").map((o, i) => (i === 1 || i === 2 ? "•••" : o)).join(".");
export const cardMethod = (r) => `${r.brand} •••• ${r.last4}`;

export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// дд.мм.гггг → UTC ms of that day's start in the given zone (null if invalid)
export function parseDate(v, tz = DEFAULT_TZ) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(v).trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (check.getUTCDate() !== d || check.getUTCMonth() !== mo - 1) return null;
  return ms - tz.offset * 60000;
}

export function relativeFrom(label, now, tz = DEFAULT_TZ) {
  if (label === "Сегодня") {
    const off = tz.offset * 60000;
    return Math.floor((now + off) / DAY) * DAY - off;
  }
  const days = { "Последние 7 дней": 7, "Последние 30 дней": 30, "Последние 90 дней": 90 }[label];
  return days ? now - days * DAY : -Infinity;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------
function payments(rnd, now, count) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const digits = (n) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");
  const hex = (n) => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join("");
  const rows = [];
  let t = now - 25 * 60 * 1000;
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
    const merchant = rnd() < 0.08 ? MERCHANTS[6] : pick(MERCHANTS.slice(0, 6));
    const test = merchant === MERCHANTS[6];
    const b = rnd();
    const brand = b < 0.45 ? "Visa" : b < 0.85 ? "Mastercard" : "Белкарт";
    const bin = brand === "Visa" ? `4${digits(5)}` : brand === "Mastercard" ? `5${pick("12345")}${digits(4)}` : `9112${digits(2)}`;
    const person = pick(PERSONS);
    const fraudRoll = rnd();
    const fraud = status === "Отклонена" && fraudRoll < 0.45 ? "Высокий риск" : fraudRoll < 0.06 ? "Проверка" : "—";
    const c = rnd();
    const currency = test ? "BYN" : c < 0.75 ? "BYN" : c < 0.9 ? "USD" : "EUR";
    const amount = test ? 1 : Math.round((5 + rnd() * 420) * 100) / 100;
    rows.push({
      uid: `PMT-${8842190 - i * 13 - Math.floor(rnd() * 9)}`,
      tracking: `TRK-${2291001 - i * 11 - Math.floor(rnd() * 7)}`,
      createdAt: t,
      desc: test ? "Тестовый платёж" : desc,
      type, status, amount, currency, brand, bin,
      last4: digits(4),
      holder: person[2],
      name: `${person[0]} ${person[1]}`,
      email: `${person[3]}${Math.floor(rnd() * 90 + 10)}@${pick(["example.com", "example.by", "example.org"])}`,
      phone: `+375 ${pick(["29", "33", "44", "25"])} ${digits(3)}-${digits(2)}-${digits(2)}`,
      ip: `${pick([37, 46, 93, 178, 185, 212])}.${Math.floor(rnd() * 255)}.${Math.floor(rnd() * 255)}.${Math.floor(rnd() * 254) + 1}`,
      country: rnd() < 0.7 ? "Беларусь" : pick(COUNTRIES.slice(1)),
      acquirerCountry: rnd() < 0.85 ? "Беларусь" : pick(COUNTRIES.slice(1)),
      processor: pick(PROCESSORS),
      psp: pick(PSPS),
      bank: pick(BANKS),
      merchant: merchant.name,
      merchantId: merchant.id,
      shop: pick(merchant.shops),
      fraud,
      checkResult: fraud === "Высокий риск" ? "Отклонена антифродом" : fraud === "Проверка" ? "Подозрительная" : rnd() < 0.85 ? "Пройдена" : "Не проверялась",
      test,
      rnn: digits(12),
      erip: digits(8),
      bankId: pick(["104", "117", "226", "310", "742"]),
      account: `ACC-${digits(6)}`,
      hash: hex(32),
      bankCode: status === "Одобрена" ? pick(["00", "000"]) : status === "Отклонена" ? pick(["05", "51", "54"]) : "",
      settledAt: status === "Одобрена" ? t + Math.floor((1 + rnd() * 2) * DAY) : null,
    });
  }
  return rows;
}

function events(rnd, pays) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const MESSAGES = {
    DEBUG: ["Запрос к процессору сформирован", "Ответ процессора разобран", "Повторная попытка соединения"],
    INFO: ["Платёж создан", "3-D Secure пройден", "Уведомление мерчанту доставлено", "Статус обновлён"],
    WARNING: ["Медленный ответ процессора (2.8 с)", "Уведомление мерчанту: повтор 2 из 5", "Антифрод: требуется проверка"],
    ERROR: ["Таймаут процессора", "Уведомление мерчанту не доставлено (HTTP 500)", "Отказ эмитента: недостаточно средств"],
  };
  const rows = [];
  pays.slice(0, 40).forEach((p) => {
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const lv = rnd();
      const level = p.status === "Отклонена" && k === n - 1 ? "ERROR" : lv < 0.15 ? "DEBUG" : lv < 0.8 ? "INFO" : "WARNING";
      rows.push({
        id: `EV-${rows.length + 1}`,
        time: p.createdAt + k * 1700 + Math.floor(rnd() * 900),
        level,
        uid: p.uid,
        gatewayId: `gw-${p.uid.slice(4)}-${k + 1}`,
        source: pick(["API", "3-D Secure", "Процессор", "Webhook"]),
        message: pick(MESSAGES[level]),
      });
    }
  });
  return rows;
}

function rules(rnd, now) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const NAMES = ["Лимит суммы за операцию", "Скорость: >5 попыток за 10 мин", "Страна карты ≠ страна IP", "Чёрный список BIN", "Повторный отказ эмитента", "Новый e-mail + крупная сумма", "Ночные операции", "Несовпадение имени держателя"];
  const rows = [];
  let i = 0;
  for (const level of ["PSP", "Merchant", "Shop"]) {
    const objects = level === "PSP" ? PSPS : level === "Merchant" ? MERCHANTS.map((m) => m.name) : SHOPS.map((s) => s.name);
    for (let k = 0; k < 6; k++) {
      const object = pick(objects);
      rows.push({
        id: `R-${301 + i++}`, name: pick(NAMES), level, object,
        merchant: level === "Merchant" ? object : level === "Shop" ? SHOPS.find((s) => s.name === object).merchant : "—",
        shop: level === "Shop" ? object : "—",
        action: pick(["Блокировать", "На проверку", "Блокировать", "Разрешить"]),
        enabled: rnd() < 0.8,
        updatedAt: now - Math.floor(rnd() * 60) * DAY,
      });
    }
  }
  return rows;
}

function ads(rnd, now) {
  const rows = [
    ["Осенняя акция: 0% комиссии на возвраты", "PSP", "Paid PSP"],
    ["Подключите оплату по QR", "Торговцы", "Все торговцы"],
    ["Новый 3-D Secure 2.2", "Шлюзы", "EPay Gateway"],
    ["Отчёты в один клик", "Торговцы", "ООО «Цифра»"],
    ["Снижение ставки для новых магазинов", "PSP", "NorthPay"],
    ["Регламентные работы 12.11", "Шлюзы", "SecurePay"],
    ["Кешбэк для покупателей", "Торговцы", "ООО «Технопарк»"],
    ["Black Friday: лимиты повышены", "PSP", "Baltic Pay"],
    ["Интеграция с ЕРИП", "Шлюзы", "Paid Core"],
  ];
  return rows.map(([title, category, target], i) => {
    const start = now - Math.floor(10 + rnd() * 80) * DAY;
    const end = start + Math.floor(20 + rnd() * 70) * DAY;
    const status = end < now ? "Закончена" : rnd() < 0.75 ? "Активна" : "Неактивна";
    return { id: `AD-${41 + i}`, title, category, target, start, end, status, views: Math.floor(rnd() * 48000) };
  });
}

function users(now) {
  return [
    ["Иван Иванов", "ivanov@paid.example", ["Администрирование"], true, 220],
    ["Анна Соколова", "a.sokolova@paid.example", ["Обслуживание", "Поддержка"], true, 180],
    ["Павел Смирнов", "p.smirnov@paid.example", ["Бухгалтерия"], true, 150],
    ["Ольга Морозова", "o.morozova@paid.example", ["Поддержка"], true, 96],
    ["Дмитрий Новиков", "d.novikov@paid.example", ["Обслуживание"], false, 64],
    ["Мария Козлова", "m.kozlova@paid.example", ["Бухгалтерия", "Обслуживание"], true, 31],
  ].map(([name, email, roles, active, ago], i) => ({ id: `U-${11 + i}`, name, email, roles, active, createdAt: now - ago * DAY }));
}

function subscriptions(rnd, now, pays) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  return Array.from({ length: 28 }, (_, i) => {
    const p = pays[i * 2];
    const status = pick(["Активна", "Активна", "Активна", "Приостановлена", "Отменена", "Просрочена"]);
    const plan = pick([["Premium", 29.9], ["Базовый", 9.9], ["Бизнес", 99], ["Семейный", 19.9]]);
    return {
      id: `SUB-${5120 + i}`, email: p.email, merchant: p.merchant, plan: plan[0], amount: plan[1], currency: "BYN", status,
      createdAt: now - Math.floor(5 + rnd() * 200) * DAY,
      nextCharge: status === "Активна" ? now + Math.floor(1 + rnd() * 29) * DAY : null,
    };
  });
}

function lists(rnd, now, pays) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  return Array.from({ length: 18 }, (_, i) => {
    const p = pays[i * 3];
    const kind = pick(["Карта", "E-mail", "IP", "БИН", "Телефон"]);
    const value = { "Карта": `${p.bin} •••• ${p.last4}`, "E-mail": maskEmail(p.email), "IP": maskIp(p.ip), "БИН": p.bin, "Телефон": maskPhone(p.phone) }[kind];
    const black = rnd() < 0.7;
    return {
      id: `L-${701 + i}`, value, raw: `${p.bin}${p.last4} ${p.email} ${p.ip} ${p.phone}`, kind, list: black ? "Чёрный" : "Белый",
      reason: black ? pick(["Чарджбэк", "Мошенничество подтверждено", "Подозрительная активность", "Запрос банка"]) : pick(["VIP-клиент", "Проверен вручную", "Корпоративная карта"]),
      addedAt: now - Math.floor(rnd() * 120) * DAY, addedBy: pick(["Анна Соколова", "Ольга Морозова", "Иван Иванов"]),
    };
  });
}

function payouts(rnd, now) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  return Array.from({ length: 26 }, (_, i) => {
    const date = now - Math.floor(i * 3.2 + rnd() * 2) * DAY + (i < 3 ? 6 * DAY : 0);
    const m = pick(MERCHANTS.slice(0, 6));
    return {
      id: `PO-${9300 - i}`, merchant: m.name, bank: pick(BANKS), amount: Math.round((800 + rnd() * 24000) * 100) / 100,
      currency: pick(["BYN", "BYN", "USD"]), date,
      status: date > now ? "Запланирована" : i < 5 ? "В обработке" : "Выплачена",
    };
  });
}

function finReports(rnd, now) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const months = ["Июль 2026", "Август 2026", "Сентябрь 2026", "Октябрь 2026"];
  return Array.from({ length: 20 }, (_, i) => {
    const m = MERCHANTS[i % 6];
    const shop = pick(m.shops);
    const kind = pick(["Сверка", "Акт", "Реестр выплат", "Отчёт по комиссиям"]);
    return {
      id: `FR-${3400 + i}`, title: `${kind} — ${months[i % 4]}`, merchant: m.name, shop, period: months[i % 4],
      status: i < 2 ? "Формируется" : i === 7 ? "Ошибка" : "Готов", createdAt: now - Math.floor(i * 4 + rnd() * 3) * DAY,
    };
  });
}

function deposits(rnd, now) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  return Array.from({ length: 16 }, (_, i) => {
    const m = MERCHANTS[i % 6];
    const createdAt = now - Math.floor(10 + rnd() * 170) * DAY;
    const holdUntil = createdAt + 180 * DAY;
    return {
      id: `DEP-${610 + i}`, merchant: m.name, shop: pick(m.shops), bank: pick(BANKS),
      amount: Math.round((500 + rnd() * 9000) * 100) / 100, currency: "BYN", createdAt, holdUntil,
      status: holdUntil < now ? "Возвращён" : i === 9 ? "Списан" : "Удерживается",
    };
  });
}

function massPayouts(rnd, now) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  return Array.from({ length: 12 }, (_, i) => {
    const m = MERCHANTS[i % 6];
    const createdAt = now - Math.floor(i * 6 + rnd() * 4) * DAY;
    const d = new Date(createdAt);
    return {
      id: `MP-${180 - i}`, file: `payouts_${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}.csv`,
      merchant: m.name, shop: pick(m.shops), email: `reports@${m.email.split("@")[1]}`,
      rowsCount: 20 + Math.floor(rnd() * 480), amount: Math.round((2000 + rnd() * 90000) * 100) / 100, currency: "BYN",
      status: i === 0 ? "В обработке" : i === 4 ? "Ошибка" : "Обработан", createdAt,
    };
  });
}

// One call builds every dataset; `now` is injectable so builds are reproducible.
export function createData(now = Date.now()) {
  const rnd = mulberry32(20260721);
  const pays = payments(rnd, now, 57);
  return {
    now,
    payments: pays,
    events: events(mulberry32(7), pays),
    rules: rules(mulberry32(11), now),
    ads: ads(mulberry32(13), now),
    users: users(now),
    merchants: MERCHANTS.map((m, i) => ({ ...m, shopsCount: m.shops.length, createdAt: now - (400 - i * 37) * DAY })),
    shops: SHOPS.map((s) => ({ ...s })),
    subscriptions: subscriptions(mulberry32(17), now, pays),
    lists: lists(mulberry32(19), now, pays),
    payouts: payouts(mulberry32(23), now),
    finReports: finReports(mulberry32(29), now),
    deposits: deposits(mulberry32(31), now),
    massPayouts: massPayouts(mulberry32(37), now),
  };
}
