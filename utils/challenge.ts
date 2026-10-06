import type { Challenge, DailyRecord } from "@/types";
const DAY = 86400000;
export const won = (value: number) =>
  `${Math.round(value).toLocaleString("ko-KR")}원`;
export function seoulDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function addDays(date: string, count: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + count * DAY)
    .toISOString()
    .slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY,
  );
}
export function streak(dates: string[], today = seoulDate()): number {
  const set = new Set(dates.filter((d) => d <= today));
  let anchor = [...set].sort().at(-1) || "";
  let count = 0;
  while (anchor && set.has(anchor)) {
    count++;
    anchor = addDays(anchor, -1);
  }
  return count;
}
export function stats(
  challenge: Challenge,
  records: DailyRecord[],
  budget: number,
  today = seoulDate(),
) {
  const valid = records.filter(
    (r) =>
      r.challenge_id === challenge.id &&
      r.record_date >= challenge.start_date &&
      r.record_date <= challenge.end_date &&
      r.record_date <= today,
  );
  const elapsed = Math.max(
    0,
    Math.min(
      challenge.duration_days,
      daysBetween(challenge.start_date, today) + 1,
    ),
  );
  const spent = valid.reduce((sum, r) => sum + Number(r.total_spending), 0);
  const completed = new Set(valid.map((r) => r.record_date)).size;
  const remaining = budget - spent;
  const todaySpent =
    valid.find((r) => r.record_date === today)?.total_spending ?? 0;
  const spentBeforeToday = spent - todaySpent;
  const daysIncludingToday =
    today < challenge.start_date
      ? challenge.duration_days
      : Math.max(0, daysBetween(today, challenge.end_date) + 1);
  const todayAllowance = daysIncludingToday
    ? Math.floor((budget - spentBeforeToday) / daysIncludingToday)
    : 0;
  const todayCompleted = valid.some((r) => r.record_date === today);
  const remainingDays = Math.max(
    0,
    daysIncludingToday - (todayCompleted ? 1 : 0),
  );
  return {
    elapsed,
    day: elapsed,
    completed,
    spent,
    remaining,
    todaySpent,
    todayAllowance,
    todayRemaining: todayAllowance - todaySpent,
    remainingDays,
    dailyAvailable: remainingDays ? Math.floor(remaining / remainingDays) : 0,
    rate: elapsed ? Math.round((completed / elapsed) * 100) : 0,
    average: completed ? Math.round(spent / completed) : 0,
    streak: streak(
      valid.map((r) => r.record_date),
      today > challenge.end_date ? challenge.end_date : today,
    ),
    todayCompleted,
    before: today < challenge.start_date,
    ended: today > challenge.end_date || challenge.status === "completed",
  };
}
export function validateRecord(
  input: {
    record_date: string;
    total_spending: number;
    note: string;
    categories: string[];
  },
  challenge: Challenge,
  today = seoulDate(),
  editing = false,
) {
  if (
    !Number.isSafeInteger(input.total_spending) ||
    input.total_spending < 0 ||
    input.total_spending > 1e12
  )
    throw Error("지출액을 0원 이상의 정수로 입력해주세요.");
  if (!input.note.trim() || input.note.trim().length > 300)
    throw Error("소비 기록을 1~300자로 입력해주세요.");
  if (!input.categories.length)
    throw Error("카테고리를 하나 이상 선택해주세요.");
  if (
    input.record_date < challenge.start_date ||
    input.record_date > challenge.end_date ||
    input.record_date > today
  )
    throw Error("챌린지 기간 안의 지난 날짜 또는 오늘을 선택해주세요.");
  if (
    !editing &&
    (challenge.status !== "active" ||
      today < challenge.start_date ||
      today > challenge.end_date)
  )
    throw Error("지금은 새로운 인증을 등록할 수 없어요.");
}
