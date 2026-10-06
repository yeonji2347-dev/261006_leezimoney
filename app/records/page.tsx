import { Gate } from "@/components/gate";
import { RecordsPage } from "@/features/records/records-page";
export default function Page() {
  return (
    <Gate>
      <RecordsPage />
    </Gate>
  );
}
