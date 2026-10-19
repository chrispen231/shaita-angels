// Confirm the desktop sidebar is unchanged (always visible, sticky, 264px).
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const css = readFileSync(".next/static/chunks/2hc8uhxz61ty4.css", "utf8");
const P = "AdminShell-module__xsBb8G__";
const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${css} body{margin:0}</style></head><body>
<div class="${P}shell admin-shell">
  <aside class="${P}sidebar">
    <div class="${P}sidebarTop">
      <a class="${P}brand" href="/admin"><span><strong>Shaita Angels</strong><small>Club admin</small></span></a>
      <button type="button" class="${P}menuToggle">Menu</button>
    </div>
    <nav id="admin-navigation" class="${P}navigation">
      <div class="${P}navigationGroups">
        <section class="${P}group"><h2 class="${P}groupLabel">Matches</h2>
        <ul class="${P}navList"><li><a class="${P}navLink" href="#"><span>Fixtures</span></a></li></ul></section>
      </div>
    </nav>
  </aside>
  <div class="${P}main"><header class="${P}header"><h1 class="${P}title">Dashboard</h1></header></div>
</div></body></html>`;

const b = await chromium.launch();
const results = [];
const check = (n, pass, d = "") => { results.push({ n, pass, d }); console.log(`${pass ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`); };

for (const [label, vp] of [["Desktop 1440", { width: 1440, height: 900 }], ["Laptop 1280", { width: 1280, height: 800 }], ["Tablet 901 (desktop edge)", { width: 901, height: 800 }]]) {
  console.log(`\n--- ${label} ---`);
  const ctx = await b.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(200);
  const m = await page.evaluate(() => {
    const nav = document.getElementById("admin-navigation");
    const side = document.querySelector("aside");
    const toggle = document.querySelector("button");
    const nr = nav.getBoundingClientRect();
    return {
      navDisplay: getComputedStyle(nav).display,
      navPosition: getComputedStyle(nav).position,
      sidebarPosition: getComputedStyle(side).position,
      sidebarWidth: Math.round(side.getBoundingClientRect().width),
      toggleDisplay: getComputedStyle(toggle).display,
      navVisible: nr.width > 0 && nr.height > 0,
      bodyOverflow: document.body.style.overflow,
    };
  });
  check(`${label}: sidebar is sticky`, m.sidebarPosition === "sticky", m.sidebarPosition);
  check(`${label}: sidebar is 264px`, m.sidebarWidth === 264, `${m.sidebarWidth}px`);
  check(`${label}: nav is visible (not hidden)`, m.navVisible === true);
  check(`${label}: nav is NOT fixed (in-flow column)`, m.navPosition === "static", m.navPosition);
  check(`${label}: menu toggle hidden on desktop`, m.toggleDisplay === "none", m.toggleDisplay);
  check(`${label}: body not scroll-locked`, m.bodyOverflow !== "hidden", `"${m.bodyOverflow}"`);
  await ctx.close();
}

await b.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { for (const f of failed) console.log(` - ${f.n}: ${f.d}`); process.exit(1); }
