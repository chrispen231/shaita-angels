import { createHash, timingSafeEqual } from "node:crypto";
import { getSiteUrl } from "@/lib/supabase/config";

/** Subscribe and unsubscribe bodies are a few hundred bytes; anything bigger is not ours. */
export const MAX_BODY_BYTES = 4096;

/**
 * Reads a small JSON body. Returns undefined when the body is too large or is not
 * JSON, so the route can answer 400 without parsing anything big.
 */
export async function readSmallJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return undefined;
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Same-origin check for the browser-facing push routes. Browsers send Origin on
 * every POST from fetch, so a missing or foreign Origin means the request did
 * not come from this site's own alerts panel.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([new URL(request.url).origin, new URL(getSiteUrl()).origin]);
  return allowed.has(origin);
}

/** Constant-time check of `Authorization: Bearer <secret>`. False when no secret is configured. */
export function hasDispatchSecret(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Hash both sides so the comparison is always over equal-length buffers.
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(secret).digest();
  return presented.length > 0 && timingSafeEqual(a, b);
}
