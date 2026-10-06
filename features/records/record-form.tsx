"use client";
import { useState, type FormEvent } from "react";
import { ImagePlus, Check, ArrowRight, Flame, ShieldCheck } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { useChallenge } from "@/features/challenge/provider";
import { categories, type DailyRecord } from "@/types";
import { daysBetween, seoulDate, streak } from "@/utils/challenge";
export function RecordForm({
  existing,
  onClose,
  initialDate,
}: {
  existing?: DailyRecord;
  onClose: () => void;
  initialDate?: string;
}) {
  const s = useChallenge();
  const c = s.challenge!;
  const [date, setDate] = useState(
    existing?.record_date || initialDate || seoulDate(),
  );
  const [amount, setAmount] = useState(
    existing ? String(existing.total_spending) : "",
  );
  const [selected, setSelected] = useState(existing?.categories || []);
  const [note, setNote] = useState(existing?.note || "");
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    record: DailyRecord;
    warning?: string;
  }>();
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await s.saveRecord(
        {
          record_date: date,
          total_spending: Number(amount),
          categories: selected,
          note,
        },
        existing,
        file,
      );
      setResult(saved);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "저장에 실패했어요. 인터넷 연결을 확인해주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  const completedStreak = result
    ? streak([
        ...s.records.map((r) => r.record_date),
        result.record.record_date,
      ])
    : 0;
  return (
    <Dialog
      title={
        result
          ? "오늘도 한 걸음 더 🌱"
          : existing
            ? "인증 기록 수정"
            : "오늘의 인증"
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {result ? (
        <div className="success-panel">
          <div className="success-medal">
            <Check size={40} />
          </div>
          <span className="eyebrow">ONE SMALL STEP, EVERY DAY</span>
          <h2>
            DAY {daysBetween(c.start_date, result.record.record_date) + 1} 인증
            완료!
          </h2>
          <p>오늘도 내 돈을 내가 통제했어요.</p>
          {result.record.total_spending === 0 && (
            <div className="badge green">오늘은 무지출 데이예요 🎉</div>
          )}
          <div className="streak-celebration">
            <Flame size={19} /> {completedStreak}일 연속 인증
          </div>
          {result.warning && (
            <p className="warning-text" role="status">
              {result.warning}
            </p>
          )}
          <button className="button primary full" onClick={onClose}>
            기록으로 돌아가기
            <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <form className="record-form" onSubmit={submit}>
          <p className="form-intro">
            1분이면 충분해요. 오늘의 소비를 가볍게 돌아보세요.
          </p>
          <label>
            인증 날짜
            <input
              type="date"
              required
              min={c.start_date}
              max={seoulDate() < c.end_date ? seoulDate() : c.end_date}
              value={date}
              disabled={Boolean(existing)}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            오늘 총 지출액
            <div className="money-input large">
              <input
                autoFocus
                type="number"
                inputMode="numeric"
                min={0}
                max={1e12}
                step={1}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
              <span>원</span>
            </div>
            <small>0원도 좋아요. 무지출도 소중한 기록이에요.</small>
          </label>
          <fieldset>
            <legend>
              지출 카테고리 <small>여러 개 선택할 수 있어요</small>
            </legend>
            <div className="category-options">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  aria-pressed={selected.includes(cat.id)}
                  className={selected.includes(cat.id) ? "selected" : ""}
                  onClick={() =>
                    setSelected(
                      selected.includes(cat.id)
                        ? selected.filter((id) => id !== cat.id)
                        : [...selected, cat.id],
                    )
                  }
                >
                  {cat.emoji} {cat.label}
                  {selected.includes(cat.id) && <Check size={13} />}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            오늘 나에게 꼭 필요했던 소비는 무엇이었나요?
            <textarea
              required
              maxLength={300}
              rows={3}
              placeholder="예: 든든한 점심 한 끼로 오후를 잘 보냈어요."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <small className="text-count">{note.length} / 300</small>
          </label>
          <label className="upload-label">
            <span>
              인증 이미지 <small>선택 · JPG, PNG, WebP · 최대 5MB</small>
            </span>
            <div className="upload-box">
              <ImagePlus size={23} />
              <span>
                {file?.name ||
                  (existing?.image_path
                    ? "새 이미지를 선택하면 기존 이미지가 바뀌어요"
                    : "영수증이나 가계부 캡처를 추가해보세요")}
              </span>
              <input
                type="file"
                aria-label="인증 이미지 선택"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0])}
              />
            </div>
          </label>
          <div className="privacy-note">
            <ShieldCheck size={15} />
            이미지는 나와 운영자만 볼 수 있어요.
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {busy
              ? "기록을 저장하고 있어요…"
              : existing
                ? "수정 내용 저장"
                : "오늘의 인증 완료하기"}
            <Check size={18} />
          </button>
        </form>
      )}
    </Dialog>
  );
}
