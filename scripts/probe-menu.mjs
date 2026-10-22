import { chromium } from "playwright-core";

const b = await chromium.launch();
const page = await b.newPage();
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const info = await page.evaluate(async () => {
  // Click toggle
  const toggle = document.querySelector(".MobileNavigation-module__yiuT0G__toggle");
  if (toggle) toggle.click();
  await new Promise((r) => setTimeout(r, 800));

  const panel = document.getElementById("mobile-navigation-panel");
  return {
    panelInDom: !!panel,
    panelDisplay: panel ? getComputedStyle(panel).display : null,
    panelZ: panel ? getComputedStyle(panel).zIndex : null,
    panelP: panel ? getComputedStyle(panel).position : null,
    panelRect: panel ? panel.getBoundingClientRect().toJSON() : null,
    headerZ: getComputedStyle(document.querySelector(".site-header")).zIndex,
    toggleHasClassOpen: toggle ? toggle.className.includes("toggleOpen") : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
