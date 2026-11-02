// GitHub Pages copy of site/: the project is served from a sub-path
// (https://verunch.github.io/paid-ops-console/), so root-relative links
// (href="/…", src="/…") in HTML and in the console's JS are prefixed with it.
// Usage: node tools/build-pages.mjs <outDir> [/paid-ops-console]
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = path.join(ROOT, "site");
const [outDir, base = "/paid-ops-console"] = process.argv.slice(2);
if (!outDir) throw new Error("usage: node tools/build-pages.mjs <outDir> [base]");

fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(SITE, outDir, { recursive: true });
let files = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { walk(f); continue; }
    if (!/\.(html|js)$/.test(e.name)) continue;
    const src = fs.readFileSync(f, "utf8");
    const out = src.replace(/\b(href|src)=(\\?)"\//g, (m, attr, bs) => `${attr}=${bs}"${base}/`);
    if (out !== src) { fs.writeFileSync(f, out); files++; }
  }
})(outDir);
fs.writeFileSync(path.join(outDir, ".nojekyll"), "");
console.log(`GitHub Pages build: ${files} files rewritten for ${base} → ${outDir}`);
