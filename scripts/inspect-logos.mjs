// Inspect the supplied sponsor logos: dimensions, format, transparency.
// Run: node scripts/inspect-logos.mjs "<dir>"
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const dir = process.argv[2] ?? ".";
const names = ["Ambivert logo.png", "BETTOMAX logo.png", "NEEV logo.png"];

for (const name of names) {
  const full = path.join(dir, name);
  try {
    await fs.access(full);
    const m = await sharp(full).metadata();
    const stats = await sharp(full).stats();
    // Corner alpha tells us whether the logo sits on transparency or a solid plate.
    const { data, info } = await sharp(full)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = (x, y) => {
      const i = (y * info.width + x) * info.channels;
      return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
    };
    const corners = {
      tl: px(0, 0),
      tr: px(info.width - 1, 0),
      bl: px(0, info.height - 1),
      br: px(info.width - 1, info.height - 1),
    };
    const opaqueCorners = Object.values(corners).filter((c) => c.a > 250).length;

    console.log(
      JSON.stringify({
        name,
        width: m.width,
        height: m.height,
        format: m.format,
        hasAlpha: m.hasAlpha,
        aspect: +(m.width / m.height).toFixed(2),
        // Mean channel values: low mean on an opaque logo means dark artwork.
        meanR: Math.round(stats.channels[0].mean),
        meanG: Math.round(stats.channels[1].mean),
        meanB: Math.round(stats.channels[2].mean),
        opaqueCorners,
        corners,
      }),
    );
  } catch (error) {
    console.log(JSON.stringify({ name, error: String(error.message) }));
  }
}