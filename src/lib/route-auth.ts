import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getClientIdentifier } from "@/lib/rate-limit";

export interface RouteAuthResult {
  authorized: boolean;
  rateLimitKey: string;
  isGuest: boolean;
  userId?: string;
}

/**
 * Validates request authorization for AI routes:
 * 1. Authenticated Supabase session (user ID derived from server-verified token)
 * 2. Explicit Guest Sandbox client header ("x-stopbucks-guest: 1")
 * Rejects raw unsolicited external requests without session or guest header.
 */
export async function authorizeAiRoute(
  request: Request,
  routePrefix: string
): Promise<RouteAuthResult> {
  // 1. Check for authenticated Supabase session
  try {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!error && user?.id) {
        return {
          authorized: true,
          rateLimitKey: `${routePrefix}:user:${user.id}`,
          isGuest: false,
          userId: user.id,
        };
      }
    }
  } catch {
    // If Supabase is unconfigured or encounters a network error, fall through to guest check
  }

  // 2. Check for explicit Guest Sandbox header
  const guestHeader = request.headers.get("x-stopbucks-guest");
  if (guestHeader === "1") {
    const ip = getClientIdentifier(request);
    return {
      authorized: true,
      rateLimitKey: `${routePrefix}:guest:${ip}`,
      isGuest: true,
    };
  }

  // 3. Unauthorized
  return {
    authorized: false,
    rateLimitKey: "",
    isGuest: false,
  };
}
