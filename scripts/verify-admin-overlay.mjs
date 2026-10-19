// Render the real compiled AdminShell stylesheet against the real DOM structure
// to confirm the mobile overlay geometry. The admin area needs a Supabase
// session, so this harness loads the actual built CSS instead of the page.
import { chromium, devices } from "playwright-core";
import { readFileSync } from "node:fs";

const CSS_PATH = ".next/static/chunks/2hc8uhxz61ty4.css";
const css = readFileSync(CSS_PATH, "utf8");
const P = "AdminShell-module__xsBb8G__";

const results = [];
const check = (n, pass, d = "") => {
  results.push({ n, pass, d });
  console.log(`${pass ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const html = `<!doctype html><html><head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${css}
  body{margin:0}</style></head><body>
<div class="${P}shell admin-shell">
  <aside class="${P}sidebar">
    <div class="${P}sidebarTop">
      <a class="${P}brand" href="/admin"><span><strong>Shaita Angels</strong><small>Club admin</small></span></a>
      <button type="button" class="${P}menuToggle">Menu</button>
    </div>
    <nav id="admin-navigation" class="${P}navigation ${P}navigationOpen">
      <div class="${P}navigationGroups">
        <section class="${P}group"><h2 class="${P}groupLabel">Matches</h2>
          <ul class="${P}navList">
            <li><a class="${P}navLink" href="#"><span>Fixtures</span></a></li>
            <li><a class="${P}navLink" href="#"><span>Matches &amp; lineups</span></a></li>
          </ul>
        </section>
        <section class="${P}group"><h2 class="${P}groupLabel">Content</h2>
          <ul class="${P}navList">
            <li><a class="${P}navLink" href="#"><span>News</span></a></li>
            <li><a class="${P}navLink" href="#"><span>Squad</span></a></li>
            <li><a class="${P}navLink" href="#"><span>Staff</span></a></li>
            <li><a class="${P}navLink" href="#"><span>Leadership</span></a></li>
            <li><a class="${P}navLink" href="#"><span>Honours</span></a></li>
            <li><a class="${P}navLink" href="#"><span>Media library</span></a></li>
          </ul>
        </section>
        <section class="${P}group"><h2 class="${P}groupLabel">Site</h2>
          <ul class="${P}navList">
            <li><a class="${P}navLink" href="#"><span>Sponsors</span></a></li>
            <li><a class="${P}navLink" href="#"><span>Social &amp; contact</span></a></li>
            <li><a class="${P}navLink" href="#"><span>Administrators</span></a></li>
          </ul>
        </section>
      </div>
      <div class="${P}foot">
        <a class="${P}utilityLink" href="#"><span>Dashboard</span></a>
        <a class="${P}utilityLink" href="#"><span>View public site</span></a>
        <button class="${P}signOut" type="submit"><span>Sign out</span></button>
      </div>
    </nav>
  </aside>
  <div class="${P}main">
    <header class="${P}header">
      <div><p class="${P}eyebrow">Super admin workspace</p><h1 class="${P}title">Dashboard</h1></div>
    </header>
  </div>
</div></body></html>`;

const b = await chromium.launch();

for (const device of ["iPhone 13", "Pixel 5", "iPad Mini"]) {
  console.log(`\n--- ${device} ---`);
  const ctx = await b.newContext({ ...devices[device] });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(300);

  const m = await page.evaluate(() => {
    const nav = document.getElementById("admin-navigation");
    const top = document.querySelector("aside > div");
    const nr = nav.getBoundingClientRect();
    const tr = top.getBoundingClientRect();
    const groups = document.querySelector("nav > div");
    return {
      navPosition: getComputedStyle(nav).position,
      navZ: getComputedStyle(nav).zIndex,
      topZ: getComputedStyle(top).zIndex,
      navTop: Math.round(nr.top),
      navBottom: Math.round(nr.bottom),
      navLeft: Math.round(nr.left),
      navRight: Math.round(nr.right),
      headerTop: Math.round(tr.top),
      groupsScrollable: getComputedStyle(groups).overflowY,
      vh: window.innerHeight,
      vw: window.innerWidth,
      navCoversHeader: nr.top <= tr.top + 1,
    };
  });

  check(`${device}: panel is fixed`, m.navPosition === "fixed", m.navPosition);
  check(`${device}: panel starts at viewport top`, m.navTop <= 1, `navTop=${m.navTop}`);
  check(`${device}: panel covers full viewport height`, m.navBottom >= m.vh - 1, `navBottom=${m.navBottom} vh=${m.vh}`);
  check(`${device}: panel spans full width`, m.navLeft <= 1 && m.navRight >= m.vw - 1, `L=${m.navLeft} R=${m.navRight} vw=${m.vw}`);
  check(`${device}: panel renders under header (header on top)`, Number(m.navZ) < Number(m.topZ), `nav=${m.navZ} header=${m.topZ}`);
  check(`${device}: panel covers the header's area`, m.navCoversHeader, `navTop=${m.navTop} headerTop=${m.headerTop}`);
  check(`${device}: nav groups scroll inside panel`, m.groupsScrollable === "auto", m.groupsScrollable);

  const headerClickable = await page.evaluate(() => {
    const btn = document.querySelector("button");
    const r = btn.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return btn.contains(el) || el === btn;
  });
  check(`${device}: menu toggle is topmost (clickable)`, headerClickable);

  await page.screenshot({ path: `scripts/shot-admin-menu-${device.replace(/\s+/g, "-")}.png` });
  await ctx.close();
}

await b.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  for (const f of failed) console.log(` - ${f.n}: ${f.d}`);
  process.exit(1);
}
