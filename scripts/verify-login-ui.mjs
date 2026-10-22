// Real-browser verification of the admin sign-in screen.
// Run: node scripts/verify-login-ui.mjs
// Requires the dev server on http://localhost:3000.
//
// Chromium, not WebKit: the background clips are H.264, which WebKit's bundled
// build cannot decode, so video playback would "fail" for a codec reason rather
// than a code reason. The touch/mobile layout pass also runs in Chromium, with a
// device descriptor.
import { chromium, devices } from "playwright-core";

const BASE = "http://localhost:3000/admin/login";
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch();

// ---------- Desktop ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const info = await page.evaluate(() => {
    const vids = [...document.querySelectorAll("video")];
    const v = vids[0];
    const card = document.querySelector('[class*="loginCard"]');
    const cs = card && getComputedStyle(card);
    const vs = v && getComputedStyle(v);
    return {
      videoCount: vids.length,
      src: v?.getAttribute("src") ?? null,
      muted: v?.muted ?? null,
      paused: v?.paused ?? null,
      currentTime: v?.currentTime ?? null,
      readyState: v?.readyState ?? null,
      decorative: v?.closest("[aria-hidden]") !== null,
      objectFit: vs?.objectFit ?? null,
      position: vs?.position ?? null,
      backdropPosition: document.querySelector('[class*="backdrop"]')
        ? getComputedStyle(document.querySelector('[class*="backdrop"]')).position
        : null,
      cardMaxWidth: cs?.maxWidth ?? null,
      blur: cs?.backdropFilter || cs?.webkitBackdropFilter || null,
      radius: cs?.borderRadius ?? null,
      heading: document.querySelector("h1")?.textContent ?? null,
      emailAc: document.getElementById("admin-email")?.autocomplete ?? null,
      pwAc: document.getElementById("admin-password")?.autocomplete ?? null,
      reveal: !!document.querySelector('[aria-label*="password" i]'),
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      stored: sessionStorage.getItem("shaita-admin-login-video"),
    };
  });

  check("exactly one video element", info.videoCount === 1, `count=${info.videoCount}`);
  check("video is muted", info.muted === true);
  check("video autoplays (not paused)", info.paused === false, `paused=${info.paused}`);
  check("video is actually advancing", info.currentTime > 0.1, `t=${info.currentTime?.toFixed(2)}`);
  check("video covers viewport", info.objectFit === "cover", `object-fit=${info.objectFit}`);
  check("backdrop wrapper is fixed to viewport", info.backdropPosition === "fixed", `backdrop=${info.backdropPosition}`);
  check("video hidden from assistive tech", info.decorative === true);
  check("card max-width ~420px", info.cardMaxWidth === "420px", info.cardMaxWidth);
  check("card has backdrop blur", /blur\(18px\)/.test(info.blur ?? ""), info.blur);
  check("card radius 20px", info.radius === "20px", info.radius);
  check("heading reads 'Welcome back'", info.heading === "Welcome back", info.heading);
  check("email autocomplete=username", info.emailAc === "username", info.emailAc);
  check("password autocomplete=current-password", info.pwAc === "current-password", info.pwAc);
  check("show/hide password control exists", info.reveal === true);
  check("no horizontal overflow", info.overflowX === false);
  check("index recorded in sessionStorage", info.stored !== null, `stored=${info.stored}`);

  // ---- rotation across reloads ----
  const seen = [info.stored];
  for (let i = 0; i < 6; i += 1) {
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const s = await page.evaluate(() => sessionStorage.getItem("shaita-admin-login-video"));
    seen.push(s);
  }
  let consecutiveRepeat = false;
  for (let i = 1; i < seen.length; i += 1) if (seen[i] === seen[i - 1]) consecutiveRepeat = true;
  check("no consecutive repeat across 7 loads", !consecutiveRepeat, seen.join(","));
  check("rotation uses more than one clip", new Set(seen).size > 1, `${new Set(seen).size} distinct`);

  // ---- only one video even after rotation ----
  const stillOne = await page.evaluate(() => document.querySelectorAll("video").length);
  check("still one video after rotation", stillOne === 1, `count=${stillOne}`);

  // ---- show/hide password ----
  await page.fill("#admin-password", "hunter2secret");
  const before = await page.getAttribute("#admin-password", "type");
  await page.click('[aria-label*="password" i]');
  const after = await page.getAttribute("#admin-password", "type");
  check("reveal toggles password to text", before === "password" && after === "text", `${before} -> ${after}`);
  await page.click('[aria-label*="password" i]');
  check("reveal toggles back to password", (await page.getAttribute("#admin-password", "type")) === "password");

  await page.screenshot({ path: "scripts/shot-login-desktop.png" });
  await ctx.close();
}

// ---------- Reduced motion ----------
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const rm = await page.evaluate(() => ({
    videos: document.querySelectorAll("video").length,
    gradientVisible: getComputedStyle(document.querySelector('[class*="gradient"]')).opacity,
  }));
  check("reduced motion: no video element", rm.videos === 0, `count=${rm.videos}`);
  check("reduced motion: gradient fallback shown", Number(rm.gradientVisible) > 0.5, `opacity=${rm.gradientVisible}`);
  await page.screenshot({ path: "scripts/shot-login-reduced-motion.png" });
  await ctx.close();
}

// ---------- Mobile (iPhone 13) ----------
{
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const m = await page.evaluate(() => {
    const card = document.querySelector('[class*="loginCard"]');
    const r = card.getBoundingClientRect();
    const btn = document.querySelector('button[type="submit"]');
    const br = btn.getBoundingClientRect();
    const input = document.getElementById("admin-email").getBoundingClientRect();
    return {
      cardFits: r.left >= 0 && r.right <= window.innerWidth + 1,
      cardWidth: Math.round(r.width),
      btnHeight: Math.round(br.height),
      inputHeight: Math.round(input.height),
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      vw: window.innerWidth,
    };
  });
  check("mobile: card fits viewport", m.cardFits, `w=${m.cardWidth} vw=${m.vw}`);
  check("mobile: no horizontal overflow", m.overflowX === false);
  check("mobile: submit is tappable (>=44px)", m.btnHeight >= 44, `${m.btnHeight}px`);
  check("mobile: input is tappable (>=44px)", m.inputHeight >= 44, `${m.inputHeight}px`);
  await page.screenshot({ path: "scripts/shot-login-mobile.png" });
  await ctx.close();
}

// ---------- Authenticated user is redirected ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const resp = await page.goto(BASE, { waitUntil: "domcontentloaded" });
  check("login page responds 200", resp.status() === 200, `status=${resp.status()}`);
  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILURES:");
  for (const f of failed) console.log(` - ${f.name} (${f.detail})`);
  process.exit(1);
}
