"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  CalendarDays,
  Check,
  Flame,
  Wallet,
  TrendingUp,
  Sprout,
  ChevronRight,
  NotebookPen,
  Target,
  PartyPopper,
} from "lucide-react";
import { useChallenge } from "./provider";
import { stats, won, seoulDate, addDays, daysBetween } from "@/utils/challenge";
import { RecordForm } from "@/features/records/record-form";
import { RecordDetail } from "@/features/records/record-detail";
import { Plant } from "@/components/plant";
import { categories, type DailyRecord } from "@/types";
export function Dashboard() {
  const s = useChallenge();
  const c = s.challenge!;
  const today = seoulDate();
  const m = stats(c, s.records, s.budget!.challenge_budget, today);
  const [form, setForm] = useState<string>();
  const [detail, setDetail] = useState<DailyRecord>();
  const todayRecord = s.records.find((r) => r.record_date === today);
  const recent = [...s.records]
    .sort((a, b) => b.record_date.localeCompare(a.record_date))
    .slice(0, 3);
  const todayPeople = s.community.filter((p) =>
    p.record_dates.includes(today),
  ).length;
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">MY LITTLE MONEY HABIT</div>
          <h1>
            {s.profile?.nickname}님, 오늘도 한 걸음 <span>🌱</span>
          </h1>
          <p>작은 기록이 쌓여, 단단한 소비 습관이 돼요.</p>
        </div>
        <span className="date-pill">
          <CalendarDays size={15} />
          {new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            month: "long",
            day: "numeric",
            weekday: "short",
          }).format(new Date())}
        </span>
      </div>
      <div className="dashboard-columns">
        <div className="main-column">
          <section className="hero-card">
            <div className="hero-copy">
              <span className="badge white">
                <span className="live-dot" />
                {m.before
                  ? "시작을 기다리는 중"
                  : m.ended
                    ? "챌린지 종료"
                    : `함께 도전 중 · DAY ${m.day}`}
              </span>
              <h2>
                14일 가계부
                <br />
                챌린지
              </h2>
              <p>
                내 돈을 내가 통제하는 연습.
                <br />
                오늘의 소비도 나답게 기록해요.
              </p>
              <span className="hero-dates">
                {c.start_date.replaceAll("-", ".")} —{" "}
                {c.end_date.replaceAll("-", ".")}
              </span>
            </div>
            <Plant />
            <div className="hero-bottom">
              <span>
                <Sprout size={16} />
                완벽하지 않아도, 꾸준히.
              </span>
              <Link href="/challenge">
                챌린지 알아보기
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </section>
          <section className="card journey-card">
            <div className="card-heading">
              <h2>차곡차곡, 나의 14일</h2>
              <span className="streak-badge">
                <Flame size={16} />
                {m.streak}일 연속 인증
              </span>
            </div>
            <p className="section-caption">
              오늘의 작은 체크 하나가 내일의 힘이 돼요.
            </p>
            <div className="day-grid">
              {Array.from({ length: 14 }, (_, i) => {
                const date = addDays(c.start_date, i);
                const record = s.records.find((r) => r.record_date === date);
                const current = date === today;
                return (
                  <button
                    key={i}
                    disabled={
                      date > today || (!record && (m.before || m.ended))
                    }
                    className={`day ${record ? "done" : ""} ${current ? "current" : ""} ${date > today ? "future" : ""}`}
                    aria-label={`DAY ${i + 1}, ${record ? "인증 완료" : current ? "오늘" : "미인증"}`}
                    onClick={() => {
                      if (record) setDetail(record);
                      else setForm(date);
                    }}
                  >
                    <span className="day-caption">DAY {i + 1}</span>
                    <span className="day-circle">
                      {record ? (
                        <Check size={18} strokeWidth={2.5} />
                      ) : current ? (
                        <span className="today-dot" />
                      ) : (
                        <span className="day-number">{i + 1}</span>
                      )}
                    </span>
                    <small>
                      {current
                        ? "오늘"
                        : record
                          ? "완료"
                          : date > today
                            ? "·"
                            : "미인증"}
                    </small>
                  </button>
                );
              })}
            </div>
            <div className="journey-progress">
              <div className="progress-track">
                <span style={{ width: `${(m.completed / 14) * 100}%` }} />
              </div>
              <span>
                <b>{m.completed}</b> / 14일 완료
              </span>
            </div>
          </section>
          <section className="card recent-card">
            <div className="card-heading">
              <h2>최근 나의 기록</h2>
              <Link className="text-link" href="/records">
                전체 보기
                <ChevronRight size={15} />
              </Link>
            </div>
            {recent.length ? (
              recent.map((r) => (
                <button
                  className="record-row"
                  key={r.id}
                  onClick={() => setDetail(r)}
                >
                  <span className="record-emoji">
                    {categories.find((cat) => cat.id === r.categories[0])
                      ?.emoji || "📝"}
                  </span>
                  <span className="record-row-main">
                    <b>
                      {r.record_date.slice(5).replace("-", "월 ")}일{" "}
                      <span>
                        DAY {daysBetween(c.start_date, r.record_date) + 1}
                      </span>
                    </b>
                    <small>{r.note}</small>
                  </span>
                  <span className="record-row-amount">
                    <b>{won(r.total_spending)}</b>
                    <small>
                      {r.categories
                        .map(
                          (id) =>
                            categories.find((cat) => cat.id === id)?.label,
                        )
                        .join(" · ")}
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))
            ) : (
              <div className="small-empty">
                아직 기록이 없어요. 첫 번째 인증을 남겨보세요 🌱
              </div>
            )}
          </section>
        </div>
        <div className="side-column">
          <section className="card checkin-card">
            <div className="card-heading">
              <span className="badge subtle">DAILY CHECK-IN</span>
              <NotebookPen size={21} />
            </div>
            <h2>
              {m.todayCompleted
                ? "오늘도 잘 해냈어요!"
                : m.ended
                  ? "나만의 14일, 수고했어요"
                  : m.before
                    ? "곧 새로운 습관이 시작돼요"
                    : "오늘의 소비, 기록했나요?"}
            </h2>
            <p>
              {m.todayCompleted
                ? "오늘 인증을 완료했어요 ✅"
                : m.ended
                  ? "쌓아온 기록을 언제든 돌아보세요."
                  : m.before
                    ? `${c.start_date}에 함께 시작해요.`
                    : "하루 1분이면 충분해요.\n나를 위한 작은 약속을 지켜볼까요?"}
            </p>
            <button
              className="button primary full"
              disabled={m.before || (m.ended && !todayRecord)}
              onClick={() => setForm(today)}
            >
              {m.todayCompleted ? "오늘 기록 수정하기" : "오늘 인증하기"}
              <ArrowRight size={18} />
            </button>
            <small>
              <ShieldLock />
              나의 소비 기록은 나와 운영자만 볼 수 있어요
            </small>
          </section>
          <section className="card budget-card">
            <div className="card-heading">
              <h2>나의 예산 현황</h2>
              <Link
                href="/setup"
                className="icon-button"
                aria-label="예산 수정"
              >
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="budget-grid">
              <div>
                <span>오늘 지출</span>
                <b>{won(m.todaySpent)}</b>
                <small>
                  {m.todayCompleted ? "오늘 기록 기준" : "아직 인증 전이에요"}
                </small>
              </div>
              <div className="green-stat">
                <span>오늘 남은 예산</span>
                <b>{won(m.todayRemaining)}</b>
                <small>하루 예산 {won(m.todayAllowance)}</small>
              </div>
              <div>
                <span>챌린지 누적 지출</span>
                <b>{won(m.spent)}</b>
              </div>
              <div>
                <span>챌린지 남은 예산</span>
                <b>{won(m.remaining)}</b>
              </div>
            </div>
            <div className="budget-track">
              <span
                style={{
                  width: `${Math.min(100, Math.max(0, s.budget!.challenge_budget ? (m.spent / s.budget!.challenge_budget) * 100 : 0))}%`,
                }}
              />
            </div>
            <div className="budget-track-label">
              <span>
                사용한 예산{" "}
                {s.budget!.challenge_budget
                  ? Math.round((m.spent / s.budget!.challenge_budget) * 100)
                  : 0}
                %
              </span>
              <span>총 {won(s.budget!.challenge_budget)}</span>
            </div>
            <div className="allowance">
              <span className="allowance-icon">
                <Wallet size={19} />
              </span>
              <div>
                {m.remainingDays ? (
                  <>
                    앞으로 하루 평균
                    <br />
                    <b>{won(m.dailyAvailable)}</b> 사용할 수 있어요.
                  </>
                ) : (
                  <>
                    14일의 기록이 쌓였어요.
                    <br />
                    <b>나의 챌린지를 돌아보세요.</b>
                  </>
                )}
              </div>
            </div>
          </section>
          <section className="community-card">
            <div className="community-heading">
              <span className="avatar-stack">
                {["🌷", "🌱", "☀️", "🍀"].map((e, i) => (
                  <span key={i}>{e}</span>
                ))}
              </span>
              <span className="badge green">함께라서 꾸준히</span>
            </div>
            <h3>
              오늘 <b>{todayPeople}</b> / {s.community.length}명이 인증했어요
            </h3>
            <p>각자의 속도로, 같은 목표를 향해.</p>
            <Link href="/challenge">
              함께하는 사람들 보기
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      </div>
      <section className="card report-strip">
        <div className="report-intro">
          <span className="report-icon">
            <TrendingUp size={21} />
          </span>
          <div>
            <h2>나의 챌린지 리포트</h2>
            <p>숫자보다 중요한 건 꾸준함이에요.</p>
          </div>
        </div>
        <div className="report-stat">
          <small>인증률</small>
          <b>
            {m.rate}
            <span>%</span>
          </b>
        </div>
        <div className="report-stat">
          <small>하루 평균 지출</small>
          <b>{won(m.average)}</b>
        </div>
        <div className="report-stat">
          <small>다음 작은 목표</small>
          <b>
            {m.completed >= 14 ? (
              <>
                <PartyPopper size={18} />
                14일 완주!
              </>
            ) : m.streak >= 7 ? (
              <>
                <Target size={18} />
                14일 완주
              </>
            ) : (
              <>
                <Flame size={18} />
                7일 연속 인증
              </>
            )}
          </b>
        </div>
      </section>
      {form && (
        <RecordForm
          initialDate={form}
          existing={s.records.find((r) => r.record_date === form)}
          onClose={() => setForm(undefined)}
        />
      )}{" "}
      {detail && (
        <RecordDetail record={detail} onClose={() => setDetail(undefined)} />
      )}
    </>
  );
}
function ShieldLock() {
  return <span aria-hidden="true">🔒</span>;
}
