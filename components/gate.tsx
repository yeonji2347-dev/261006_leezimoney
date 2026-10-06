"use client";
import Link from "next/link";
import { LoaderCircle, Sprout } from "lucide-react";
import { useChallenge } from "@/features/challenge/provider";
import { demoEnabled, configured } from "@/lib/supabase/client";
export function Gate({
  children,
  requireBudget = true,
  requireChallenge = true,
}: {
  children: React.ReactNode;
  requireBudget?: boolean;
  requireChallenge?: boolean;
}) {
  const s = useChallenge();
  if (s.loading)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" />
        <h2>나의 챌린지를 불러오고 있어요</h2>
      </div>
    );
  if (s.error)
    return (
      <div className="empty-state">
        <h2>잠시 연결이 끊겼어요</h2>
        <p role="alert">{s.error}</p>
        <button className="button primary" onClick={() => void s.refresh()}>
          다시 시도
        </button>
      </div>
    );
  if (!s.profile)
    return (
      <div className="welcome-panel">
        <span className="eyebrow">A LITTLE EVERY DAY</span>
        <h1>
          내 돈을 내가 통제하는
          <br />
          작은 습관, 14일.
        </h1>
        <p>
          하루 1분, 오늘의 소비를 돌아보세요.
          <br />
          꾸준한 기록으로 함께 만드는 더 나은 내일.
        </p>
        <div className="welcome-sprout">
          <Sprout size={70} />
        </div>
        <Link href="/login" className="button primary">
          로그인하고 시작하기
        </Link>
        {demoEnabled && (
          <button className="button secondary" onClick={s.startDemo}>
            데모 둘러보기
          </button>
        )}
        {!configured && (
          <small>
            실서비스를 시작하려면 README에 따라 Supabase를 연결해주세요.
          </small>
        )}
      </div>
    );
  if (requireChallenge && !s.challenge)
    return (
      <div className="empty-state">
        <Sprout />
        <h2>새로운 챌린지를 준비 중이에요</h2>
        <p>운영자가 챌린지를 등록하면 이곳에서 참여할 수 있어요.</p>
        <Link className="button secondary" href="/my">
          내 계정
        </Link>
      </div>
    );
  if (requireBudget && (!s.budget || !s.joined))
    return (
      <div className="welcome-panel">
        <span className="eyebrow">LET’S GET STARTED</span>
        <h1>
          나에게 맞는 예산으로
          <br />
          첫걸음을 시작해요 🌱
        </h1>
        <p>
          {s.challenge?.title}에 참여하고
          <br />
          14일 동안 사용할 예산을 설정해주세요.
        </p>
        <Link className="button primary" href="/setup">
          챌린지 참여 · 예산 설정
        </Link>
      </div>
    );
  return <>{children}</>;
}
