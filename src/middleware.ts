import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (token?.mustChangePassword && path !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", req.url))
    }
  },
  {
    pages: {
      signIn: "/login",
    },
  }
)

export const config = {
  matcher: ["/admin/:path*", "/faculty/:path*", "/hod/:path*", "/change-password"],
}
