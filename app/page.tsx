import { Gate } from "@/components/gate";
import { Dashboard } from "@/features/challenge/dashboard";
export default function Page() {
  return (
    <Gate>
      <Dashboard />
    </Gate>
  );
}
