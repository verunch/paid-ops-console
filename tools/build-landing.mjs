// Landing page at "/": the case-study cover, a short summary, the work plan and
// the architecture, with links to the MVP (/mvp/) and the screen catalogs.
// Old MVP links (/?lang=en, /#/route) are forwarded to /mvp/ with the same query and hash.
import fs from "node:fs";
import path from "node:path";

const REPO = "https://github.com/verunch/paid-ops-console";
const MIRO = "https://miro.com/app/board/uXjVHMdVl74=/?moveToWidget=3458764689133524864";

export function buildLanding({ ROOT, writeFile, HEAD_LINKS }) {
  const cover = fs.readFileSync(path.join(ROOT, "docs/case-cover.svg"), "utf8")
    .replace('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640"', '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Обложка кейса: 27 полей поиска на одном экране без подписей"');

  const plan = [
    ["Разбор ТЗ и референсов", "4 формы (2 роли × 2 режима), правило тултипов от заказчика, сценарии операторов."],
    ["Спецификация полей", "Состав и порядок полей зафиксированы в field-maps.json — единый источник правды."],
    ["Структура формы", "Группы по сценарию поиска, фиксированные ряды, ширина поля по длине значения."],
    ["Правило подсказок", "Дерево решений для тултипов, маски ввода и валидация."],
    ["Дизайн-система", "Токены и компоненты со всеми состояниями."],
    ["MVP и макеты", "Живой MVP и макеты для Figma собираются из одного кода."],
    ["Проверка", "Замер высоты форм, сквозные сценарии в браузере, локализация."],
  ];
  const flow = [
    ["ТЗ и референсы", ""],
    ["Спецификация полей", "field-maps.json"],
    ["Токены", "design-tokens.json"],
    ["Общие модули", "src/console"],
  ];
  const outputs = [["Живой MVP", "5 рабочих мест"], ["Макеты для Figma", "116 экранов"], ["Дизайн-система", "/ds"]];
  const box = ([t, s]) => `<div class="node"><b>${t}</b>${s ? `<code>${s}</code>` : ""}</div>`;

  writeFile("index.html", `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Paid — кейс</title>
<meta name="description" content="Кейс: поиск платежей на 27 полей на одном экране без подписей — группировка полей и правило тултипов." />
<script>
  // Old MVP links lived at "/": forward them to the MVP's new address.
  if (location.hash.indexOf("#/") === 0 || /[?&]lang=/.test(location.search)) location.replace("mvp/" + location.search + location.hash);
</script>
${HEAD_LINKS}
<link rel="stylesheet" href="/assets/css/tokens.css" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #F4F2EE; color: var(--color-text-primary); font-family: var(--font-family-sans); -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 32px 16px 64px; }
  .cover svg { display: block; width: 100%; height: auto; border-radius: 12px; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 24px 0 48px; }
  .btn { display: inline-flex; align-items: center; height: 40px; padding: 0 16px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; border: 1px solid var(--color-border-contrast); color: var(--color-text-primary); background: #fff; }
  .btn:hover { background: var(--color-surface-hover); }
  .btn-primary { background: var(--color-action-primary); border-color: var(--color-action-primary); color: #fff; }
  .btn-primary:hover { background: var(--color-action-primary-hover); }
  h2 { font-size: 24px; margin: 0 0 16px; }
  section { margin-bottom: 48px; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
  .card { background: #fff; border: 1px solid var(--color-border-default); border-radius: 12px; padding: 20px; }
  .card h3 { margin: 0 0 8px; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--color-action-primary); }
  .card p { margin: 0; font-size: 15px; line-height: 1.5; }
  ol.plan { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; counter-reset: s; }
  ol.plan li { counter-increment: s; background: #fff; border: 1px solid var(--color-border-default); border-radius: 12px; padding: 16px; font-size: 14px; line-height: 1.45; }
  ol.plan li::before { content: counter(s, decimal-leading-zero); display: block; font-family: var(--font-family-mono); font-size: 12px; color: var(--color-action-primary); margin-bottom: 6px; }
  ol.plan b { display: block; font-size: 15px; margin-bottom: 4px; }
  .arch { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 900px) { .arch { grid-template-columns: 1fr; } }
  pre { margin: 0; font-family: var(--font-family-mono); font-size: 13px; line-height: 1.6; white-space: pre; overflow-x: auto; }
  .flow { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .node { background: #F4F7F6; border: 1px solid var(--color-border-default); border-radius: 8px; padding: 8px 12px; font-size: 14px; }
  .node b { display: block; font-weight: 600; }
  .node code { font-family: var(--font-family-mono); font-size: 12px; color: var(--color-text-secondary); }
  .arrow { color: var(--color-text-secondary); font-size: 18px; }
  .out .node { background: #fff; border-color: var(--color-action-primary); }
  .note { font-size: 14px; color: var(--color-text-secondary); margin: 12px 0 0; }
  footer { font-size: 14px; color: var(--color-text-secondary); }
  footer a { color: var(--color-text-primary); }
</style>
</head>
<body>
<main class="wrap">
  <div class="cover">${cover}</div>

  <nav class="actions" aria-label="Разделы">
    <a class="btn btn-primary" href="/mvp/">Открыть MVP</a>
    <a class="btn" href="/mvp/?lang=en">MVP in English</a>
    <a class="btn" href="/screens/">Экраны для Figma</a>
    <a class="btn" href="/ds/">Дизайн-система</a>
    <a class="btn" href="${REPO}/blob/main/docs/CASE-STUDY.md">Кейс полностью</a>
    <a class="btn" href="${MIRO}">ИА и флоу в Miro</a>
  </nav>

  <section>
    <h2>Коротко</h2>
    <div class="summary">
      <div class="card"><h3>Проблема</h3><p>Все 27 полей поиска нужно сохранить, форма вместе с результатами должна помещаться на экране, а для подписей над полями нет места.</p></div>
      <div class="card"><h3>Решение</h3><p>Смысловые группы с заголовками, название поля в плейсхолдере, тултип с названием, когда поле заполнено, и постоянные подсказки формата у трёх полей.</p></div>
      <div class="card"><h3>Результат</h3><p>Форма ниже на 17–19 %, ни одно поле не убрано, правило тултипов одинаково для обеих ролей — с мышью и с клавиатуры.</p></div>
    </div>
  </section>

  <section>
    <h2>План работы</h2>
    <ol class="plan">${plan.map(([t, d]) => `<li><b>${t}</b>${d}</li>`).join("")}</ol>
  </section>

  <section>
    <h2>Архитектура</h2>
    <div class="arch">
      <div class="card">
        <h3>Экран «Список платежей»</h3>
<pre>Список платежей
├─ Шапка: роль · режим
├─ Панель фильтров
│   ├─ Данные операции
│   ├─ Данные банковской карты
│   ├─ Данные плательщика
│   ├─ Дата              ← расширенный
│   └─ Мошенничество     ← расширенный
├─ Таблица результатов
│   сортировка · выбор · пагинация · XLSX
└─ Drawer «Детали транзакции»</pre>
      </div>
      <div class="card">
        <h3>Проект</h3>
        <div class="flow">
          <div class="row">${box(flow[0])}<span class="arrow" aria-hidden="true">→</span>${box(flow[1])}${box(flow[2])}</div>
          <div class="row"><span class="arrow" aria-hidden="true">↓</span>${box(flow[3])}<span class="node"><b>Локализация</b><code>i18n.js · en.js</code></span></div>
          <div class="row out"><span class="arrow" aria-hidden="true">↓</span>${outputs.map(box).join("")}</div>
        </div>
        <p class="note">MVP и макеты рендерятся одними и теми же модулями, поэтому не расходятся между собой.</p>
      </div>
    </div>
  </section>

  <footer>Концепт, не продукт: данные вымышлены, бэкенда нет. Код — <a href="${REPO}">github.com/verunch/paid-ops-console</a></footer>
</main>
</body>
</html>
`);
}
