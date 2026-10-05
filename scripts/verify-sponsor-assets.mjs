// Composite the prepared sponsor/social artwork onto white and report real
// contrast, so band legibility is measured rather than assumed.
//   node scripts/verify-sponsor-assets.mjs
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const dir = path.join(process.cwd(), "public", "sponsors");

function lin(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function lum(r, g, b) {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".png")).sort();

const rows = [];
for (const file of files) {
  const full = path.join(dir, file);
  const meta = await sharp(full).metadata();

  const { data, info } = await sharp(full).flatten({ background: "#ffffff" }).raw().toBuffer({ resolveWithObject: true });

  const lums = [];
  for (let i = 0; i < data.length; i += info.channels) lums.push(lum(data[i], data[i + 1], data[i + 2]));
  lums.sort((a, b) => a - b);

  const darkest = lums[Math.floor(lums.length * 0.02)];
  const median = lums[Math.floor(lums.length * 0.5)];
  const ink = +(1.05 / (darkest + 0.05)).toFixed(2);

  // How much of the trimmed box is inked. A filled plate sits high here, an
  // outline low. Used to detect icons that will not read as a set.
  let inked = 0;
  for (let i = 0; i < data.length; i += info.channels) if (data[i] < 200) inked++;
  const coverage = Math.round((inked / (info.width * info.height)) * 100);

  rows.push({
    file,
    size: `${info.width}x${info.height}`,
    inkContrast: ink,
    medianContrast: +(1.05 / (median + 0.05)).toFixed(2),
    coverage: `${coverage}%`,
    verdict: ink >= 4.5 ? "AA text" : ink >= 3 ? "graphics only" : "TOO LOW",
  });
}

console.table(rows);

// Flag a mixed set: social icons must all be the same variant.
const social = rows.filter((r) => r.file.startsWith("social-"));
if (social.length > 1) {
  const coverageValues = social.map((r) => parseInt(r.coverage, 10));
  const spread = Math.max(...coverageValues) - Math.min(...coverageValues);
  console.log(
    spread > 25
      ? `\nWARNING: social icon styles differ by ${spread} percentage points of ink coverage - they will not read as a set.`
      : `\nSocial icon coverage spread: ${spread} points - consistent.`,
  );
}