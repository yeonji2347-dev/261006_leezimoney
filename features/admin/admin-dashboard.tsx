"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  seoulDate,
  addDays,
  streak,
  daysBetween,
  won,
} from "@/utils/challenge";
import type { CommunityMember, Challenge, DailyRecord } from "@/types";
import {
  Search,
  Users,
  Check,
  Flame,
  Trophy,
  ArrowRight,
  X,
  Plus,
} from "lucide-react";
import { RecordDetail } from "@/features/records/record-detail";
import { Dialog } from "@/components/dialog";
export function AdminDashboard() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selected, setSelected] = useState("");
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [inspecting, setInspecting] = useState<CommunityMember>();
  const [privateRecords, setPrivateRecords] = useState<DailyRecord[]>([]);
  const [budget, setBudget] = useState(0);
  const [detail, setDetail] = useState<DailyRecord>();
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const db = supabase();
      const { data: cs, error: ce } = await db
        .from("challenges")
        .select("*")
        .order("start_date", { ascending: false });
      if (ce) throw ce;
      setChallenges(cs || []);
      const id = selected || cs?.[0]?.id;
      if (id) {
        const { data, error } = await db.rpc("community_progress", {
          p_challenge: id,
        });
        if (error) throw error;
        setMembers(data || []);
        if (!selected) setSelected(id);
      }
    } catch {
      setError("운영 데이터를 불러오지 못했어요. 연결을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }, [selected]);
  useEffect(() => {
    void load();
  }, [load]);
  const c = challenges.find((c) => c.id === selected);
  const today = seoulDate();
  const elapsed = c
    ? Math.max(0, Math.min(14, daysBetween(c.start_date, today) + 1))
    : 0;
  const done = members.filter((p) => p.record_dates.includes(today)).length;
  const complete = members.filter((p) => p.record_dates.length === 14).length;
  const average =
    members.length && elapsed
      ? Math.round(
          (members.reduce((sum, p) => sum + p.record_dates.length, 0) /
            members.length /
            elapsed) *
            100,
        )
      : 0;
  const visible = members.filter(
    (p) =>
      p.nickname.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "done"
          ? p.record_dates.includes(today)
          : !p.record_dates.includes(today))),
  );
  async function inspect(p: CommunityMember) {
    setInspecting(p);
    setPrivateRecords([]);
    setDetailLoading(true);
    setError("");
    try {
      const db = supabase();
      const [{ data: rs, error: re }, { data: b, error: be }] =
        await Promise.all([
          db
            .from("daily_records")
            .select("*,record_categories(category_id)")
            .eq("challenge_id", selected)
            .eq("user_id", p.user_id)
            .order("record_date", { ascending: false }),
          db
            .from("budgets")
            .select("challenge_budget")
            .eq("challenge_id", selected)
            .eq("user_id", p.user_id)
            .maybeSingle(),
        ]);
      if (re || be) throw re || be;
      setBudget(b?.challenge_budget || 0);
      setPrivateRecords(
        (rs || []).map(
          (
            r: DailyRecord & { record_categories: { category_id: string }[] },
          ) => ({
            ...r,
            categories: r.record_categories.map(
              (x: { category_id: string }) => x.category_id,
            ),
          }),
        ),
      );
    } catch {
      setError("참가자의 기록을 불러오지 못했어요.");
    } finally {
      setDetailLoading(false);
    }
  }
  async function createChallenge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const start = String(f.get("start"));
    const { error } = await supabase()
      .from("challenges")
      .insert({
        title: String(f.get("title")),
        description: String(f.get("description")),
        start_date: start,
        end_date: addDays(start, 13),
        duration_days: 14,
        status: String(f.get("status")),
      });
    setBusy(false);
    if (error) {
      setError("챌린지를 생성하지 못했어요. 날짜와 권한을 확인해주세요.");
      return;
    }
    setCreate(false);
    await load();
  }
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">CHALLENGE OPERATIONS</span>
          <h1>운영자 대시보드</h1>
          <p>참가자들이 끝까지 함께할 수 있도록 살펴봐요.</p>
        </div>
        <button className="button primary" onClick={() => setCreate(true)}>
          <Plus size={18} />새 챌린지
        </button>
      </div>
      <div className="admin-toolbar">
        <label>
          운영 챌린지
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setInspecting(undefined);
            }}
          >
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} · {c.start_date}
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary" onClick={() => void load()}>
          새로고침
        </button>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">인증 현황을 불러오는 중…</p>}
      <div className="metric-grid four">
        {[
          [Users, "전체 참가자", `${members.length}명`],
          [Check, "오늘 인증", `${done}명`],
          [
            Flame,
            "오늘 인증률",
            `${members.length ? Math.round((done / members.length) * 100) : 0}%`,
          ],
          [Trophy, "14일 완주", `${complete}명`],
        ].map(([Icon, label, value], i) => {
          const I = Icon as typeof Users;
          return (
            <div className="card metric" key={i}>
              <small>
                <I size={17} />
                {label as string}
              </small>
              <b>{value as string}</b>
            </div>
          );
        })}
      </div>
      <section className="card">
        <div className="card-heading">
          <h2>참가자 인증 현황</h2>
          <span className="badge green">평균 인증률 {average}%</span>
        </div>
        <div className="admin-search">
          <div className="search-input">
            <Search size={18} />
            <input
              aria-label="참가자 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="닉네임으로 검색"
            />
          </div>
          <div className="filter-row">
            {[
              ["all", "전체"],
              ["done", "오늘 인증자"],
              ["pending", "오늘 미인증자"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "selected" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>참가자</th>
                <th>오늘 인증</th>
                <th>누적 인증</th>
                <th>연속 인증</th>
                <th>인증률</th>
                <th>기록</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.user_id}>
                  <td>
                    <b>{p.nickname}</b>
                  </td>
                  <td>
                    <span
                      className={`badge ${p.record_dates.includes(today) ? "green" : "subtle"}`}
                    >
                      {p.record_dates.includes(today) ? "완료" : "미인증"}
                    </span>
                  </td>
                  <td>{p.record_dates.length}일</td>
                  <td>
                    🔥{" "}
                    {streak(
                      p.record_dates,
                      c && today > c.end_date ? c.end_date : today,
                    )}
                    일
                  </td>
                  <td>
                    {elapsed
                      ? Math.round((p.record_dates.length / elapsed) * 100)
                      : 0}
                    %
                  </td>
                  <td>
                    <button
                      className="text-link"
                      onClick={() => void inspect(p)}
                    >
                      확인
                      <ArrowRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <div className="small-empty">해당하는 참가자가 없어요.</div>
          )}
        </div>
      </section>
      {c && (
        <section className="card daily-rates">
          <div className="card-heading">
            <h2>날짜별 인증률</h2>
            <span className="muted">미래 날짜는 평균 인증률에서 제외해요.</span>
          </div>
          {Array.from({ length: 14 }, (_, i) => {
            const date = addDays(c.start_date, i);
            const n = members.filter((p) =>
              p.record_dates.includes(date),
            ).length;
            const rate = members.length
              ? Math.round((n / members.length) * 100)
              : 0;
            return (
              <div
                key={date}
                className={`rate-row ${date > today ? "future" : ""}`}
              >
                <span>
                  DAY {i + 1}
                  <small>{date.slice(5)}</small>
                </span>
                <div className="progress-track">
                  <span style={{ width: `${rate}%` }} />
                </div>
                <b>{date > today ? "예정" : `${rate}%`}</b>
                <small>
                  {n}/{members.length}명
                </small>
              </div>
            );
          })}
        </section>
      )}
      {inspecting && !detail && (
        <Dialog
          title={`${inspecting.nickname}님의 인증 기록`}
          onClose={() => setInspecting(undefined)}
        >
          {detailLoading ? (
            <p>기록을 불러오는 중…</p>
          ) : privateRecords.length ? (
            privateRecords.map((r) => (
              <button
                className="admin-record"
                key={r.id}
                onClick={() => setDetail(r)}
              >
                <span>{r.record_date}</span>
                <b>{won(r.total_spending)}</b>
                <ArrowRight size={17} />
              </button>
            ))
          ) : (
            <p className="small-empty">인증 기록이 없어요.</p>
          )}
        </Dialog>
      )}
      {detail && (
        <RecordDetail
          readOnly
          record={detail}
          remaining={
            budget -
            privateRecords
              .filter((r) => r.record_date <= detail.record_date)
              .reduce((sum, r) => sum + r.total_spending, 0)
          }
          onClose={() => setDetail(undefined)}
        />
      )}{" "}
      {create && (
        <Dialog
          title="새로운 14일 챌린지"
          onClose={() => {
            if (!busy) setCreate(false);
          }}
        >
          <form className="record-form" onSubmit={createChallenge}>
            <label>
              챌린지 이름
              <input
                name="title"
                required
                maxLength={80}
                placeholder="2기 · 14일 가계부 챌린지"
              />
            </label>
            <label>
              챌린지 소개
              <textarea name="description" maxLength={300} rows={2} />
            </label>
            <label>
              시작일
              <input name="start" type="date" required />
            </label>
            <label>
              상태
              <select name="status">
                <option value="upcoming">시작 예정</option>
                <option value="active">진행 중</option>
                <option value="completed">종료</option>
              </select>
            </label>
            <p className="muted">
              종료일은 시작일로부터 14일째로 자동 설정돼요.
            </p>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <button className="button primary full" disabled={busy}>
              {busy ? "생성 중…" : "챌린지 생성"}
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
