import type {
  Budget,
  Challenge,
  DailyRecord,
  CommunityMember,
  Profile,
} from "@/types";
import { addDays, seoulDate } from "@/utils/challenge";
export const demoProfile: Profile = {
  id: "demo-user",
  email: "demo@example.com",
  nickname: "지민",
  role: "participant",
};
export function demoData() {
  const today = seoulDate();
  const start = addDays(today, -5);
  const challenge: Challenge = {
    id: "demo-challenge",
    title: "14일 가계부 챌린지",
    description: "작은 기록이 만드는 단단한 소비 습관",
    start_date: start,
    end_date: addDays(start, 13),
    duration_days: 14,
    status: "active",
  };
  const budget: Budget = {
    monthly_income: 3000000,
    fixed_expenses: 1000000,
    savings_investment: 800000,
    monthly_living_budget: 1200000,
    challenge_budget: 500000,
  };
  const amounts = [18000, 12500, 32000, 8700, 24000];
  const notes = [
    "집에서 만든 도시락과 저녁 장보기",
    "동료와 함께한 따뜻한 점심",
    "오래 쓸 수 있는 물건을 골랐어요",
    "출근길 교통비와 커피 한 잔",
    "이번 주를 위한 건강한 식재료",
  ];
  const records: DailyRecord[] = amounts.map((amount, i) => ({
    id: `demo-record-${i}`,
    challenge_id: challenge.id,
    user_id: demoProfile.id,
    record_date: addDays(start, i),
    total_spending: amount,
    note: notes[i],
    image_path: null,
    categories: [i === 2 ? "shopping" : "food", ...(i === 3 ? ["cafe"] : [])],
  }));
  const names = [
    "지민",
    "소소",
    "유나",
    "민준",
    "하루",
    "나무",
    "도담",
    "수빈",
    "해솔",
    "지우",
    "마루",
    "윤슬",
    "은서",
    "보리",
    "다온",
    "현우",
    "여름",
    "루나",
    "새봄",
    "다솜",
  ];
  const community: CommunityMember[] = names.map((nickname, i) => ({
    user_id: i === 0 ? demoProfile.id : `demo-${i}`,
    nickname,
    record_dates: Array.from({ length: i === 0 ? 5 : i < 17 ? 6 : 4 }, (_, j) =>
      addDays(start, j),
    ),
  }));
  return { challenge, budget, records, community };
}
