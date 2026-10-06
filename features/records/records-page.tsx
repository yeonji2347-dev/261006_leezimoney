"use client";
import { useState } from "react";
import { useChallenge } from "@/features/challenge/provider";
import { stats, won, daysBetween, addDays, seoulDate } from "@/utils/challenge";
import { categories, type DailyRecord } from "@/types";
import { RecordDetail } from "./record-detail";
import { RecordForm } from "./record-form";
import {
  NotebookPen,
  Plus,
  ChevronRight,
  Check,
  CalendarDays,
} from "lucide-react";
export function RecordsPage() {
  const s = useChallenge();
  const c = s.challenge!;
  const m = stats(c, s.records, s.budget!.challenge_budget);
  const [detail, setDetail] = useState<DailyRecord>();
  const [form, setForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const ordered = [...s.records].sort((a, b) =>
    b.record_date.localeCompare(a.record_date),
  );
  const filtered = ordered.filter(
    (r) => filter === "all" || r.categories.includes(filter),
  );
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">MY MONEY DIARY</span>
          <h1>나의 기록</h1>
          <p>매일의 소비에, 나만의 이야기를 담았어요.</p>
        </div>
        <button
          className="button primary"
          disabled={m.before || m.ended}
          onClick={() => setForm(true)}
        >
          <Plus size={18} />
          오늘 기록하기
        </button>
      </div>
      <div className="metric-grid">
        <div className="card metric">
          <small>차곡차곡 쌓인 기록</small>
          <b>
            {m.completed}
            <span> / 14일</span>
          </b>
        </div>
        <div className="card metric">
          <small>누적 지출</small>
          <b>{won(m.spent)}</b>
        </div>
        <div className="card metric">
          <small>하루 평균 지출</small>
          <b>{won(m.average)}</b>
        </div>
      </div>
      <div className="records-layout">
        <section className="card records-list">
          <div className="card-heading">
            <h2>14일의 소비 이야기</h2>
            <span className="badge subtle">{filtered.length}개의 기록</span>
          </div>
          <div className="filter-row">
            <button
              onClick={() => setFilter("all")}
              className={filter === "all" ? "selected" : ""}
            >
              전체
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={filter === cat.id ? "selected" : ""}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {filtered.map((r) => (
            <button
              className="record-row expanded"
              key={r.id}
              onClick={() => setDetail(r)}
            >
              <span className="record-emoji">
                {categories.find((cat) => cat.id === r.categories[0])?.emoji ||
                  "📝"}
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
                    .map((id) => categories.find((cat) => cat.id === id)?.label)
                    .join(" · ")}
                </small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
          {!filtered.length && (
            <div className="empty-state">
              <NotebookPen size={35} />
              <h3>아직 이곳에 기록이 없어요</h3>
              <p>오늘의 작은 소비부터 시작해보세요.</p>
            </div>
          )}
        </section>
        <aside className="card diary-calendar">
          <div className="card-heading">
            <h2>
              <CalendarDays size={19} /> 나의 14일
            </h2>
          </div>
          <div className="calendar-grid">
            {Array.from({ length: 14 }, (_, i) => {
              const d = addDays(c.start_date, i);
              const r = s.records.find((r) => r.record_date === d);
              return (
                <button
                  key={d}
                  className={`${r ? "done" : ""} ${d === seoulDate() ? "current" : ""}`}
                  disabled={!r}
                  onClick={() => setDetail(r)}
                >
                  <small>DAY {i + 1}</small>
                  <span>{r ? <Check size={20} /> : d.slice(8)}</span>
                </button>
              );
            })}
          </div>
          <p>
            체크한 날을 눌러
            <br />
            그날의 소비를 돌아보세요.
          </p>
          <div className="diary-note">
            “기록하는 것만으로도
            <br />
            좋은 변화는 시작돼요.”
          </div>
        </aside>
      </div>
      {detail && (
        <RecordDetail record={detail} onClose={() => setDetail(undefined)} />
      )}{" "}
      {form && (
        <RecordForm
          existing={s.records.find((r) => r.record_date === seoulDate())}
          onClose={() => setForm(false)}
        />
      )}
    </>
  );
}
