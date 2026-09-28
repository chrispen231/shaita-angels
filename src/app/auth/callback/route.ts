import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next") ?? "/admin";
  const next = requestedNext === "/admin" || requestedNext.startsWith("/admin/") ? requestedNext : "/admin";
  const base = getSiteUrl();
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, base));
  }
  return NextResponse.redirect(new URL("/admin/login?error=callback", base));
}
