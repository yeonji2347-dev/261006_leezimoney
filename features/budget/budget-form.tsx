"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useChallenge } from "@/features/challenge/provider";
import { won } from "@/utils/challenge";
import type { Budget } from "@/types";
import { ArrowRight, ShieldCheck } from "lucide-react";
const fields: [keyof Budget, string, string][] = [
  ["monthly_income", "월 평균 수입", "매달 들어오는 금액"],
  ["fixed_expenses", "월 고정비", "월세, 통신비 등 고정 지출"],
  ["savings_investment", "월 저축 / 투자 금액", "미래의 나를 위한 돈"],
  ["monthly_living_budget", "이번 달 생활비 예산", "한 달 동안 자유롭게 쓸 돈"],
  ["challenge_budget", "14일 챌린지 예산", "이번 챌린지 동안 사용할 돈"],
];
export function BudgetForm() {
  const s = useChallenge();
  const router = useRouter();
  const [values, setValues] = useState<Budget>(
    s.budget || {
      monthly_income: 0,
      fixed_expenses: 0,
      savings_investment: 0,
      monthly_living_budget: 0,
      challenge_budget: 0,
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await s.saveBudget(values);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="narrow">
      <div className="page-heading">
        <span className="eyebrow">MY BUDGET</span>
        <h1>나에게 맞는 예산을 정해요.</h1>
        <p>완벽한 숫자보다, 내가 지킬 수 있는 예산이면 충분해요.</p>
      </div>
      <form className="card budget-form" onSubmit={submit}>
        {fields.map(([key, label, hint]) => (
          <label key={key}>
            {label}
            <small>{hint}</small>
            <div className="money-input">
              <input
                inputMode="numeric"
                type="number"
                name={key}
                min={0}
                max={1e12}
                step={1}
                required
                value={values[key]}
                placeholder="0"
                onChange={(e) =>
                  setValues({ ...values, [key]: Number(e.target.value) })
                }
              />
              <span>원</span>
            </div>
          </label>
        ))}
        <div className="budget-suggestion">
          <p>
            수입에서 고정비와 저축을 뺀 금액{" "}
            <b>
              {won(
                values.monthly_income -
                  values.fixed_expenses -
                  values.savings_investment,
              )}
            </b>
          </p>
          <button
            type="button"
            onClick={() =>
              setValues({
                ...values,
                challenge_budget: Math.round(
                  (values.monthly_living_budget / 30) * 14,
                ),
              })
            }
          >
            생활비 기준 14일 예산 계산하기 →
          </button>
          <small>30일 기준 제안 금액이에요. 직접 조정할 수 있어요.</small>
        </div>
        <div className="privacy-note">
          <ShieldCheck size={17} />
          예산과 수입은 다른 참가자에게 공개되지 않아요.
        </div>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <button disabled={busy} className="button primary full">
          {busy ? "저장 중…" : s.budget ? "예산 저장하기" : "참여하고 시작하기"}
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}
