"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase, configured, demoEnabled } from "@/lib/supabase/client";
import type {
  Profile,
  Challenge,
  Budget,
  DailyRecord,
  CommunityMember,
} from "@/types";
import { demoData, demoProfile } from "./demo";
import { validateRecord } from "@/utils/challenge";
import { useRouter, usePathname } from "next/navigation";
type Input = {
  record_date: string;
  total_spending: number;
  note: string;
  categories: string[];
};
type State = {
  loading: boolean;
  error: string;
  profile: Profile | null;
  challenge: Challenge | null;
  challenges: Challenge[];
  budget: Budget | null;
  records: DailyRecord[];
  community: CommunityMember[];
  demo: boolean;
  joined: boolean;
  refresh: () => Promise<void>;
  startDemo: () => void;
  logout: () => Promise<void>;
  selectChallenge: (id: string) => void;
  saveBudget: (budget: Budget) => Promise<void>;
  saveRecord: (
    input: Input,
    existing?: DailyRecord,
    file?: File,
  ) => Promise<{ record: DailyRecord; warning?: string }>;
  deleteRecord: (record: DailyRecord) => Promise<void>;
  imageUrl: (path: string) => Promise<string>;
  updateNickname: (name: string) => Promise<void>;
};
const Context = createContext<State | null>(null);
export function ChallengeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [community, setCommunity] = useState<CommunityMember[]>([]);
  const [demo, setDemo] = useState(false);
  const [joined, setJoined] = useState(false);
  const [selected, setSelected] = useState("");
  const loadDemo = useCallback(() => {
    const seed = demoData();
    let stored: {
      budget?: Budget;
      records?: DailyRecord[];
      nickname?: string;
    } = {};
    try {
      stored = JSON.parse(localStorage.getItem("leezimoney-demo") || "{}");
    } catch {
      localStorage.removeItem("leezimoney-demo");
    }
    const rs = (stored.records || seed.records).filter(
      (r) =>
        r.record_date >= seed.challenge.start_date &&
        r.record_date <= seed.challenge.end_date,
    );
    setProfile({
      ...demoProfile,
      nickname: stored.nickname || demoProfile.nickname,
    });
    setChallenge(seed.challenge);
    setChallenges([seed.challenge]);
    setBudget(stored.budget || seed.budget);
    setRecords(rs);
    setCommunity(
      seed.community.map((m) =>
        m.user_id === demoProfile.id
          ? {
              ...m,
              nickname: stored.nickname || m.nickname,
              record_dates: rs.map((r) => r.record_date),
            }
          : m,
      ),
    );
    setJoined(true);
    setDemo(true);
    setLoading(false);
    setError("");
  }, []);
  const refresh = useCallback(async () => {
    if (demoEnabled && localStorage.getItem("leezimoney-mode") === "demo") {
      loadDemo();
      return;
    }
    setError("");
    if (!configured) {
      setLoading(false);
      return;
    }
    try {
      const db = supabase();
      const { data: auth, error: authError } = await db.auth.getUser();
      if (authError && authError.name !== "AuthSessionMissingError")
        throw authError;
      if (!auth.user) {
        setProfile(null);
        setChallenge(null);
        setBudget(null);
        setRecords([]);
        setCommunity([]);
        setLoading(false);
        return;
      }
      const [
        { data: p, error: pe },
        { data: cs, error: ce },
        { data: members, error: me },
      ] = await Promise.all([
        db.from("profiles").select("*").eq("id", auth.user.id).single(),
        db
          .from("challenges")
          .select("*")
          .order("start_date", { ascending: false }),
        db
          .from("challenge_participants")
          .select("challenge_id")
          .eq("user_id", auth.user.id),
      ]);
      if (pe || ce || me) throw pe || ce || me;
      setProfile(p as Profile);
      setChallenges(cs || []);
      const c =
        cs?.find((c: Challenge) => c.id === selected) ||
        cs?.find((c: Challenge) => c.status === "active") ||
        cs?.find((c: Challenge) =>
          members?.some(
            (m: { challenge_id: string }) => m.challenge_id === c.id,
          ),
        ) ||
        cs?.[0];
      setChallenge(c || null);
      if (!c) {
        setBudget(null);
        setRecords([]);
        setCommunity([]);
        setJoined(false);
        return;
      }
      const isMember = Boolean(
        members?.some((m: { challenge_id: string }) => m.challenge_id === c.id),
      );
      setJoined(isMember);
      const [
        { data: b, error: be },
        { data: rs, error: re },
        { data: people, error: peopleError },
      ] = await Promise.all([
        db
          .from("budgets")
          .select("*")
          .eq("challenge_id", c.id)
          .eq("user_id", auth.user.id)
          .maybeSingle(),
        db
          .from("daily_records")
          .select("*,record_categories(category_id)")
          .eq("challenge_id", c.id)
          .eq("user_id", auth.user.id)
          .order("record_date", { ascending: false }),
        db.rpc("community_progress", { p_challenge: c.id }),
      ]);
      if (be || re || peopleError) throw be || re || peopleError;
      setBudget(b as Budget | null);
      setRecords(
        (rs || []).map(
          (
            r: DailyRecord & { record_categories: { category_id: string }[] },
          ) => ({
            ...r,
            categories: r.record_categories.map(
              (x: { category_id: string }) => x.category_id,
            ),
          }),
        ),
      );
      setCommunity(people || []);
      setDemo(false);
    } catch {
      setError(
        "데이터를 불러오지 못했어요. 인터넷 연결과 Supabase 설정을 확인하고 다시 시도해주세요.",
      );
    } finally {
      setLoading(false);
    }
  }, [selected, loadDemo]);
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);
  useEffect(() => {
    if (!configured) return;
    const { data } = supabase().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setBudget(null);
        setRecords([]);
        setCommunity([]);
      }
      if (event === "SIGNED_IN") setTimeout(() => void refresh(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);
  function persist(next: {
    budget?: Budget;
    records?: DailyRecord[];
    nickname?: string;
  }) {
    localStorage.setItem(
      "leezimoney-demo",
      JSON.stringify({ budget, records, nickname: profile?.nickname, ...next }),
    );
  }
  async function saveBudget(b: Budget) {
    if (!profile || !challenge) throw Error("진행 중인 챌린지를 선택해주세요.");
    for (const v of Object.values(b))
      if (!Number.isSafeInteger(v) || v < 0 || v > 1e12)
        throw Error("예산은 0원 이상의 정수로 입력해주세요.");
    if (demo) {
      persist({ budget: b });
      setBudget(b);
      return;
    }
    const db = supabase();
    if (!joined) {
      const { error } = await db
        .from("challenge_participants")
        .insert({ challenge_id: challenge.id, user_id: profile.id });
      if (error && error.code !== "23505")
        throw Error("챌린지 참여에 실패했어요. 다시 시도해주세요.");
    }
    const { error } = await db
      .from("budgets")
      .upsert(
        { ...b, challenge_id: challenge.id, user_id: profile.id },
        { onConflict: "challenge_id,user_id" },
      );
    if (error) throw Error("예산을 저장하지 못했어요. 다시 시도해주세요.");
    await refresh();
  }
  async function saveRecord(input: Input, existing?: DailyRecord, file?: File) {
    if (!profile || !challenge) throw Error("로그인이 필요해요.");
    validateRecord(input, challenge, undefined, Boolean(existing));
    if (!existing && records.some((r) => r.record_date === input.record_date))
      throw Error("이미 인증한 날짜예요. 기존 기록을 수정해주세요.");
    if (
      file &&
      (!["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024)
    )
      throw Error("5MB 이하의 JPG, PNG, WebP 이미지를 선택해주세요.");
    if (demo) {
      const record: DailyRecord = {
        ...input,
        id: existing?.id || crypto.randomUUID(),
        user_id: profile.id,
        challenge_id: challenge.id,
        image_path: existing?.image_path || null,
      };
      const next = [...records.filter((r) => r.id !== record.id), record];
      persist({ records: next });
      setRecords(next);
      setCommunity(
        community.map((m) =>
          m.user_id === profile.id
            ? { ...m, record_dates: next.map((r) => r.record_date) }
            : m,
        ),
      );
      return {
        record,
        warning: file
          ? "데모에서는 이미지를 서버에 업로드하지 않아요. 기록은 저장했어요."
          : undefined,
      };
    }
    const db = supabase();
    const { data: id, error } = await db.rpc("save_daily_record", {
      p_challenge: challenge.id,
      p_date: input.record_date,
      p_spending: input.total_spending,
      p_note: input.note,
      p_categories: input.categories,
      p_record: existing?.id || null,
      p_image_path: existing?.image_path || null,
    });
    if (error)
      throw Error(
        error.code === "23505"
          ? "이미 인증한 날짜예요. 기존 기록을 수정해주세요."
          : "기록을 저장하지 못했어요. 입력 내용과 인터넷 연결을 확인해주세요.",
      );
    const record: DailyRecord = {
      ...input,
      id,
      user_id: profile.id,
      challenge_id: challenge.id,
      image_path: existing?.image_path || null,
    };
    let warning: string | undefined;
    if (file) {
      const ext =
        file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/png"
            ? "png"
            : "webp";
      const path = `${profile.id}/${challenge.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await db.storage
        .from("proofs")
        .upload(path, file);
      if (uploadError)
        warning =
          "기록은 저장됐지만 이미지 업로드에 실패했어요. 기록 수정에서 다시 추가할 수 있어요.";
      else {
        const { error: linkError } = await db
          .from("daily_records")
          .update({ image_path: path })
          .eq("id", id);
        if (linkError) {
          await db.storage.from("proofs").remove([path]);
          warning =
            "기록은 저장됐지만 이미지를 연결하지 못했어요. 다시 추가해주세요.";
        } else {
          record.image_path = path;
          if (existing?.image_path)
            await db.storage.from("proofs").remove([existing.image_path]);
        }
      }
    }
    await refresh();
    return { record, warning };
  }
  async function deleteRecord(record: DailyRecord) {
    if (demo) {
      const next = records.filter((r) => r.id !== record.id);
      persist({ records: next });
      setRecords(next);
      setCommunity(
        community.map((m) =>
          m.user_id === profile?.id
            ? { ...m, record_dates: next.map((r) => r.record_date) }
            : m,
        ),
      );
      return;
    }
    const { error } = await supabase()
      .from("daily_records")
      .delete()
      .eq("id", record.id);
    if (error) throw Error("기록을 삭제하지 못했어요. 다시 시도해주세요.");
    if (record.image_path)
      await supabase().storage.from("proofs").remove([record.image_path]);
    await refresh();
  }
  async function imageUrl(path: string) {
    const { data, error } = await supabase()
      .storage.from("proofs")
      .createSignedUrl(path, 60);
    if (error) throw Error("이미지를 불러오지 못했어요.");
    return data.signedUrl;
  }
  async function updateNickname(name: string) {
    const nickname = name.trim();
    if (!nickname || nickname.length > 30)
      throw Error("닉네임을 1~30자로 입력해주세요.");
    if (demo) {
      persist({ nickname });
      setProfile((p) => (p ? { ...p, nickname } : p));
      return;
    }
    const { error } = await supabase()
      .from("profiles")
      .update({ nickname })
      .eq("id", profile!.id);
    if (error) throw Error("닉네임을 저장하지 못했어요.");
    await refresh();
  }
  async function logout() {
    if (demo) {
      localStorage.removeItem("leezimoney-mode");
      setDemo(false);
      setProfile(null);
      setBudget(null);
      setRecords([]);
      setCommunity([]);
    } else {
      const { error } = await supabase().auth.signOut();
      if (error) throw Error("로그아웃하지 못했어요. 다시 시도해주세요.");
    }
    router.push("/login");
  }
  function startDemo() {
    if (!demoEnabled) return;
    localStorage.setItem("leezimoney-mode", "demo");
    loadDemo();
    router.push("/");
  }
  return (
    <Context.Provider
      value={{
        loading,
        error,
        profile,
        challenge,
        challenges,
        budget,
        records,
        community,
        demo,
        joined,
        refresh,
        startDemo,
        logout,
        selectChallenge: setSelected,
        saveBudget,
        saveRecord,
        deleteRecord,
        imageUrl,
        updateNickname,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useChallenge() {
  const state = useContext(Context);
  if (!state) throw Error("ChallengeProvider is missing");
  return state;
}
