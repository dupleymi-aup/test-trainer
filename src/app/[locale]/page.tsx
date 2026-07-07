import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LandingContent } from "./landing-content";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <LandingContent
      isAuthenticated={!!session}
      userRole={session?.user?.role ?? null}
    />
  );
}
