import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("tc_session");

  // Allow unauthenticated access to /builder/new (guest mode for lead capture)
  if (!session && (pathname.startsWith("/dashboard") ||
    (pathname.startsWith("/builder") && pathname !== "/builder/new"))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/builder/:path*"],
};
