# Paid — Internal Payment Operations Console

A UX/UI concept for an internal payment-operations console, modeled loosely on a typical payment provider's search/reporting tooling. It ships as a **live MVP** (one interactive page), a set of **static screens** for Figma import, and a Figma file.

**This is a concept exploration — not a production application and not an official release.** There is no backend: the MVP runs entirely in the browser on a fixed, fictional data set (57 operations, masked personal data).

## Live MVP

`/` — an operations console with five workspaces (switcher in the sidebar; the route lives in the URL, e.g. `#/support/tx-edit`):

| Workspace | Screens |
|---|---|
| Администрирование | Платежи · Журнал событий · Антифрод-правила · Реклама · Пользователи (+ добавление/редактирование) |
| Клиент | Платежи |
| Обслуживание | Платежи · Отчёты · Торговцы · Магазины · Антифрод-правила |
| Поддержка | Платежи · Подписки · Чёрные и белые списки · Журнал событий · Изменение транзакции · Повторные уведомления |
| Бухгалтерия | Платежи (агрегаты по PSP/банку) · Отчёты · Выплаты · Финансовые отчёты · Страховые депозиты · Баланс · Массовые выплаты (+ создание) · Финансовая информация (4 вкладки) |

Everything works on a fixed, fictional data set: validation with input masks, keyboard-accessible single and multi-select comboboxes, filtering, aggregation, sorting, selection, pagination, drawers, toasts, `.xlsx` and `.csv` export generated in the browser, file upload, live rule switches.

**Tooltips** follow the reference rule: card digits, card mask and time zone show a persistent tooltip on hover/focus; any other field shows a tooltip with its **name** once it is filled (placeholder no longer visible). Turning on «Тестовые транзакции» shows test operations only and hides the export button.

## Screens for Figma

- `/screens` and `site-figma-export/` (top level) — the original static screens, kept byte-for-byte unchanged.
- `/new` and `site-figma-export/new/` — **NEW** screens from the second round of references: 82 states across all workspaces (defaults, results, validation, tooltips, open dropdowns, drawers, toasts, tabs) plus `new/design-system` with the components added for them (switch, radio, tabs, multi-select, search, textarea, file, stats, sidebar navigation). Every NEW page title starts with `NEW ·`.

## Figma

Figma file: `Paid — Internal Payment Operations Console`
(https://www.figma.com/design/2hKSHTHF4Z5OplCx5R0zZ9/Paid-%E2%80%94-Internal-Payment-Operations-Console)

## What this project is

An internal operator console for searching, reviewing, and exporting payment transactions, with two personas:

- **Admin** — sees operational/internal fields (processor, merchant name, card hash, fraud markers, test-transaction flag) and a cooler, stronger accent color.
- **User / Client** — a restricted view without processor, merchant name, or card-hash visibility, with a softer accent color.

Both personas share one design language and one component set; the difference is which fields and table actions are exposed, not a different visual theme.

## Field architecture — intentionally preserved, not redesigned here

The search-field structure, grouping, order, and Admin/User/Basic/Advanced differences were already analyzed and redesigned in an earlier pass, based on screenshots of the original interface (kept locally, not published in this repository). This prototype **preserves that architecture exactly** — no fields were added, removed, renamed, reordered, merged, or regrouped. Only visual styling was modernized.

Four field configurations are reproduced field-for-field from the references:

| | Basic | Advanced |
|---|---|---|
| **Admin** | `Админ простой поиск.png` | `Админ расширенный поиск.png` (+ tooltip behavior from `Админ расширенный поиск-tultips.png`) |
| **User/Client** | `Клиент простой поиск.png` | `Клиент расширенный поиск.png` |

Notable, deliberate asymmetries preserved from the source material:
- Admin-only fields: **Выберите процессор** (processor), **Выберите наименование торговца** (merchant name), **Хэш карты** (card hash).
- User-only field: **ID банка** — present for the client view, absent for Admin.
- Advanced search adds a **"Поиск мошеннической операции"** (fraud search) group for both personas: fraud filter, creation date, timezone, test-transaction toggle.
- The section title for the first field group changes between Admin's Basic and Advanced views (**"Поиск по типу транзакции"** → **"Поиск по данным операции"**); the User/Client view keeps the same title in both modes.

## Tooltip behavior

Per the original behavior notes, tooltip behavior applies to both Admin and Client:
- **Persistent hover tooltips** (always shown on hover, not conditional) on the card-number field, **Маска карты**, and **Временная зона**.
- All other fields show a **hover tooltip only when the field is filled and its value text is truncated** (i.e. standard overflow-tooltip behavior) — never a tooltip on an empty or fully-visible field.

## Visual design

Control styling follows the Paid design-system sheet (`docs/Group 1.png`) — buttons, text inputs, selects and checkboxes with Default / Hover / Focus / Filled / Disabled / Error states:

- **Primary action** orange `#D95032` (hover `#C13E22`), used for the primary button, checked checkboxes and active tab/page.
- **Secondary** buttons and checkboxes outlined in black; ghost buttons text-only; hover fill `#F4F7F6`.
- **Focus** is a 2px `#D95032` border; **error** is a 2px `#9E321C` border with a message underneath; **disabled** is a flat `#F2F2F2` fill.
- 40px control height, 6px radius, light borders `#E2E8E6` (hover `#C3D5D0`), primary text `#2B3936`, placeholder `#737373` (darkened from the sheet's `#8C8C8C` to reach WCAG AA 4.5:1). Field text is left-aligned for scanning.
- IBM Plex Sans / IBM Plex Mono type scale, 8px spacing grid; Admin and User keep their own restrained accent colors for role indicators.

All values live in `docs/figma-prototype-plan/design-tokens.json`; the HTML prototype and the Figma foundations script are generated from it.

## What's included

- **Admin and User** variants of **Basic** and **Advanced** search (4 search screens total), in Russian, at 1440px desktop width.
- A realistic payment-results table beneath every search panel, with fictional/masked data only, covering: loading skeleton, populated results, no-results, row selection, select-all, sorted column, pagination, rows-per-page, status badges, and an export-confirmation state.
- A lightweight **Transaction Details** drawer opened from a table row, with masked sensitive data and an overlay/close interaction.
- A clickable prototype connecting: Admin ↔ User, Basic ↔ Advanced, dropdown open/select, tooltip open, one validation-error demonstration, clear fields, search → loading → results/no-results, column sort, row selection, pagination, drawer open/close, and XLSX export → success toast.
- A compact design system: reusable variables (surfaces, text, borders, primary action, Admin/User accents, semantic status colors, focus ring, typography, spacing, radii, shadows) and components (Button, Text Input, Select, Checkbox, Tooltip, Status Badge, Table Header, Table Row, Pagination, Toast, Drawer/Modal, Loading Skeleton, Empty State) with their relevant states (Default, Hover, Focus, Filled, Selected, Disabled, Error).

## Accessibility

Contrast, visible focus states, comfortable desktop control sizing, and status labeling that does not rely on color alone were treated as requirements throughout, not an afterthought pass.

## Repository contents

- `docs/figma-prototype-plan/` — design tokens, field maps (source of truth for field structure) and the Figma build plan.
- `docs/figma-prototype-plan/field-maps-new.json` — field-by-field spec of the NEW screens and workspaces (second round of references).
- `src/console/` — shared, DOM-free modules (`data.js`, `ui.js`, `screens.js`, `xlsx.js`) used both by the live MVP (`app.js`, `console.css`) and by the static NEW screens, so they cannot drift apart.
- `tools/build-site.mjs` — generates `site/` from the tokens and field maps (original screens + shared CSS); `tools/build-new.mjs` adds the MVP and the NEW screens. Run `node tools/build-site.mjs`.
- `site/` — the generated site (deployed to Vercel): live MVP at `/`, original screens under `/screens`, NEW screens under `/new`.
- `site-figma-export/` — self-contained copies of every page (CSS inlined) for HTML-to-Figma importers; NEW screens in `site-figma-export/new/`.
- Original reference screenshots are intentionally not included.
