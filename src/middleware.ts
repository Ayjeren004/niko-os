import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/",
    "/api/chat(.*)",
    "/api/conversations(.*)",
    "/api/documents(.*)",
    "/api/upload(.*)",
    "/api/briefing(.*)",
    "/api/transcribe(.*)"
  ],
};
