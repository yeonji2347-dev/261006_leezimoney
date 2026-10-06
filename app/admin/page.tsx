import { redirect } from "next/navigation";
import { serverSupabase } from "@/lib/supabase/server";
import { configured } from "@/lib/supabase/client";
import { AdminDashboard } from "@/features/admin/admin-dashboard";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!configured)
    return (
      <div className="empty-state">
        <h1>운영자 전용 페이지</h1>
        <p>
          Supabase를 연결하고 관리자 계정을 설정해주세요. 데모에서는 접근할 수
          없어요.
        </p>
      </div>
    );
  const db = await serverSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (p?.role !== "admin")
    return (
      <div className="empty-state">
        <h1>운영자만 접근할 수 있어요.</h1>
        <p>참가자는 자신의 기록과 공개 인증 현황을 확인할 수 있어요.</p>
      </div>
    );
  return <AdminDashboard />;
}
