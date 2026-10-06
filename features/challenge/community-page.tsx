"use client";
import { useChallenge } from "./provider";
import { seoulDate, streak, stats } from "@/utils/challenge";
import {
  Check,
  Flame,
  Sprout,
  Users,
  Trophy,
  Target,
  ShieldCheck,
} from "lucide-react";
export function CommunityPage() {
  const s = useChallenge();
  const c = s.challenge!;
  const today = seoulDate();
  const total = s.community.length;
  const done = s.community.filter((p) => p.record_dates.includes(today)).length;
  const m = stats(c, s.records, s.budget!.challenge_budget);
  const anchor = today > c.end_date ? c.end_date : today;
  const milestones = [
    {
      icon: Flame,
      title: "7일 연속 인증",
      description: "매일 나를 위한 작은 약속",
      earned: m.streak >= 7,
    },
    {
      icon: Target,
      title: "10일 인증 완료",
      description: "꾸준히 쌓아온 소비 이야기",
      earned: m.completed >= 10,
    },
    {
      icon: Trophy,
      title: "14일 완주",
      description: "나만의 소비 습관이 생겼어요",
      earned: m.completed >= 14,
    },
  ];
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">BETTER TOGETHER</span>
        <h1>각자의 속도로, 함께 🌱</h1>
        <p>소비 금액보다 소중한 건, 꾸준히 기록하는 마음이에요.</p>
      </div>
      <section className="community-hero">
        <div>
          <span className="badge white">
            <Users size={14} />
            {c.title}
          </span>
          <h2>
            오늘 <em>{done}</em> / {total}명이
            <br />
            작은 약속을 지켰어요.
          </h2>
          <p>아직 기록하지 못했어도 괜찮아요. 함께 한 걸음씩 나아가요.</p>
          <div className="progress-track">
            <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
          <small>
            오늘 인증률 {total ? Math.round((done / total) * 100) : 0}%
          </small>
        </div>
        <div className="community-flower">
          🌱<span>함께 자라는 우리</span>
        </div>
      </section>
      <section className="card members-card">
        <div className="card-heading">
          <h2>함께하는 사람들</h2>
          <span className="badge subtle">{total}명의 작은 도전</span>
        </div>
        <div className="member-grid">
          {s.community.map((p, i) => {
            const verified = p.record_dates.includes(today);
            const n = streak(p.record_dates, anchor);
            return (
              <div className="member" key={p.user_id}>
                <span className={`avatar color-${i % 4}`}>
                  {p.nickname.slice(0, 1)}
                </span>
                <div>
                  <b>
                    {p.nickname}
                    {p.user_id === s.profile?.id && (
                      <span className="me-label">나</span>
                    )}
                  </b>
                  <small>
                    {n ? (
                      <>
                        <Flame size={12} />
                        {n}일 연속 인증
                      </>
                    ) : (
                      "나만의 습관을 만드는 중"
                    )}
                  </small>
                </div>
                <span className={`member-status ${verified ? "verified" : ""}`}>
                  {verified ? (
                    <>
                      <Check size={13} />
                      오늘 완료
                    </>
                  ) : m.before ? (
                    "시작 전"
                  ) : m.ended ? (
                    "챌린지 종료"
                  ) : (
                    "기록 기다리는 중"
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <div className="privacy-note">
          <ShieldCheck size={15} />
          서로의 금액, 예산, 소비 메모와 이미지는 공개되지 않아요.
        </div>
      </section>
      <div className="section-heading">
        <h2>나의 작은 성취</h2>
        <p>경쟁보다 꾸준함에 박수를 보내요.</p>
      </div>
      <div className="milestone-grid">
        {milestones.map((b) => (
          <div
            key={b.title}
            className={`card milestone ${b.earned ? "earned" : ""}`}
          >
            <span className="milestone-icon">
              <b.icon size={26} />
            </span>
            <div>
              <h3>{b.title}</h3>
              <p>{b.description}</p>
              <small>{b.earned ? "달성했어요! 🎉" : "차근차근 도전 중"}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="encouragement">
        <Sprout size={20} />
        완벽하게 쓰는 하루보다, 솔직하게 기록하는 하루.
      </div>
    </>
  );
}
