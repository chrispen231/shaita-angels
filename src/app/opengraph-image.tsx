import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import path from "node:path";

export const alt = "Shaita Angels FC — women's football from Careysburg, Liberia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Inlined at build time so the card renders identically on localhost, on preview
// deployments, and in production, without depending on a reachable absolute URL.
const crest = readFileSync(path.join(process.cwd(), "src", "app", "og-crest.png")).toString("base64");

/**
 * Social preview card. Built from the club crest and brand type rather than a
 * match photo, so the artwork and the words always agree. Photographs of the
 * squad are supplied separately and their dates/captions are still unconfirmed.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0b0b0b",
        padding: "70px 80px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${crest}`} alt="" width={92} height={92} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#ffffff", fontSize: 40, fontWeight: 800, letterSpacing: -0.5 }}>
            SHAITA ANGELS FC
          </span>
          <span style={{ color: "#8f8f8f", fontSize: 23, letterSpacing: 5 }}>PRIDE OF CAREYSBURG</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ color: "#ffffff", fontSize: 78, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }}>
          Women&apos;s football
        </span>
        <span style={{ color: "#ffffff", fontSize: 78, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }}>
          from Careysburg.
        </span>
        <span style={{ color: "#c9c9c9", fontSize: 31, marginTop: 22 }}>
          2026 Women&apos;s Orange Cup champions
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#8f8f8f", fontSize: 25 }}>Founded 2019 · Liberia</span>
        <span style={{ color: "#ffffff", fontSize: 25, fontWeight: 700 }}>shaita-angels.vercel.app</span>
      </div>
    </div>,
    size,
  );
}