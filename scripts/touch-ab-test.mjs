// A/B experiment: does reverting each touch fix break the tap in real WebKit?
// Loads production, then injects the OLD rules to see which one actually matters.
import { webkit, devices } from "playwright";

const url = process.argv[2] ?? "https://shaita-angels.vercel.app/media";
const device = devices["iPhone 13"];

const variants = [
  { name: "CURRENT (all fixes)", css: null },
  {
    name: "OLD: unguarded :hover on card",
    css: `.media-module__OecZPa__card:hover img, .card:hover img { transform: scale(1.04) !important; }`,
  },
  {
    name: "OLD: img pointer-events auto",
    css: `ul li button img { pointer-events: auto !important; -webkit-user-drag: auto !important; }`,
  },
  {
    name: "OLD: no touch-action",
    css: `ul li button { touch-action: auto !important; }`,
  },
];

for (const v of variants) {
  const browser = await webkit.launch();
  const context = await browser.newContext({ ...device });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  if (v.css) await page.addStyleTag({ content: v.css });
  await page.waitForTimeout(200);

  let opened = false;
  let err = null;
  try {
    await page.locator("ul li button").first().tap({ timeout: 5000 });
    await page.waitForTimeout(600);
    opened = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
  } catch (e) {
    err = String(e.message).split("\n")[0].slice(0, 90);
  }

  console.log(`${opened ? "opens " : "FAILS "} ${v.name}${err ? "  [" + err + "]" : ""}`);
  await browser.close();
}
