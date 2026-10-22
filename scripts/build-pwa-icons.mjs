/**
 * Builds the installable-app icons and the launch-splash crest in public/icons/
 * from the club crest.
 *
 * Run after replacing public/shaita-angels-logo.png:
 *   node scripts/build-pwa-icons.mjs
 *
 * - icon-192.png, icon-512.png: the crest on a transparent background, for
 *   launchers that show the icon as drawn ("any"). icon-512.png is also the
 *   crest on the launch splash.
 * - maskable-512.png: the crest at 60% on the club's ink colour. Android crops
 *   maskable icons to a circle or squircle; the safe zone is the centre 80%, and
 *   the shield's corners need margin inside that.
 * - apple-touch-icon.png: 180px on ink. iOS fills transparency with black and
 *   rounds the corners itself, so the crest gets padding rather than bleeding.
 * - badge-96.png: the shield as a white silhouette on transparent, for the small
 *   monochrome icon Android shows in the status bar next to a match alert.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const LOGO = "public/shaita-angels-logo.png";
const OUT = "public/icons";
const INK = { r: 11, g: 11, b: 12, alpha: 1 };

await mkdir(OUT, { recursive: true });

/*
 * The crest's white areas (the SA letters, the angel, the name band) are
 * transparent in the source file, which is fine on the site's light paper but
 * turns them black on a dark launcher or splash screen. This builds a solid
 * version: every transparent pixel that cannot be reached from the image edge
 * without crossing the shield is inside the crest, so it becomes white.
 */
async function solidCrest() {
  const { data, info } = await sharp(LOGO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const outside = new Uint8Array(width * height);
  const stack = [];
  const isOpen = (i) => data[i * 4 + 3] < 128;
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (outside[i] || !isOpen(i)) return;
    outside[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < width; x += 1) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y += 1) { push(0, y); push(width - 1, y); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % width;
    const y = (i - x) / width;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  const base = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    if (outside[i]) continue;
    base[i * 4] = 255; base[i * 4 + 1] = 255; base[i * 4 + 2] = 255; base[i * 4 + 3] = 255;
  }
  return sharp(base, { raw: { width, height, channels: 4 } })
    .composite([{ input: LOGO }])
    .png()
    .toBuffer();
}

const SOURCE = await solidCrest();

async function plain(size) {
  await sharp(SOURCE)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/icon-${size}.png`);
}

async function onInk(size, crestFraction, file) {
  const crest = Math.round(size * crestFraction);
  const art = await sharp(SOURCE)
    .resize(crest, crest, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: INK } })
    .composite([{ input: art, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${file}`);
}

await plain(192);
await plain(512);
await onInk(512, 0.6, "maskable-512.png");
await onInk(180, 0.78, "apple-touch-icon.png");

// Android draws the badge from its alpha channel only, so the shield shape is
// all that survives: white where the crest is, transparent everywhere else.
const BADGE = 96;
const BADGE_ART = 84;
const shape = await sharp(SOURCE)
  .resize(BADGE_ART, BADGE_ART, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extractChannel("alpha")
  .toBuffer();
const silhouette = await sharp({ create: { width: BADGE_ART, height: BADGE_ART, channels: 3, background: "#ffffff" } })
  .joinChannel(shape)
  .png()
  .toBuffer();
await sharp({ create: { width: BADGE, height: BADGE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: silhouette, gravity: "center" }])
  .png({ compressionLevel: 9 })
  .toFile(`${OUT}/badge-96.png`);

console.log("Wrote icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png, badge-96.png to", OUT);
