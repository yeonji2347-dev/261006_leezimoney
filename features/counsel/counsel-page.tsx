"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";
import {
  MessageCircle,
  KeyRound,
  Send,
  Eye,
  EyeOff,
  ShieldCheck,
  Sprout,
  Trash2,
  LoaderCircle,
  Square,
} from "lucide-react";
import { useChallenge } from "@/features/challenge/provider";
import { stats, won } from "@/utils/challenge";
import {
  GEMINI_MODEL,
  MAX_HISTORY,
  MAX_MESSAGE_LENGTH,
  type ChatMessage,
  type BudgetSummary,
} from "./gemini";
const suggestions = [
  "예산을 지키는 작은 습관을 알려주세요",
  "충동구매가 고민이에요",
  "남은 챌린지를 꾸준히 기록하고 싶어요",
];
export function CounselPage() {
  const s = useChallenge();
  const [keyInput, setKeyInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (messages.length || busy)
      endRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [messages, busy]);
  const m =
    s.challenge && s.budget
      ? stats(s.challenge, s.records, s.budget.challenge_budget)
      : null;
  const summary: BudgetSummary | undefined =
    m && s.budget
      ? {
          challenge_budget: s.budget.challenge_budget,
          cumulative_spending: m.spent,
          remaining_budget: m.remaining,
          daily_available: m.dailyAvailable,
          completed_days: m.completed,
          elapsed_days: m.elapsed,
        }
      : undefined;
  function changeKey(e: FormEvent) {
    e.preventDefault();
    const key = keyInput.trim();
    if (!key || key.length > 256 || /\s/.test(key)) {
      setError("공백 없이 Gemini API 키를 입력해주세요.");
      return;
    }
    requestRef.current?.abort();
    setApiKey(key);
    setKeyInput("");
    setVisible(false);
    setMessages([]);
    setShare(false);
    setDraft("");
    setError("");
    setKeyMessage("키를 적용했어요. 첫 질문을 보내면 연결을 확인해요.");
  }
  function clear() {
    requestRef.current?.abort();
    setApiKey("");
    setKeyInput("");
    setMessages([]);
    setDraft("");
    setShare(false);
    setVisible(false);
    setBusy(false);
    setError("");
    setKeyMessage("키와 대화를 지웠어요.");
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const text = draft.trim();
    if (!apiKey) {
      setError("먼저 Gemini API 키를 적용해주세요.");
      return;
    }
    if (!text || text.length > MAX_MESSAGE_LENGTH) {
      setError("질문은 1~2,000자로 입력해주세요.");
      return;
    }
    const next: ChatMessage[] = [...messages, { role: "user", text }]; // Keep complete user/model pairs, plus this question.
    const history = next.slice(-(MAX_HISTORY - 1));
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError("");
    setKeyMessage("");
    try {
      const response = await fetch("/api/counsel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          messages: history,
          ...(share && summary ? { summary } : {}),
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || typeof data.text !== "string")
        throw Error(
          typeof data.error === "string"
            ? data.error
            : "답변을 받지 못했어요. 다시 시도해주세요.",
        );
      if (controller.signal.aborted) return;
      setMessages([...next, { role: "model", text: data.text }]);
      setDraft("");
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error &&
            !(err instanceof TypeError) &&
            !(err instanceof SyntaxError) &&
            err.message &&
            !err.message.includes(apiKey)
            ? err.message
            : "연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.",
        );
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">A KINDER MONEY CONVERSATION</span>
          <h1>AI 소비 상담원 🌱</h1>
          <p>예산과 소비 고민을, 나의 속도로 이야기해요.</p>
        </div>
        <span className="badge green">
          <MessageCircle size={14} />
          Gemini와 함께
        </span>
      </div>
      <div className="counsel-layout">
        <aside className="card counsel-settings">
          <div className="card-heading">
            <h2>
              <KeyRound size={18} />
              나의 API 키
            </h2>
            {apiKey && <span className="badge green">적용됨</span>}
          </div>
          <p className="counsel-intro">
            Google AI Studio에서 발급한 키로 상담을 시작해요. 사용량은 내 Google
            프로젝트에 반영돼요.
          </p>
          <form onSubmit={changeKey}>
            <label htmlFor="gemini-key">Gemini API 키</label>
            <div className="password-input">
              <input
                id="gemini-key"
                type={visible ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                maxLength={256}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={
                  apiKey ? "새 키를 입력해 교체하기" : "API 키를 입력해주세요"
                }
                required
              />
              <button
                type="button"
                aria-label={visible ? "API 키 숨기기" : "API 키 표시"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <button className="button primary full" disabled={busy}>
              {apiKey ? "키 교체하기" : "키 적용하기"}
            </button>
          </form>
          <a
            className="text-link counsel-key-link"
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google AI Studio에서 키 발급 ↗
          </a>
          {keyMessage && (
            <p role="status" className="counsel-key-status">
              {keyMessage}
            </p>
          )}
          <div className="privacy-note">
            <ShieldCheck size={16} />
            <span>
              키와 대화는 저장하지 않아요. 화면을 떠나거나 새로고침하면
              지워져요. 상담 요청 시 키와 대화가 Google에 전달돼요.
            </span>
          </div>
          <div className="counsel-summary">
            <label className="counsel-checkbox">
              <input
                type="checkbox"
                checked={share}
                disabled={!summary || busy}
                onChange={(e) => setShare(e.target.checked)}
              />
              <span>이번 상담에 챌린지 요약 함께 보내기</span>
            </label>
            {summary ? (
              <p>
                총 예산 {won(summary.challenge_budget)} · 누적 지출{" "}
                {won(summary.cumulative_spending)} · 남은 예산{" "}
                {won(summary.remaining_budget)} · 하루 사용 가능{" "}
                {won(summary.daily_available)} · 인증 {summary.completed_days}/
                {summary.elapsed_days}일
              </p>
            ) : (
              <p>예산을 설정하면 나의 챌린지 요약을 선택해 공유할 수 있어요.</p>
            )}
            <small>
              선택한 요청에만 위 요약을 보내요. 수입·메모·이미지는 자동 전송하지
              않아요. 이미 보낸 요약은 대화 문맥에 남을 수 있어요.
            </small>
          </div>
          <div className="counsel-model">
            사용 모델 <code>{GEMINI_MODEL}</code>
          </div>
          <button className="logout-button" onClick={clear}>
            <Trash2 size={15} />
            키와 대화 지우기
          </button>
        </aside>
        <section className="card counsel-chat">
          <div className="card-heading">
            <h2>
              <span className="brand-icon">
                <Sprout size={20} />
              </span>
              이지머니 상담원
            </h2>
            <span className="muted">나를 위한 소비 대화</span>
          </div>
          <div
            className="counsel-messages"
            role="log"
            aria-label="상담 대화"
            aria-live="polite"
          >
            {!messages.length && !busy && (
              <div className="counsel-welcome">
                <span className="counsel-sprout">
                  <Sprout size={37} />
                </span>
                <h2>어떤 소비 고민이 있나요?</h2>
                <p>
                  무조건 아끼기보다, 나에게 필요한 소비를 찾아봐요.
                  <br />
                  오늘 실천할 수 있는 작은 행동을 함께 생각할게요.
                </p>
                <div className="counsel-suggestions">
                  {suggestions.map((text) => (
                    <button key={text} onClick={() => setDraft(text)}>
                      {text}
                      <MessageCircle size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, i) => (
              <div className={`chat-message ${message.role}`} key={i}>
                <small>{message.role === "user" ? "나" : "이지머니 AI"}</small>
                <p>{message.text}</p>
              </div>
            ))}
            {busy && (
              <div className="chat-message model">
                <small>이지머니 AI</small>
                <p className="counsel-thinking">
                  <LoaderCircle size={15} className="spin" />
                  함께 생각하고 있어요…
                </p>
              </div>
            )}
            <div ref={endRef} />
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <form className="counsel-compose" onSubmit={send}>
            <label className="sr-only" htmlFor="counsel-question">
              상담 질문
            </label>
            <textarea
              id="counsel-question"
              rows={3}
              maxLength={MAX_MESSAGE_LENGTH}
              value={draft}
              disabled={busy}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                apiKey
                  ? "오늘의 소비 고민을 이야기해주세요."
                  : "먼저 나의 API 키를 적용해주세요."
              }
            />
            <div className="counsel-compose-actions">
              <small>
                {draft.length} / {MAX_MESSAGE_LENGTH} · 금융 거래를 실행하지
                않아요
              </small>
              {busy ? (
                <button
                  className="button secondary"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    requestRef.current?.abort();
                    setBusy(false);
                  }}
                >
                  <Square size={14} />
                  응답 중단
                </button>
              ) : (
                <button
                  className="button primary"
                  disabled={!apiKey || !draft.trim()}
                >
                  <Send size={15} />
                  질문 보내기
                </button>
              )}
            </div>
          </form>
          <p className="counsel-footer">
            AI 답변은 생활 예산과 소비 습관을 위한 참고 정보예요.
            주민등록번호·계좌번호·비밀번호는 입력하지 마세요.
          </p>
        </section>
      </div>
    </>
  );
}
