// One-off: normalise the club crest for the social preview card.
// Run with: node scripts/build-og-crest.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = path.join(root, "public", "shaita-angels-logo.png");
const output = path.join(root, "src", "app", "og-crest.png");

const info = await sharp(input)
  .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(`wrote ${path.relative(root, output)} ${info.width}x${info.height} ${info.size}B`);