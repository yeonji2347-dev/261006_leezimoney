"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  NotebookPen,
  Users,
  UserRound,
  Sprout,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { useChallenge } from "@/features/challenge/provider";
const nav = [
  { href: "/", label: "홈", icon: Home },
  { href: "/records", label: "나의 기록", short: "기록", icon: NotebookPen },
  {
    href: "/challenge",
    label: "함께하는 챌린지",
    short: "챌린지",
    icon: Users,
  },
  {
    href: "/counsel",
    label: "AI 상담원",
    short: "AI 상담",
    icon: MessageCircle,
  },
  { href: "/my", label: "마이페이지", short: "MY", icon: UserRound },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const s = useChallenge();
  const auth = path.startsWith("/login");
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Sprout size={24} />
          </span>
          이지머니<span className="brand-dot">.</span>
        </Link>
        <div className="brand-caption">매일의 기록, 더 나은 내일</div>
        <div className="nav-label">MY CHALLENGE</div>
        <nav aria-label="메인 메뉴">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-item ${path === n.href ? "active" : ""}`}
            >
              <n.icon size={20} />
              {n.label}
              {path === n.href && <span className="nav-active-dot" />}
            </Link>
          ))}
          {s.profile?.role === "admin" && (
            <Link
              className={`nav-item ${path === "/admin" ? "active" : ""}`}
              href="/admin"
            >
              <ShieldCheck size={20} />
              운영자 대시보드
            </Link>
          )}
        </nav>
        <div className="sidebar-note">
          <span>🌱</span>
          <p>
            큰 변화는
            <br />
            작은 습관에서 시작돼요.
          </p>
          <small>하루 1분, 나를 위한 기록</small>
          <Link href="/challenge">
            우리의 챌린지 <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">
            {s.profile?.nickname.slice(0, 1) || "🌱"}
          </span>
          <div>
            <b>{s.profile?.nickname || "반가워요"}</b>
            <small>{s.demo ? "데모 체험 중" : "나만의 소비 습관 만들기"}</small>
          </div>
          <Link aria-label="마이페이지" href="/my">
            <ChevronDown size={16} />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Link href="/" className="mobile-brand">
            <Sprout size={21} />
            이지머니.
          </Link>
          <div className="breadcrumb">
            나의 작은 변화 <span>/</span>{" "}
            {nav.find((n) => n.href === path)?.label ||
              (path === "/admin" ? "운영자 대시보드" : "챌린지 시작하기")}
          </div>
          <div className="topbar-right">
            <span className="private-label">
              <ShieldCheck size={14} />
              나의 기록은 안전하게
            </span>
            <Link href="/my" className="avatar small" aria-label="내 계정">
              {s.profile?.nickname.slice(0, 1) || "🌱"}
            </Link>
          </div>
        </header>
        {s.demo && (
          <div className="demo-strip">
            {path === "/counsel"
              ? "챌린지 기록은 예시이며, AI 상담은 입력한 키로 실제 Google API를 호출해요."
              : "데모 체험 · 예시 데이터이며 변경사항은 이 브라우저에만 저장돼요."}
          </div>
        )}
        <main className={auth ? "main auth-main" : "main"}>{children}</main>
        <footer className="page-footer">
          <Sprout size={14} />
          <span>오늘의 작은 기록이 내일의 나를 바꿔요.</span>
          <span className="footer-right">이지머니 © 2026</span>
        </footer>
      </div>
      {!auth && (
        <nav className="bottom-nav" aria-label="모바일 메뉴">
          {nav.map((n) => (
            <Link
              href={n.href}
              key={n.href}
              className={path === n.href ? "active" : ""}
            >
              <n.icon size={21} />
              <span>{n.short || n.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
