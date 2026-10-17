// Does the lightbox actually become VISIBLE, and does tapping work when the
// page is scrolled (the scroll-lock effect runs on open)?
import { webkit, devices } from "playwright";

const device = devices["iPhone 13"];
const url = "https://shaita-angels.vercel.app/media";

async function run(label, prep) {
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  if (prep) await prep(page);

  await page.locator("ul li button").first().tap({ timeout: 6000 });
  await page.waitForTimeout(700);

  const state = await page.evaluate(() => {
    const lb = document.querySelector('[role="dialog"]');
    if (!lb) return { open: false };
    const r = lb.getBoundingClientRect();
    const im = lb.querySelector("img");
    const ir = im?.getBoundingClientRect();
    const cs = getComputedStyle(lb);
    return {
      open: true,
      lbRect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      imgRect: ir ? { x: Math.round(ir.x), y: Math.round(ir.y), w: Math.round(ir.width), h: Math.round(ir.height) } : null,
      zIndex: cs.zIndex,
      // is the lightbox actually the topmost element at its own centre?
      topAtCentre: (() => {
        const el = document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
        return el ? (lb.contains(el) ? "lightbox" : el.tagName + "." + String(el.className).slice(0, 30)) : "none";
      })(),
      bodyOverflow: document.body.style.overflow,
      scrollY: window.scrollY,
    };
  });

  console.log(`\n${label}`);
  console.log("  ", JSON.stringify(state));

  // pixel proof: is the viewport mostly dark (lightbox backdrop) ?
  const shot = await page.screenshot();
  console.log(`   screenshot bytes=${shot.length}`);

  await browser.close();
  return state;
}

await run("1) at top of page, no scroll", null);

await run("2) after scrolling down 600px", async (page) => {
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(600);
});

await run("3) double-tap in quick succession", async (page) => {
  const btn = page.locator("ul li button").first();
  await btn.tap();
  await page.waitForTimeout(120);
  // second tap now lands wherever the first one put things
  await page.touchscreen.tap(195, 400);
});
