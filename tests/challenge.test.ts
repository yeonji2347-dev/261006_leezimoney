import test from "node:test";
import assert from "node:assert/strict";
import {
  stats,
  streak,
  seoulDate,
  validateRecord,
  addDays,
  won,
} from "../utils/challenge";
import type { Challenge, DailyRecord } from "../types";
const c: Challenge = {
  id: "c",
  title: "test",
  description: "",
  start_date: "2026-10-01",
  end_date: "2026-10-14",
  duration_days: 14,
  status: "active",
};
const record = (day: number, amount = 1000): DailyRecord => ({
  id: String(day),
  challenge_id: "c",
  user_id: "u",
  record_date: addDays(c.start_date, day - 1),
  total_spending: amount,
  note: "기록",
  image_path: null,
  categories: ["food"],
});
test("누적 지출과 남은 예산: 다른 기수, 미래, 기간 외 기록 제외", () => {
  const r = [
    record(1, 10000),
    record(2, 2500),
    { ...record(2, 99999), challenge_id: "other" },
    record(10),
    record(0),
  ];
  const m = stats(c, r, 50000, "2026-10-02");
  assert.equal(m.spent, 12500);
  assert.equal(m.remaining, 37500);
  assert.equal(m.average, 6250);
});
test("인증률은 경과일을 분모로 계산하고 미래 날짜를 제외", () => {
  assert.equal(
    stats(c, [record(1), record(2), record(3)], 10000, "2026-10-06").rate,
    50,
  );
  assert.equal(stats(c, [], 10000, "2026-09-30").rate, 0);
  assert.equal(stats(c, [record(1)], 10000, "2026-10-20").rate, 7);
});
test("연속 인증: 오늘 또는 가장 최근 인증 기준, 누락·중복·미래 처리", () => {
  assert.equal(
    streak(
      ["2026-10-01", "2026-10-02", "2026-10-02", "2026-10-03"],
      "2026-10-03",
    ),
    3,
  );
  assert.equal(streak(["2026-10-01", "2026-10-02"], "2026-10-03"), 2);
  assert.equal(streak(["2026-10-01"], "2026-10-03"), 1);
  assert.equal(
    streak(["2026-10-01", "2026-10-03", "2026-10-04"], "2026-10-03"),
    1,
  );
});
test("오늘 인증 전후의 일 예산: 인증 후 오늘을 남은 일수에서 제외", () => {
  const before = stats(c, [record(1, 10000)], 140000, "2026-10-02");
  assert.equal(before.remainingDays, 13);
  assert.equal(before.dailyAvailable, 10000);
  assert.equal(before.todayRemaining, 10000);
  const after = stats(
    c,
    [record(1, 10000), record(2, 4000)],
    140000,
    "2026-10-02",
  );
  assert.equal(after.todayRemaining, 6000);
  assert.equal(after.remainingDays, 12);
  assert.equal(after.dailyAvailable, 10500);
});
test("종료일 인증 후와 종료 후 0으로 나누지 않음", () => {
  const m = stats(c, [record(14, 2000)], 10000, "2026-10-14");
  assert.equal(m.remainingDays, 0);
  assert.equal(m.dailyAvailable, 0);
  assert.equal(stats(c, [], 10000, "2026-10-15").dailyAvailable, 0);
  assert.equal(stats(c, [], 0, "2026-10-01").average, 0);
  assert.equal(stats(c, [], 140000, "2026-09-25").dailyAvailable, 10000);
});
test("초과 예산은 숨기지 않고 음수로 표시", () => {
  const m = stats(c, [record(1, 20000)], 10000, "2026-10-01");
  assert.equal(m.remaining, -10000);
  assert.equal(m.dailyAvailable, -770);
  assert.equal(won(-10000), "-10,000원");
});
test("서울 시간 자정 경계와 월말 날짜 계산", () => {
  assert.equal(seoulDate(new Date("2026-10-01T14:59:59Z")), "2026-10-01");
  assert.equal(seoulDate(new Date("2026-10-01T15:00:00Z")), "2026-10-02");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("무지출 허용, 음수/소수/미래/기간 외/시작 전/종료 후 신규 인증 차단", () => {
  const input = {
    record_date: "2026-10-01",
    total_spending: 0,
    note: "무지출",
    categories: ["food"],
  };
  assert.doesNotThrow(() => validateRecord(input, c, "2026-10-01"));
  for (const total_spending of [-1, 1.2, NaN, Infinity])
    assert.throws(() =>
      validateRecord({ ...input, total_spending }, c, "2026-10-01"),
    );
  assert.throws(() =>
    validateRecord({ ...input, record_date: "2026-10-02" }, c, "2026-10-01"),
  );
  assert.throws(() => validateRecord(input, c, "2026-09-30"));
  assert.throws(() => validateRecord(input, c, "2026-10-15"));
  assert.doesNotThrow(() => validateRecord(input, c, "2026-10-15", true));
  assert.throws(() => validateRecord({ ...input, note: " " }, c, "2026-10-01"));
  assert.throws(() =>
    validateRecord({ ...input, categories: [] }, c, "2026-10-01"),
  );
});
