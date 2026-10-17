// Reproduce iOS Safari's FULL tap sequence, which differs from Playwright's tap():
// touchstart -> touchend -> mouseover -> mousemove -> mousedown -> mouseup -> click
// The trailing synthetic click can land on the freshly-opened lightbox backdrop
// and close it instantly -> looks like "nothing happened".
import { webkit, devices } from "playwright";

const device = devices["iPhone 13"];
const url = "https://shaita-angels.vercel.app/media";

const browser = await webkit.launch();
const ctx = await browser.newContext({ ...device });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

console.log("=== full iOS tap sequence ===");
const out = await page.evaluate(() => {
  const btn = document.querySelector("ul li button");
  const r = btn.getBoundingClientRect();
  const x = Math.round(r.x + r.width / 2);
  const y = Math.round(r.y + r.height / 2);
  const target = document.elementFromPoint(x, y);

  const mk = (type, extra = {}) => new MouseEvent(type, {
    bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, ...extra,
  });
  const mkTouch = (type) => new TouchEvent(type, { bubbles: true, cancelable: true });

  const log = [];
  const note = (s) => log.push(s);

  // 1. touch phase (what iOS sends first)
  target.dispatchEvent(mkTouch("touchstart"));
  target.dispatchEvent(mkTouch("touchend"));
  note(`after touch: open=${!!document.querySelector('[role="dialog"]')}`);

  // 2. iOS then sends the compatibility mouse events
  target.dispatchEvent(mk("mouseover"));
  target.dispatchEvent(mk("mousemove"));
  target.dispatchEvent(mk("mousedown"));
  target.dispatchEvent(mk("mouseup"));
  note(`after mouse seq: open=${!!document.querySelector('[role="dialog"]')}`);

  // 3. and finally a click -- but it targets whatever is at (x,y) NOW
  const nowTarget = document.elementFromPoint(x, y);
  note(`click target now = ${nowTarget ? nowTarget.tagName + "." + String(nowTarget.className).slice(0, 35) : "null"}`);
  nowTarget.dispatchEvent(mk("click"));
  note(`after trailing click: open=${!!document.querySelector('[role="dialog"]')}`);

  return { x, y, log, finalOpen: !!document.querySelector('[role="dialog"]') };
});

console.log(JSON.stringify(out, null, 2));

// Also: does a real Playwright tap stay open over a longer window with a
// second synthetic tap at the same spot (worst case ghost click)?
await browser.close();
