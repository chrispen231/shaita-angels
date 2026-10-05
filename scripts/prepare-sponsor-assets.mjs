// Prepare sponsor and social artwork for the public band.
//
// Logos arrive as whatever the sponsor sent: full-colour, unevenly padded, and
// inconsistent in style. This script normalises them so the band renders as a
// set rather than a collection of unrelated files.
//
//   node scripts/prepare-sponsor-assets.mjs "<source dir>"
//
// What it does, and why:
//   * trims empty margin, so every logo has the same optical size
//   * caps height, matching the band's display height
//   * recolours every opaque pixel to solid ink
//
// The recolour step matters. The band is a single-colour wall, and the supplied
// NEEV logo is pale lavender (RGB 168,166,180) at full opacity, which measures
// 2.5:1 on white and is unreadable at 75px. Rather than relying on CSS filters,
// artwork is thresholded to solid ink here, preserving the alpha channel so
// transparent backgrounds stay transparent. Artwork that is already dark and
// monochrome passes through essentially unchanged, so this is safe to re-run.
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const source = process.argv[2] ?? ".";
const outDir = path.join(process.cwd(), "public", "sponsors");

/** Display height in CSS pixels, before the 2x that gets baked in. */
const PRINCIPAL_HEIGHT = 92;
const PARTNER_HEIGHT = 75;
const SOCIAL_HEIGHT = 28;

/** The ink tone used in the band. */
const INK = { r: 16, g: 16, b: 20 };

const JOBS = [
  // BETTOMAX is a thin wordmark (~3% ink coverage) against solid marks (20-32%),
  // so it reads lighter in the band even after recolouring. That is a property of
  // the supplied artwork, not of the pipeline: the band's CSS caps display
  // height, so a larger source file would not change how it looks. Flagged for
  // the club to request artwork with more weight, in the same way the social
  // icons needed matching variants.
  { src: "BETTOMAX logo.png", out: "bettomax.png", height: PRINCIPAL_HEIGHT },
  { src: "NEEV logo.png", out: "neev.png", height: PRINCIPAL_HEIGHT },
  { src: "Ambivert logo.png", out: "ambivert.png", height: PARTNER_HEIGHT },
  { src: "facebook icon.png", out: "social-facebook.png", height: SOCIAL_HEIGHT },
  { src: "Instagram logo.png", out: "social-instagram.png", height: SOCIAL_HEIGHT },
  { src: "YouTube Logo.png", out: "social-youtube.png", height: SOCIAL_HEIGHT },
];

/**
 * Work out where the artwork sits in the tonal range, so a pale logo and a dark
 * logo both threshold correctly.
 *
 * A fixed cut-off is not enough: the supplied logos range from near-black
 * (BETTOMAX, mean RGB 5) to pale lavender (NEEV, mean RGB 168). A cut-off tuned
 * for one discards the other. Instead the cut is placed midway between the
 * artwork's own extremes, which collapses any monochrome logo to solid ink while
 * leaving genuinely two-tone artwork with its internal contrast intact.
 */
function findToneCut(data, info) {
  const lumas = [];
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] > 250) lumas.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  if (lumas.length === 0) return 128;

  lumas.sort((a, b) => a - b);
  const darkest = lumas[Math.floor(lumas.length * 0.02)];
  const lightest = lumas[Math.floor(lumas.length * 0.98)];

  // A logo with almost no tonal range is a flat plate: keep it as it is.
  if (lightest - darkest < 24) return darkest + 12;

  // Midway between the artwork's extremes.
  return Math.round((darkest + lightest) / 2);
}

async function toInk(input, height) {
  // Trim, then scale on the trimmed image so empty margin does not skew the size.
  const trimmed = await sharp(input)
    .trim({ background: "#ffffff", threshold: 10 })
    .resize({ height, fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = trimmed;
  const cut = findToneCut(data, info);
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = data[i + 3];
    if (alpha === 0) {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = 0;
      continue;
    }

    // Rec. 601 luma is close enough to perceived brightness for artwork.
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const isInk = luma < cut;

    out[i] = isInk ? INK.r : 255;
    out[i + 1] = isInk ? INK.g : 255;
    out[i + 2] = isInk ? INK.b : 255;
    // Partial alpha is preserved so anti-aliased edges stay smooth.
    out[i + 3] = alpha;
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  }).png({ compressionLevel: 9 });
}

await fs.mkdir(outDir, { recursive: true });

const results = [];
for (const job of JOBS) {
  try {
    const target = path.join(outDir, job.out);
    const pipeline = await toInk(path.join(source, job.src), job.height);
    await pipeline.toFile(target);

    const after = await sharp(target).metadata();
    results.push({
      file: job.out,
      size: `${after.width}x${after.height}`,
      aspect: +(after.width / after.height).toFixed(2),
    });
  } catch (error) {
    results.push({ file: job.out, error: String(error.message) });
  }
}

console.log(JSON.stringify(results, null, 2));
