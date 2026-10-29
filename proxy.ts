/**
 * Next.js Edge Proxy — Authentication & Route Protection
 *
 * Runs on every request matching the configured matcher.
 * Refreshes the Supabase session and enforces route protection by role.
 *
 * Security Boundaries:
 * - /dashboard/*, /exam/*, /materials/*, /analytics/*, /settings/*, /profile/* require authenticated session.
 * - /admin/* requires authenticated session with role = 'admin'.
 * - Unauthenticated requests are redirected to /login with redirectTo and error context.
 * - Authenticated users visiting auth routes (/login, /register, etc.) are redirected to /dashboard.
 *
 * @module proxy
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/** Routes that require an authenticated candidate session */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/exam",
  "/materials",
  "/exams",
  "/analytics",
  "/settings",
  "/profile",
  "/subjects",
];

/** Routes that require administrative staff privileges */
const ADMIN_ROUTES = ["/admin"];

/** Public authentication routes (redirect authenticated users to dashboard) */
const AUTH_ROUTES = ["/login", "/register", "/sign-in", "/sign-up", "/forgot-password"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: CookieOptions;
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh and verify user session via secure JWT verification
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Check if route requires admin role
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  if (isAdminRoute) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      loginUrl.searchParams.set("error", "admin_required");
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      // Non-admin student attempted to access admin portal
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("error", "admin_forbidden");
      return NextResponse.redirect(dashboardUrl);
    }

    return supabaseResponse;
  }

  // Check if route requires student authentication
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    loginUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and accessing login/register, redirect to dashboard
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static assets)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public files (images, icons, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
