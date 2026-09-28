import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // Some Supabase recovery email templates or existing links can return to the
  // configured Site URL (/) instead of the requested callback. Route that PKCE
  // code through the same exchange handler without logging or consuming it here.
  const code = request.nextUrl.searchParams.get("code");
  if (request.nextUrl.pathname === "/" && code) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    callbackUrl.searchParams.set("next", "/admin/password");
    return NextResponse.redirect(callbackUrl);
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/", "/admin/:path*", "/auth/callback"],
};
