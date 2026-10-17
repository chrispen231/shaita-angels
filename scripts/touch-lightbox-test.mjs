// Real WebKit (iOS Safari engine) touch test for the media lightbox.
// Usage: node scripts/touch-lightbox-test.mjs [url]
import { webkit, devices } from "playwright";

const url = process.argv[2] ?? "https://shaita-angels.vercel.app/media";

const scenarios = [
  { name: "iPhone 13 (Safari)", device: devices["iPhone 13"] },
  { name: "iPad Mini (Safari)", device: devices["iPad Mini"] },
  { name: "Pixel 5 (Chrome/Android)", device: devices["Pixel 5"] },
];

let failures = 0;

for (const { name, device } of scenarios) {
  const browser = await webkit.launch();
  const context = await browser.newContext({ ...device });
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160));
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const info = await page.evaluate(() => {
    const btn = document.querySelector("ul li a");
    const img = document.querySelector("ul li img");
    return {
      viewport: window.innerWidth,
      touch: navigator.maxTouchPoints,
      hasButton: !!btn,
      hoverHover: matchMedia("(hover: hover)").matches,
      hoverNone: matchMedia("(hover: none)").matches,
      imgPointerEvents: img ? getComputedStyle(img).pointerEvents : null,
      btnTouchAction: btn ? getComputedStyle(btn).touchAction : null,
    };
  });

  // The real thing the user does: tap the thumbnail once.
  const result = { opened: false, imageSize: null, error: null };
  try {
    const btn = page.locator("ul li a").first();
    await btn.tap({ timeout: 5000 });
    await page.waitForTimeout(700);

    const state = await page.evaluate(() => {
      const lb = document.querySelector('[role="dialog"]');
      const im = lb ? lb.querySelector("img") : null;
      const r = im ? im.getBoundingClientRect() : null;
      return {
        opened: !!lb,
        imageSize: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      };
    });
    result.opened = state.opened;
    result.imageSize = state.imageSize;

    // close again so the next scenario starts clean
    if (state.opened) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      const stillOpen = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
      result.closedByEscape = !stillOpen;
    }
  } catch (e) {
    result.error = String(e.message).slice(0, 200);
  }

  const ok = result.opened;
  if (!ok) failures++;

  console.log(`\n${ok ? "PASS" : "FAIL"}  ${name}`);
  console.log(`   viewport=${info.viewport} touchPoints=${info.touch} hover:hover=${info.hoverHover} hover:none=${info.hoverNone}`);
  console.log(`   img pointer-events=${info.imgPointerEvents}  button touch-action=${info.btnTouchAction}`);
  console.log(`   tap -> lightbox opened=${result.opened}` +
    (result.imageSize ? `  image=${result.imageSize.w}x${result.imageSize.h}` : "") +
    (result.closedByEscape !== undefined ? `  escCloses=${result.closedByEscape}` : ""));
  if (result.error) console.log(`   ERROR: ${result.error}`);
  if (errors.length) console.log(`   page errors: ${errors.slice(0, 3).join(" | ")}`);

  await browser.close();
}

console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILED"} (${scenarios.length} devices)`);
process.exit(failures === 0 ? 0 : 1);
