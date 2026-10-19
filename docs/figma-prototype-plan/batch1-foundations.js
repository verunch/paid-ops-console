// BATCH 1 — Pages + Color/Spacing/Radius variables + effect styles + text styles.
// Idempotent: safe to re-run (checks by name before creating).
// Paste as the `code` param of use_figma. fileKey: 2hKSHTHF4Z5OplCx5R0zZ9
// skillNames: "figma-use,figma-generate-library"

const created = { pages: [], collections: [], variables: [], effectStyles: [], textStyles: [] };
const notes = [];

// ---------- 1. Ensure 3 pages exist (Free plan limit) ----------
const wantedPages = ["00 — Cover & Design System", "01 — Search & Tables", "02 — Prototype Flow & References"];
let existingPages = figma.root.children;
// The very first page may currently be named "00 — Cover" — rename it if so.
let coverPage = existingPages.find(p => p.name === "00 — Cover" || p.name === wantedPages[0]);
if (coverPage && coverPage.name !== wantedPages[0]) {
  coverPage.name = wantedPages[0];
}
if (!coverPage) {
  coverPage = existingPages[0]; // fall back to whatever the first page is
  coverPage.name = wantedPages[0];
}
for (const name of wantedPages.slice(1)) {
  let p = figma.root.children.find(pg => pg.name === name);
  if (!p) {
    p = figma.createPage();
    p.name = name;
  }
  created.pages.push({ id: p.id, name: p.name });
}
created.pages.unshift({ id: coverPage.id, name: coverPage.name });

// ---------- 2. Color / Spacing / Radius variable collections ----------
async function getOrCreateCollection(name, modeNames) {
  const all = await figma.variables.getLocalVariableCollectionsAsync();
  let col = all.find(c => c.name === name);
  if (!col) {
    col = figma.variables.createVariableCollection(name);
    col.renameMode(col.modes[0].modeId, modeNames[0]);
    for (let i = 1; i < modeNames.length; i++) col.addMode(modeNames[i]);
  }
  return col;
}

function rgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

async function getOrCreateVar(collection, name, type, scopes, cssVarName) {
  const all = await figma.variables.getLocalVariablesAsync();
  let v = all.find(v => v.name === name && v.variableCollectionId === collection.id);
  if (!v) {
    v = figma.variables.createVariable(name, collection, type);
  }
  v.scopes = scopes;
  v.setVariableCodeSyntax('WEB', `var(--${cssVarName})`);
  return v;
}

const COLOR_TOKENS = {
  "bg/canvas": { hex: "#FBFBFA", scopes: ["FRAME_FILL"] },
  "surface/default": { hex: "#FFFFFF", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  "surface/subtle": { hex: "#FAFAFA", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  "surface/sunken": { hex: "#F7F8F7", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  "text/primary": { hex: "#33383A", scopes: ["TEXT_FILL"] },
  "text/secondary": { hex: "#6B7370", scopes: ["TEXT_FILL"] },
  "text/muted": { hex: "#9AA19E", scopes: ["TEXT_FILL"] },
  "text/inverse": { hex: "#FFFFFF", scopes: ["TEXT_FILL"] },
  "border/default": { hex: "#E7E9E7", scopes: ["STROKE_COLOR"] },
  "border/strong": { hex: "#D3D8D5", scopes: ["STROKE_COLOR"] },
  "action/primary": { hex: "#465D58", scopes: ["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR"] },
  "action/primary-hover": { hex: "#384A46", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  "accent/admin": { hex: "#3E6FA8", scopes: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"] },
  "accent/admin-bg": { hex: "#EAF1F8", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  "accent/user": { hex: "#85A49E", scopes: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"] },
  "accent/user-bg": { hex: "#EEF3F2", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  "status/success": { hex: "#3E9268", scopes: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"] },
  "status/success-bg": { hex: "#ECF4EF", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  "status/success-border": { hex: "#D3E7DC", scopes: ["STROKE_COLOR"] },
  "status/warning": { hex: "#C68A2E", scopes: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"] },
  "status/warning-bg": { hex: "#FBF2E2", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  "status/warning-border": { hex: "#F5E0B8", scopes: ["STROKE_COLOR"] },
  "status/error": { hex: "#D95032", scopes: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"] },
  "status/error-bg": { hex: "#FCEEEA", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  "status/error-border": { hex: "#F7D6CC", scopes: ["STROKE_COLOR"] },
  "status/info": { hex: "#3E6FA8", scopes: ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"] },
  "status/info-bg": { hex: "#EAF1F8", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  "status/info-border": { hex: "#CBDDF0", scopes: ["STROKE_COLOR"] },
  "focus/ring": { hex: "#A4BFBA", scopes: ["STROKE_COLOR", "EFFECT_COLOR"] },
  "disabled/bg": { hex: "#F5F5F4", scopes: ["FRAME_FILL", "SHAPE_FILL"] },
  "disabled/border": { hex: "#E7E9E7", scopes: ["STROKE_COLOR"] },
  "disabled/text": { hex: "#B4B9B6", scopes: ["TEXT_FILL"] },
};

const SPACING_TOKENS = { "2xs": 4, "xs": 8, "sm": 12, "md": 16, "lg": 24, "xl": 32, "2xl": 48, "3xl": 64 };
const RADIUS_TOKENS = { "sm": 3, "md": 6, "lg": 10, "full": 999 };

const colorCollection = await getOrCreateCollection("Color", ["Light"]);
const spacingCollection = await getOrCreateCollection("Spacing", ["Value"]);
const radiusCollection = await getOrCreateCollection("Radius", ["Value"]);
created.collections.push(
  { id: colorCollection.id, name: "Color" },
  { id: spacingCollection.id, name: "Spacing" },
  { id: radiusCollection.id, name: "Radius" }
);

const lightModeId = colorCollection.modes[0].modeId;
for (const [name, def] of Object.entries(COLOR_TOKENS)) {
  const cssName = "color-" + name.replace(/\//g, "-");
  const v = await getOrCreateVar(colorCollection, name, "COLOR", def.scopes, cssName);
  v.setValueForMode(lightModeId, rgb(def.hex));
  created.variables.push({ id: v.id, name: v.name, collection: "Color" });
}

const spacingModeId = spacingCollection.modes[0].modeId;
for (const [name, val] of Object.entries(SPACING_TOKENS)) {
  const cssName = "spacing-" + name;
  const v = await getOrCreateVar(spacingCollection, "spacing/" + name, "FLOAT", ["GAP", "WIDTH_HEIGHT"], cssName);
  v.setValueForMode(spacingModeId, val);
  created.variables.push({ id: v.id, name: v.name, collection: "Spacing" });
}

const radiusModeId = radiusCollection.modes[0].modeId;
for (const [name, val] of Object.entries(RADIUS_TOKENS)) {
  const cssName = "radius-" + name;
  const v = await getOrCreateVar(radiusCollection, "radius/" + name, "FLOAT", ["CORNER_RADIUS"], cssName);
  v.setValueForMode(radiusModeId, val);
  created.variables.push({ id: v.id, name: v.name, collection: "Radius" });
}

// ---------- 3. Effect styles (minimal, restrained shadows) ----------
async function getOrCreateEffectStyle(name, offsetY, blur, hex, opacity) {
  const all = await figma.getLocalEffectStylesAsync();
  let style = all.find(s => s.name === name);
  if (!style) style = figma.createEffectStyle();
  style.name = name;
  style.effects = [{
    type: "DROP_SHADOW",
    color: { ...rgb(hex), a: opacity },
    offset: { x: 0, y: offsetY },
    radius: blur,
    spread: 0,
    visible: true,
    blendMode: "NORMAL",
  }];
  return style;
}

const shadowCard = await getOrCreateEffectStyle("shadow/card", 1, 2, "#1E2926", 0.05);
const shadowPopover = await getOrCreateEffectStyle("shadow/popover", 4, 12, "#1E2926", 0.07);
const shadowModal = await getOrCreateEffectStyle("shadow/modal", 12, 32, "#1E2926", 0.12);
created.effectStyles.push(
  { id: shadowCard.id, name: shadowCard.name },
  { id: shadowPopover.id, name: shadowPopover.name },
  { id: shadowModal.id, name: shadowModal.name }
);

// ---------- 4. Text styles (IBM Plex Sans, with Inter fallback) ----------
const availableFonts = await figma.listAvailableFontsAsync();
function pickFont(preferredFamily, weightWord, fallbackFamily) {
  const wants = weightWord.toLowerCase().replace(/\s+/g, "");
  const fam = availableFonts.filter(f => f.fontName.family === preferredFamily);
  if (fam.length) {
    let m = fam.find(f => f.fontName.style.toLowerCase().replace(/\s+/g, "") === wants);
    if (!m) m = fam.find(f => f.fontName.style.toLowerCase().replace(/\s+/g, "").includes(wants));
    if (!m) m = fam.find(f => f.fontName.style === "Regular") || fam[0];
    return m.fontName;
  }
  const fb = availableFonts.filter(f => f.fontName.family === fallbackFamily);
  if (fb.length) {
    let m = fb.find(f => f.fontName.style.toLowerCase().replace(/\s+/g, "") === wants);
    if (!m) m = fb.find(f => f.fontName.style === "Regular") || fb[0];
    notes.push(`Font fallback: ${preferredFamily} unavailable, used ${fallbackFamily} for weight ${weightWord}`);
    return m.fontName;
  }
  notes.push(`Font fallback: neither ${preferredFamily} nor ${fallbackFamily} available, used Inter Regular`);
  return { family: "Inter", style: "Regular" };
}

const TEXT_STYLES = [
  { name: "Display", size: 34, weight: "Bold", lh: 110 },
  { name: "H1", size: 24, weight: "SemiBold", lh: 120 },
  { name: "H2", size: 19, weight: "SemiBold", lh: 130 },
  { name: "H3", size: 16, weight: "SemiBold", lh: 140 },
  { name: "Body", size: 15, weight: "Regular", lh: 155 },
  { name: "Body-sm", size: 13, weight: "Regular", lh: 145 },
  { name: "Caption", size: 12, weight: "Medium", lh: 140 },
  { name: "Overline", size: 11, weight: "SemiBold", lh: 140, tracking: 8 },
];

for (const def of TEXT_STYLES) {
  const fontName = pickFont("IBM Plex Sans", def.weight, "Inter");
  await figma.loadFontAsync(fontName);
  const all = await figma.getLocalTextStylesAsync();
  let style = all.find(s => s.name === def.name);
  if (!style) style = figma.createTextStyle();
  style.name = def.name;
  style.fontName = fontName;
  style.fontSize = def.size;
  style.lineHeight = { unit: "PERCENT", value: def.lh };
  if (def.tracking) style.letterSpacing = { unit: "PERCENT", value: def.tracking };
  if (def.name === "Overline") style.textCase = "UPPER";
  created.textStyles.push({ id: style.id, name: style.name, font: fontName });
}

// Mono style for identifiers/amounts
const monoFont = pickFont("IBM Plex Mono", "Regular", "Roboto Mono");
await figma.loadFontAsync(monoFont);
const allTextStyles = await figma.getLocalTextStylesAsync();
let monoStyle = allTextStyles.find(s => s.name === "Mono/Body-sm");
if (!monoStyle) monoStyle = figma.createTextStyle();
monoStyle.name = "Mono/Body-sm";
monoStyle.fontName = monoFont;
monoStyle.fontSize = 13;
monoStyle.lineHeight = { unit: "PERCENT", value: 145 };
created.textStyles.push({ id: monoStyle.id, name: monoStyle.name, font: monoFont });

return { created, notes, summary: {
  pages: created.pages.length,
  collections: created.collections.length,
  variables: created.variables.length,
  effectStyles: created.effectStyles.length,
  textStyles: created.textStyles.length,
}};
