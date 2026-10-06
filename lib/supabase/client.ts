import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
export const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
export const demoEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
let client: SupabaseClient | undefined;
export function supabase(): SupabaseClient {
  if (!configured)
    throw Error(
      "Supabase 연결 설정이 필요해요. README의 환경변수를 확인해주세요.",
    );
  return (client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  ));
}
