"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Sprout, ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase, configured, demoEnabled } from "@/lib/supabase/client";
import { useChallenge } from "@/features/challenge/provider";
export function LoginForm() {
  const [signup, setSignup] = useState(false);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const s = useChallenge();
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      if (!configured)
        throw Error(
          "Supabase가 아직 연결되지 않았어요. 운영자는 환경변수를 설정해주세요.",
        );
      localStorage.removeItem("leezimoney-mode");
      const email = String(f.get("email")).trim(),
        password = String(f.get("password"));
      if (signup) {
        const { data, error } = await supabase().auth.signUp({
          email,
          password,
          options: {
            data: { nickname: String(f.get("nickname")).trim() },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error)
          throw Error(
            "회원가입에 실패했어요. 이메일 형식과 비밀번호를 확인해주세요.",
          );
        if (!data.session) {
          setMessage(
            "인증 메일을 보냈어요. 이메일의 링크를 눌러 가입을 완료해주세요.",
          );
          return;
        }
      } else {
        const { error } = await supabase().auth.signInWithPassword({
          email,
          password,
        });
        if (error)
          throw Error(
            "이메일과 비밀번호를 확인해주세요. 이메일 인증이 필요한 경우 메일을 먼저 확인해주세요.",
          );
      }
      await s.refresh();
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "연결에 실패했어요. 다시 시도해주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-card">
      <div className="brand-icon">
        <Sprout size={28} />
      </div>
      <span className="eyebrow">YOUR MONEY, YOUR PACE</span>
      <h1>{signup ? "함께 시작해볼까요?" : "다시 만나 반가워요."}</h1>
      <p>하루 1분, 나를 위한 소비 기록.</p>
      <div className="segmented">
        <button
          onClick={() => {
            setSignup(false);
            setError("");
            setMessage("");
          }}
          className={!signup ? "selected" : ""}
        >
          로그인
        </button>
        <button
          onClick={() => {
            setSignup(true);
            setError("");
            setMessage("");
          }}
          className={signup ? "selected" : ""}
        >
          회원가입
        </button>
      </div>
      <form onSubmit={submit}>
        {signup && (
          <label>
            닉네임
            <input
              name="nickname"
              required
              maxLength={30}
              placeholder="함께 불릴 이름"
              autoComplete="nickname"
            />
          </label>
        )}
        <label>
          이메일
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="hello@example.com"
          />
        </label>
        <label>
          비밀번호
          <div className="password-input">
            <input
              name="password"
              type={visible ? "text" : "password"}
              required
              minLength={8}
              maxLength={72}
              autoComplete={signup ? "new-password" : "current-password"}
              placeholder="8자 이상 입력해주세요"
            />
            <button
              type="button"
              aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="success-text">
            {message}
          </p>
        )}
        <button disabled={busy} className="button primary full">
          {busy
            ? "잠시만 기다려주세요"
            : signup
              ? "나의 챌린지 시작하기"
              : "로그인"}
          <ArrowRight size={18} />
        </button>
      </form>
      {demoEnabled && (
        <button className="demo-link" onClick={s.startDemo}>
          가입 전 데모 둘러보기 →
        </button>
      )}
      <small>
        <span>🔒</span> 재무 정보는 나와 운영자만 확인할 수 있어요.
      </small>
    </div>
  );
}
