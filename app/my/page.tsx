import { Gate } from "@/components/gate";
import { MyPage } from "@/features/auth/my-page";
export default function Page() {
  return (
    <Gate requireBudget={false} requireChallenge={false}>
      <MyPage />
    </Gate>
  );
}
