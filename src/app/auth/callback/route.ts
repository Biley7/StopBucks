import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/runway";

  // Prevent open redirect vulnerabilities by ensuring next is a relative path
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/runway";

  if (code) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
      }
      console.error("Auth callback code exchange error:", error.message);
    }
  }

  // Return to auth page with error flag if code exchange failed or supabase not configured
  return NextResponse.redirect(new URL("/?authError=callback_failed", requestUrl.origin));
}

