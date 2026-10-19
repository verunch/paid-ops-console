# Paid — Internal Payment Operations Console (Figma Prototype)

A clickable Figma prototype for an internal payment-operations console, modeled loosely on a typical payment provider's search/reporting tooling.

**This is a UX/UI concept exploration — not a production application, not shipped code, and not an official Paid release.** There is no backend, no real data processing, and no application code in this repository; every interactive state is a prepared Figma frame wired together with prototype connections.

## Status

In progress. Built natively in Figma (frames, components, variants, Auto Layout, variables, prototype connections) — no React/HTML/CSS/TypeScript involved. See the Figma file for current progress; this README documents scope and intent, not a moment-in-time snapshot of what's already drawn.

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

## Visual design — Ascendra, maximally light

Styling is adapted from the **Ascendra Design System** (`../Ascendra/design-system`) — palette, type scale, spacing, radii, shadows, and control specs — reinterpreted as a **maximally light** variant for a calm, long-daily-use accounting/operations interface:

- Near-white application background, white surfaces, very pale tinted section backgrounds.
- Subtle 1px borders in place of heavier separators; minimal, restrained shadows (card/popover/modal elevation only).
- Ascendra's sage primary ramp and critical/status ramps carried over, with Admin and User given distinct restrained accent colors rather than separate themes.
- IBM Plex Sans / IBM Plex Mono type scale, 8px spacing grid, and Ascendra's radius/elevation scale.

Ascendra's own source files were not modified, and no Ascendra branding was copied — only its token values and interaction patterns were reused as a foundation.

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
- `tools/build-site.mjs` — generates the static HTML prototype from the tokens and field maps.
- `site/` — the generated HTML prototype (deployed to Vercel).
- `site-figma-export/` — self-contained copies of every page (CSS inlined) for HTML-to-Figma importers.
- Original reference screenshots are intentionally not included.
