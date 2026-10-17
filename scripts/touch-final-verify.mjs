// Verify the rebuilt gallery: normal tap, no-JS fallback, and markup validity.
import { webkit, devices } from "playwright";

const device = devices["iPhone 13"];
const url = process.argv[2] ?? "https://shaita-angels.vercel.app/media";
let fail = 0;

// ---- 1. normal tap on real WebKit touch ----
{
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  console.log("=== markup validity ===");
  console.log(await page.evaluate(() => {
    const a = document.querySelector("ul li a");
    return {
      isAnchor: a?.tagName,
      href: a?.getAttribute("href")?.slice(-40),
      childTags: a ? [...a.children].map((c) => c.tagName) : null,
      // invalid nesting would show a DIV inside the anchor
      hasDivInsideAnchor: a ? !!a.querySelector("div") : null,
    };
  }));

  console.log("\n=== tap -> lightbox ===");
  await page.locator("ul li a").first().tap();
  await page.waitForTimeout(800);
  const open = await page.evaluate(() => {
    const lb = document.querySelector('[role="dialog"]');
    const im = lb?.querySelector("img");
    const r = im?.getBoundingClientRect();
    return {
      open: !!lb,
      img: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : null,
      spinner: !!document.querySelector('[class*="lightboxSpinner"]'),
      focused: document.activeElement?.getAttribute("aria-label"),
    };
  });
  console.log("  ", JSON.stringify(open));
  if (!open.open) fail++;

  await browser.close();
}

// ---- 2. JavaScript disabled -> anchor must still open the photo ----
{
  const browser = await webkit.launch();
  const ctx = await browser.newContext({ ...device, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const res = await page.evaluate(() => null).catch(() => null);
  const href = await page.locator("ul li a").first().getAttribute("href");
  console.log("\n=== no-JS fallback ===");
  console.log("   anchor href present:", !!href, href ? href.slice(-45) : "");

  // With JS off, clicking navigates to the image itself
  const [nav] = await Promise.all([
    page.waitForNavigation({ timeout: 8000 }).catch(() => null),
    page.locator("ul li a").first().click().catch((e) => e),
  ]);
  const finalUrl = page.url();
  console.log("   navigated to:", finalUrl.slice(-50));
  const ok = /storage\/v1\/object\/public\/gallery/.test(finalUrl);
  console.log(`   ${ok ? "PASS" : "FAIL"} no-JS opens the photo`);
  if (!ok) fail++;

  await browser.close();
}

console.log(`\n${fail === 0 ? "ALL PASSED" : fail + " FAILED"}`);
process.exit(fail ? 1 : 0);
