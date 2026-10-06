export type Profile = {
  id: string;
  email: string;
  nickname: string;
  role: "participant" | "admin";
};
export type Challenge = {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: "upcoming" | "active" | "completed";
};
export type Budget = {
  monthly_income: number;
  fixed_expenses: number;
  savings_investment: number;
  monthly_living_budget: number;
  challenge_budget: number;
};
export type DailyRecord = {
  id: string;
  challenge_id: string;
  user_id: string;
  record_date: string;
  total_spending: number;
  note: string;
  image_path: string | null;
  categories: string[];
};
export type CommunityMember = {
  user_id: string;
  nickname: string;
  record_dates: string[];
};
export const categories = [
  { id: "food", label: "식비", emoji: "🍚" },
  { id: "cafe", label: "카페/간식", emoji: "☕" },
  { id: "transport", label: "교통", emoji: "🚌" },
  { id: "shopping", label: "쇼핑", emoji: "🛍️" },
  { id: "hobby", label: "취미", emoji: "🎧" },
  { id: "living", label: "생활", emoji: "🏡" },
  { id: "other", label: "기타", emoji: "✳️" },
];
