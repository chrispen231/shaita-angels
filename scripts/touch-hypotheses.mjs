// Two hypotheses:
//   A) Slow mobile network: lightbox opens but shows a BLACK screen while the
//      544KB photo downloads -> looks like "it didn't open".
//   B) /club#media renders the same photos with NO click handler at all.
import { webkit, devices } from "playwright";

const device = devices["iPhone 13"];

// ---- A: throttled network ----
{
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();

  // Delay only the full-size gallery photo, emulating a slow mobile network.
  await page.route("**/storage/v1/object/public/gallery/**", async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });

  await page.goto("https://shaita-angels.vercel.app/media", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  console.log("=== A) SLOW IMAGE LOAD (2.5s delay on the full-size photo) ===");
  await page.locator("ul li button").first().tap({ timeout: 8000 });

  for (const t of [200, 700, 1500, 2500, 3500]) {
    await page.waitForTimeout(t === 200 ? 200 : 500);
    const s = await page.evaluate(() => {
      const lb = document.querySelector('[role="dialog"]');
      const im = lb?.querySelector("img");
      return {
        open: !!lb,
        imgLoaded: im?.complete ?? null,
        natural: im ? `${im.naturalWidth}x${im.naturalHeight}` : null,
      };
    });
    console.log(`   t+${t}ms open=${s.open} imgLoaded=${s.imgLoaded} natural=${s.natural}`);
  }
  await browser.close();
}

// ---- B: the club page gallery ----
{
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  await page.goto("https://shaita-angels.vercel.app/club", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  console.log("\n=== B) /club#media static gallery ===");
  console.log(await page.evaluate(() => {
    const figs = [...document.querySelectorAll(".gallery-item")];
    return {
      count: figs.length,
      anyIsButtonOrLink: figs.some((f) => f.closest("button") || f.closest("a")),
      hasLightbox: !!document.querySelector('[role="dialog"]'),
      figuresHaveHandlers: figs.map((f) => Object.keys(f).filter((k) => k.startsWith("__reactProps")).length),
    };
  }));

  // tap it and see if anything happens
  const fig = page.locator(".gallery-item").first();
  if (await fig.count()) {
    await fig.tap();
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({
      dialog: !!document.querySelector('[role="dialog"]'),
      url: location.href,
    }));
    console.log("   after tapping a /club gallery photo:", after);
  }
  await browser.close();
}
