import { Gate } from "@/components/gate";
import { CounselPage } from "@/features/counsel/counsel-page";
export default function Page() {
  return (
    <Gate requireBudget={false} requireChallenge={false}>
      <CounselPage />
    </Gate>
  );
}
