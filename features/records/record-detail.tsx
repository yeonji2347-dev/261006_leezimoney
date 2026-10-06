"use client";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/dialog";
import { useChallenge } from "@/features/challenge/provider";
import { categories, type DailyRecord } from "@/types";
import { won } from "@/utils/challenge";
import { Pencil, Trash2, ShieldCheck } from "lucide-react";
import { RecordForm } from "./record-form";
export function RecordDetail({
  record,
  onClose,
  readOnly = false,
  remaining,
}: {
  record: DailyRecord;
  onClose: () => void;
  readOnly?: boolean;
  remaining?: number;
}) {
  const s = useChallenge();
  const [image, setImage] = useState("");
  const [imageError, setImageError] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (record.image_path && !s.demo)
      s.imageUrl(record.image_path)
        .then((url) => {
          if (active) setImage(url);
        })
        .catch(() => {
          if (active)
            setImageError(
              "이미지를 불러오지 못했어요. 잠시 후 다시 열어주세요.",
            );
        });
    return () => {
      active = false;
    };
  }, [record.image_path, s.demo]);
  const atTime =
    remaining ??
    (s.budget?.challenge_budget || 0) -
      s.records
        .filter((r) => r.record_date <= record.record_date)
        .reduce((sum, r) => sum + r.total_spending, 0);
  if (editing) return <RecordForm existing={record} onClose={onClose} />;
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await s.deleteRecord(record);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="나의 소비 기록" onClose={onClose}>
      <div className="record-detail">
        <span className="eyebrow">
          {record.record_date.replaceAll("-", ".")} · 인증 완료
        </span>
        <h2>{won(record.total_spending)}</h2>
        <div className="tags">
          {record.categories.map((id) => (
            <span key={id}>
              {categories.find((c) => c.id === id)?.label || id}
            </span>
          ))}
        </div>
        <div className="detail-note">
          <small>오늘 나에게 꼭 필요했던 소비</small>
          <p>{record.note}</p>
        </div>
        <div className="detail-budget">
          <span>이날까지 남은 챌린지 예산</span>
          <b>{won(atTime)}</b>
        </div>
        <small className="muted">
          현재 설정한 예산을 기준으로 이날까지의 지출을 계산했어요.
        </small>
        {image && (
          <img className="proof-image" src={image} alt="첨부한 인증 이미지" />
        )}
        {imageError && (
          <p role="alert" className="error-text">
            {imageError}
          </p>
        )}
        <div className="privacy-note">
          <ShieldCheck size={15} />이 기록은 나와 운영자만 볼 수 있어요.
        </div>
        {!readOnly && (
          <div className="detail-actions">
            {confirm ? (
              <>
                <p>이 기록을 삭제할까요?</p>
                <button
                  className="button danger"
                  disabled={busy}
                  onClick={remove}
                >
                  {busy ? "삭제 중…" : "삭제하기"}
                </button>
                <button
                  className="button secondary"
                  onClick={() => setConfirm(false)}
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <button
                  className="button secondary"
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={16} />
                  수정하기
                </button>
                <button
                  className="icon-button delete"
                  aria-label="기록 삭제"
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
