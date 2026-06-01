import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboard/:path*",
    "/api/newsletters/:path*",
    "/api/subscribers/:path*",
    "/api/business-profile/:path*",
    "/api/individual-profile/:path*",
    "/api/briefings/:path*"
  ]
}
