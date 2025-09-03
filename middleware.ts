import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// List of allowed IPs
const ALLOWED_IPS = ["123.123.123.123", "188.245.77.11"]; // Replace with your IPs

export function middleware(req: NextRequest) {
  const ip =
    req.ip || req.headers.get("x-forwarded-for")?.split(",")[0] || req.ip;

  if (!ip || !ALLOWED_IPS.includes(ip)) {
    // Deny access
    return new NextResponse("Access Denied", { status: 403 });
  }

  // Allow access
  return NextResponse.next();
}

// Apply to all routes, or customize
export const config = {
  matcher: ["/:path*"], // Only protect /protected/* routes
};
