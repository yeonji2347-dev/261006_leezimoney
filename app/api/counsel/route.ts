import { handleCounselRequest } from "@/features/counsel/handler";
import { serverSupabase } from "@/lib/supabase/server";
export const runtime = "nodejs";
export const maxDuration = 40;
export async function POST(request: Request) {
  return handleCounselRequest(request, {
    authorize: async () => {
      const configured = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      );
      if (!configured) return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
      const db = await serverSupabase();
      const {
        data: { user },
        error,
      } = await db.auth.getUser();
      return (
        (!error && Boolean(user)) ||
        process.env.NEXT_PUBLIC_DEMO_MODE === "true"
      );
    },
  });
}
