import type { Metadata } from "next";
import "./globals.css";
import { ChallengeProvider } from "@/features/challenge/provider";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {
  title: "이지머니 · 14일 가계부 챌린지",
  description: "하루 1분, 작은 기록으로 만드는 나의 소비 습관.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <ChallengeProvider>
          <Shell>{children}</Shell>
        </ChallengeProvider>
      </body>
    </html>
  );
}
