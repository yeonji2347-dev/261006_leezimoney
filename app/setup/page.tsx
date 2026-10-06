"use client";
import { Gate } from "@/components/gate";
import { BudgetForm } from "@/features/budget/budget-form";
export default function Page() {
  return (
    <Gate requireBudget={false}>
      <BudgetForm />
    </Gate>
  );
}
