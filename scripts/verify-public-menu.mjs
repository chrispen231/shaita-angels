import { chromium, devices } from "playwright-core";

const b = await chromium.launch();
const results = [];
const check = (n, pass, d = "") => {
  results.push({ n, pass, d });
  console.log(`${pass ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

const ctx = await b.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const info = await page.evaluate(async () => {
  const els = {
    toggle: document.querySelector(".MobileNavigation-module__yiuT0G__toggle"),
    panel: document.getElementById("mobile-navigation-panel"),
    header: document.querySelector(".site-header"),
    hero: document.querySelector(".hero"),
    body: document.body,
    main: document.querySelector("main"),
  };
  if (els.toggle) els.toggle.click();
  await new Promise((r) => setTimeout(r, 600));
  const out = {};
  for (const [k, el] of Object.entries(els)) {
    if (el) {
      out[k + "Z"] = getComputedStyle(el).zIndex;
      out[k + "P"] = getComputedStyle(el).position;
      out[k + "R"] = el.getBoundingClientRect().toJSON();
    }
  }
  return out;
});

check("panel z-index > header z-index", Number(info.panelZ) > Number(info.headerZ), `${info.panelZ} > ${info.headerZ}`);
check("panel is fixed", info.panelP === "fixed", info.panelP);
if (info.panelR) {
  const pr = info.panelR;
  check("panel top edge at/below header bottom (not under it)", pr.top >= info.headerR.bottom - 2, `panel.top=${pr.top} header.bottom=${info.headerR.bottom}`);
  check("panel bottom stays on screen", pr.bottom <= window.innerHeight + 2, `panel.bottom=${pr.bottom} vh=${window.innerHeight}`);
}

await b.close();
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed > 0 ? 1 : 0);
