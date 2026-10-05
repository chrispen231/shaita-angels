// Composite each sponsor logo onto white and report the real contrast, plus a
// white-background preview for visual review.
// Run: node scripts/preview-logos.mjs "<dir>" "<outdir>"
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const dir = process.argv[2] ?? ".";
const out = process.argv[3] ?? ".";
const names = ["Ambivert logo.png", "BETTOMAX logo.png", "NEEV logo.png"];

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function luminance(r, g, b) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function contrast(r1, g1, b1, r2, g2, b2) {
  const a = luminance(r1, g1, b1);
  const b = luminance(r2, g2, b2);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

await fs.mkdir(out, { recursive: true });

for (const name of names) {
  const src = path.join(dir, name);
  const base = path.basename(name, ".png");
  try {
    const image = sharp(src);
    const meta = await image.metadata();

    // Flatten onto white: that is the real public background.
    const flat = await sharp(src).flatten({ background: "#ffffff" }).png().toBuffer();
    const stats = await sharp(flat).stats();
    const mean = [stats.channels[0].mean, stats.channels[1].mean, stats.channels[2].mean].map(Math.round);

    // Contrast of the darkest 10% of pixels (the logo ink) against white.
    const { data, info } = await sharp(flat).raw().toBuffer({ resolveWithObject: true });
    const lums = [];
    for (let i = 0; i < data.length; i += info.channels) {
      lums.push(luminance(data[i], data[i + 1], data[i + 2]));
    }
    lums.sort((a, b) => a - b);
    const darkest = lums[Math.floor(lums.length * 0.02)];
    const inkContrast = +(1.05 / (darkest + 0.05)).toFixed(2);
    const midContrast = +(1.05 / (lums[Math.floor(lums.length * 0.5)] + 0.05)).toFixed(2);

    // Trimmed preview at the height the public band uses.
    const preview = await sharp(src)
      .trim({ background: "#ffffff", threshold: 8 })
      .resize({ height: 220, fit: "inside", background: "#ffffff" })
      .flatten({ background: "#ffffff" })
      .extend({ top: 30, bottom: 30, left: 30, right: 30, background: "#ffffff" })
      .png()
      .toBuffer();
    await fs.writeFile(path.join(out, `${base}-preview.png`), preview);

    console.log(
      JSON.stringify({
        name,
        source: `${meta.width}x${meta.height}`,
        onWhiteMeanRGB: mean,
        inkContrastVsWhite: inkContrast,
        medianContrastVsWhite: midContrast,
        isDarkArtwork: mean[0] < 140,
        note: inkContrast >= 4.5 ? "AA text" : inkContrast >= 3 ? "AA large / graphics" : "TOO LOW",
      }),
    );
  } catch (error) {
    console.log(JSON.stringify({ name, error: String(error.message) }));
  }
}