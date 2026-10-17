// Deep diagnostic: hydration, DOM parsing, image loads, ghost-click close.
import { webkit, devices } from "playwright";

const url = process.argv[2] ?? "https://shaita-angels.vercel.app/media";
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();

const consoleMsgs = [];
const failed = [];
page.on("console", (m) => consoleMsgs.push(`${m.type()}: ${m.text().slice(0, 140)}`));
page.on("pageerror", (e) => consoleMsgs.push(`PAGEERROR: ${String(e.message).slice(0, 200)}`));
page.on("requestfailed", (r) => failed.push(`${r.url().slice(0, 90)} :: ${r.failure()?.errorText}`));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

console.log("=== DOM structure as PARSED by WebKit ===");
console.log(await page.evaluate(() => {
  const btn = document.querySelector("ul li button");
  if (!btn) return { error: "no button" };
  return {
    buttonChildren: [...btn.children].map((c) => c.tagName),
    figcaptionInsideButton: !!btn.querySelector("figcaption"),
    figcaptionParent: btn.querySelector("figcaption")?.parentElement?.tagName ?? null,
    // If React hydrated cleanly the button carries these props
    hasReactProps: Object.keys(btn).some((k) => k.startsWith("__reactProps")),
    // Nested <button>/<figure> would signal parser restructuring
    nestedButtons: btn.querySelectorAll("button").length,
  };
}));

console.log("\n=== hydration: did React attach handlers? ===");
console.log(await page.evaluate(() => {
  const btn = document.querySelector("ul li button");
  const key = Object.keys(btn).find((k) => k.startsWith("__reactProps"));
  const props = key ? btn[key] : null;
  return {
    reactPropsKey: key ?? null,
    hasOnClick: props ? typeof props.onClick === "function" : false,
    fiberKey: Object.keys(btn).find((k) => k.startsWith("__reactFiber")) ?? null,
  };
}));

console.log("\n=== image loading ===");
console.log(await page.evaluate(async () => {
  const imgs = [...document.querySelectorAll("img")];
  await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
  return imgs.slice(0, 4).map((i) => ({
    complete: i.complete,
    natural: `${i.naturalWidth}x${i.naturalHeight}`,
    src: i.currentSrc.slice(-45),
  }));
}));

console.log("\n=== tap, then watch for ghost-click auto-close ===");
await page.locator("ul li button").first().tap();
for (const wait of [100, 300, 600, 1000, 1500]) {
  await page.waitForTimeout(wait === 100 ? 100 : 200);
  const open = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
  console.log(`   t+${wait}ms open=${open}`);
}

console.log("\n=== lightbox render state ===");
console.log(await page.evaluate(() => {
  const lb = document.querySelector('[role="dialog"]');
  if (!lb) return { open: false };
  const cs = getComputedStyle(lb);
  const im = lb.querySelector("img");
  const r = im?.getBoundingClientRect();
  return {
    open: true,
    position: cs.position, display: cs.display, visibility: cs.visibility,
    opacity: cs.opacity, zIndex: cs.zIndex,
    rect: (() => { const b = lb.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; })(),
    imgRect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
    imgComplete: im?.complete, imgNatural: `${im?.naturalWidth}x${im?.naturalHeight}`,
  };
}));

console.log("\n=== console (last 8) ===");
consoleMsgs.slice(-8).forEach((m) => console.log("   " + m));
console.log("=== failed requests ===");
failed.slice(0, 5).forEach((f) => console.log("   " + f));

await browser.close();
