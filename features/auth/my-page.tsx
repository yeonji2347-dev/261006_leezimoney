"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useChallenge } from "@/features/challenge/provider";
import { stats, won } from "@/utils/challenge";
import {
  Wallet,
  ShieldCheck,
  LogOut,
  ArrowUpRight,
  Flame,
  Check,
  TrendingUp,
  NotebookPen,
  UserRound,
  MessageCircle,
} from "lucide-react";
export function MyPage() {
  const s = useChallenge();
  const m =
    s.challenge && s.budget
      ? stats(s.challenge, s.records, s.budget.challenge_budget)
      : null;
  const [name, setName] = useState(s.profile?.nickname || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await s.updateNickname(name);
      setMessage("닉네임을 저장했어요.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="my-page">
      <div className="page-heading">
        <span className="eyebrow">MY SPACE</span>
        <h1>나의 작은 변화</h1>
        <p>나에게 맞는 속도와 예산으로, 꾸준히.</p>
      </div>
      <div className="my-grid">
        <section className="card profile-card">
          <div className="profile-intro">
            <span className="avatar large">
              {s.profile?.nickname.slice(0, 1)}
            </span>
            <div>
              <h2>{s.profile?.nickname}님</h2>
              <p>{s.profile?.email}</p>
              <span className="badge green">
                {s.demo ? "데모 체험" : "나만의 소비 습관 만들기"}
              </span>
            </div>
          </div>
          <form onSubmit={submit}>
            <label>
              닉네임
              <input
                value={name}
                maxLength={30}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="button secondary" disabled={busy}>
              {busy ? "저장 중…" : "닉네임 저장"}
            </button>
            {message && (
              <p role="status" className="success-text">
                {message}
              </p>
            )}
          </form>
          {s.challenges.length > 1 && (
            <label>
              챌린지 선택
              <select
                value={s.challenge?.id || ""}
                onChange={(e) => s.selectChallenge(e.target.value)}
              >
                {s.challenges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} · {c.start_date}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Link href="/setup" className="settings-link">
            <Wallet size={18} />
            나의 예산 설정
            <ArrowUpRight size={18} />
          </Link>
          <Link href="/counsel" className="settings-link">
            <MessageCircle size={18} />
            AI 소비 상담 · 내 Gemini 키로 시작하기
            <ArrowUpRight size={18} />
          </Link>
          <div className="privacy-note">
            <ShieldCheck size={16} />
            재무 정보는 나와 운영자만 확인해요.
          </div>
          <button
            className="logout-button"
            onClick={async () => {
              try {
                await s.logout();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "로그아웃에 실패했어요.",
                );
              }
            }}
          >
            <LogOut size={17} />
            로그아웃
          </button>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
        </section>
        <section className="card personal-report">
          <div className="card-heading">
            <h2>나의 14일 챌린지</h2>
            <TrendingUp size={21} />
          </div>
          {m ? (
            <>
              <div className="report-big">
                <span>{m.completed}</span>
                <b> / 14일</b>
                <p>하루의 기록이 내일의 습관으로</p>
              </div>
              <div className="progress-track">
                <span style={{ width: `${(m.completed / 14) * 100}%` }} />
              </div>
              <div className="report-details">
                {[
                  [<NotebookPen key="d" size={17} />, "현재 DAY", `${m.day}일`],
                  [<Check key="c" size={17} />, "인증률", `${m.rate}%`],
                  [<Flame key="s" size={17} />, "연속 인증", `${m.streak}일`],
                  [<Wallet key="w" size={17} />, "누적 지출", won(m.spent)],
                  [<Wallet key="r" size={17} />, "남은 예산", won(m.remaining)],
                  [
                    <TrendingUp key="a" size={17} />,
                    "하루 평균 지출",
                    won(m.average),
                  ],
                ].map(([icon, label, value], i) => (
                  <div key={i}>
                    <span>
                      {icon}
                      {label}
                    </span>
                    <b>{value}</b>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <UserRound size={30} />
              <p>예산을 설정하고 챌린지에 참여해보세요.</p>
              <Link href="/setup" className="button primary">
                시작하기
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
