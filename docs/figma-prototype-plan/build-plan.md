# Paid Figma prototype — resume plan (post quota-reset)

fileKey: `2hKSHTHF4Z5OplCx5R0zZ9`
Pages (Free-plan 3-page limit): `00 — Cover & Design System`, `01 — Search & Tables`, `02 — Prototype Flow & References`

Supporting data files (same directory as this plan):
- `design-tokens.json` — full color/spacing/radius/typography/elevation spec, hex + rgb01
- `field-maps.json` — verbatim field-by-field spec for all 4 search screens + tooltip rules + table columns/states
- `batch1-foundations.js` — ready-to-run script for step 1 below

## Call sequence (1 audit read + 4 build batches)

### Step 0 — Audit (read-only, cheap)
`get_metadata(fileKey, nodeId: "0:1")` → see what's already on `00 — Cover`. The user's earlier message said components already exist there; confirm what they are (names, types, IDs) before Batch 2 so nothing is duplicated. If time allows, also screenshot it.

### Batch 1 — Foundations (`batch1-foundations.js`, ~ready as-is)
Creates/verifies the 3 pages, `Color`/`Spacing`/`Radius` variable collections (~31 color vars, 8 spacing, 4 radius), 3 effect styles (card/popover/modal shadow), 9 text styles (Display→Overline + Mono/Body-sm). Idempotent by name — safe even if Batch 1 partially ran before. Font resolution is defensive (IBM Plex Sans → Inter fallback, IBM Plex Mono → Roboto Mono fallback) via `listAvailableFontsAsync` at runtime.
**Before running:** merge in whatever Step 0 found — if collections/styles by these names already exist on page 00, the idempotency checks will pick them up rather than duplicate, but confirm naming matches.

### Batch 2 — Components (page `00 — Cover & Design System`)
Build (or finish, if Step 0 shows partial work) as component sets, each bound to Batch 1's variables — no hardcoded hex/px:

| Component | Variants |
|---|---|
| Button | Style=Primary/Secondary/Ghost/Destructive × Size=sm/md/lg × State=Default/Hover/Focus/Disabled |
| Text Input | State=Default/Filled/Focus/Error/Disabled |
| Select/Dropdown | State=Default/Filled/Open/Focus/Disabled |
| Checkbox | State=Unchecked/Checked/Focus/Disabled |
| Tooltip | Kind=Hint/Truncation (dark bubble, small triangle) |
| Status Badge | Status=Success/Warning/Error/Info/Neutral (icon or shape + label, never color-only) |
| Table Header Cell | Sort=None/Asc/Desc |
| Table Row | State=Default/Hover/Selected/Striped |
| Pagination | control bar: page buttons + rows-per-page select |
| Toast | Kind=Success (export confirmation), positioned bottom-right or top-center |
| Drawer/Modal | shell only here; content built in Batch 4 |
| Loading Skeleton | shimmer block, table-row-shaped |
| Empty State | icon/illustration + "нет результатов" message |

Row height: Compact 36px for Admin density default, Comfort 48px available as an alt Table Row variant if time permits (nice-to-have, not required).
Use `combineAsVariants` + manual grid layout (variants stack at 0,0 by default — must be repositioned). Validate each with `get_metadata` + one `screenshot()` call at the end of the batch, not per-component (stay within the batch budget).

### Batch 3 — Search screens + results tables (page `01 — Search & Tables`)
Build a single reusable script function `buildSearchFrame(name, fieldMapKey, roleAccentVar)` and call it 4×, reading structure from `field-maps.json`'s `adminBasic` / `adminAdvanced` / `userBasic` / `userAdvanced` objects (inline the JSON as a JS object literal in the script — the sandbox can't read files). Each frame:
- 1440px wide, Auto Layout vertical, `bg/canvas` background, `spacing/lg` page padding.
- Header: "Список платежей" (H1 style) + role badge (accent/admin or accent/user) + Basic/Advanced toggle indicator.
- One Auto Layout section per `groups[]` entry: section title (H3, `text/secondary`) then one Auto Layout row per `rows[]` entry, each row's children built from the field label list — text inputs default, `|select` suffix → Select component instance, `|checkbox(...)` → Checkbox instance, `|cardnum` → Text Input with monospace placeholder. Preserve exact row groupings from the JSON — do not re-flow field counts per row.
- Tooltip fields (`tooltip-persistent:`) get a Tooltip instance wired via prototype "while hovering" interaction in Batch 4, with the given content baked into the tooltip instance now.
- Footer row: Искать (Primary button) + Экспортировать в XLSX (Secondary) on the left; Расширенный поиск checkbox (checked state per JSON) + Очистить поля (Secondary) on the right.
- **Results table below every frame**, columns from `resultsTableColumns` (+ `resultsTableColumnsAdminExtra` for Admin only — Процессор/Магазин-Мерчант/Фрод-маркер/Тест), 5–6 rows of fictional masked data (e.g. card `•••• 1234`, email `a***@example.com`). Build all 10 required states (`requiredTableStates` in the JSON) — the pragmatic approach is one fully "populated" table per frame plus a small separate row of state-swatch frames (loading skeleton / no-results / selected / select-all / sorted / pagination / rows-per-page / export-confirmation) placed to the right or below, since Figma frames aren't stateful — the *prototype* (Batch 4) is what makes them feel like transitions between these pre-built frames.

Given 4 full frames × (search panel + table + state swatches) is large, split Batch 3 into **3a (Admin Basic + Advanced)** and **3b (User Basic + Advanced)** if the combined script would exceed ~45k characters — check length before sending; only split if needed.

### Batch 4 — Transaction Details drawer + prototype wiring + references (page `02 — Prototype Flow & References`)
- Build the Transaction Details drawer/modal (right-side drawer, overlay, masked fields only, close button) as its own component + one placed instance.
- On `02`, add a simple prototype-flow diagram (frames or sticky-style notes describing the connection map below) — optional polish, not required by the spec, skip if time-constrained.
- Add the Source References sub-section: place/describe the 5 reference screenshots + comments.png (import as images via `figma.createImage` from local file bytes is not available through this MCP path — instead recreate as a labeled placeholder frame linking each by filename/description, or skip if `upload_assets`/image tools aren't in scope; note the limitation rather than fabricate).
- Wire prototype connections (Prototype tab reactions, `node.reactions` via Plugin API `setReactionsAsync` or interactions):
  - Admin ↔ User (role badge / nav click)
  - Basic ↔ Advanced (checkbox or toggle click)
  - Select/Dropdown open + option click
  - Tooltip hover show
  - One validation error demo (e.g. Сумма field → error state on Искать click with empty required combo — pick one clear case)
  - Очистить поля → fields reset
  - Искать → loading-skeleton frame → (after delay) populated-results frame; empty-filters case → no-results frame
  - Column header click → sorted-column frame
  - Row checkbox click → selected-row frame; header checkbox → select-all frame
  - Pagination control click → pagination frame; rows-per-page select → rows-per-page frame
  - Row click → Transaction Details drawer open; drawer close (X or overlay click) → back to table
  - Экспортировать в XLSX click → export-confirmation / success toast

## Notes / open risks to resolve live, not guessed here
- Whatever Step 0's audit finds on page 00 may already satisfy part of Batch 1/2 — reconcile by name, don't duplicate.
- IBM Plex Sans/Mono availability is unverified (no live call made yet) — Batch 1's font-resolution code handles this at runtime.
- Image import for the references page is uncertain within `use_figma`'s sandbox — verify `figma.createImage(bytes)` availability during Batch 4; if blocked, use labeled placeholder frames instead of fabricating screenshots.
- "3–5 large calls" target assumes Batch 3 fits as 1 call; split into 3a/3b if the script is too large — that makes it 5 write calls + 1 audit read, still within intent.
