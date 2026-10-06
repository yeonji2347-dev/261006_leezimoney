# 이지머니 · 14일 가계부 챌린지

하루 1분, 자신의 예산 안에서 돈을 쓰는 습관을 만드는 모바일 퍼스트 MVP.
Next.js App Router · TypeScript · Tailwind CSS · Supabase Auth/PostgreSQL/Storage · Lucide.
배포 대상은 **Netlify**입니다. 이 저장소는 실제 배포를 실행하지 않습니다.

## 1. 로컬 실행

Node.js 24 LTS와 npm을 사용합니다. 정확한 패키지 버전은 `package-lock.json`에 고정되어 있습니다.

```sh
npm ci
cp .env.example .env.local
# .env.local의 Supabase URL과 publishable key 입력
npm run dev
```

http://localhost:3000 에서 확인합니다. `.env.local`은 Git에 포함되지 않습니다.

| 환경변수                               | 용도                                                                  |
| -------------------------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase Project URL                                                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key. 기존 프로젝트는 anon key도 가능             |
| `NEXT_PUBLIC_DEMO_MODE`                | 기본 `false`. `true`일 때만 데모 버튼 제공                            |
| `DATABASE_URL`                         | 선택. 폐기 가능한 로컬 Supabase DB에 SQL 보안 테스트 실행할 때만 사용 |

**service_role key를 프런트엔드에 입력하지 마세요.** 브라우저 요청은 사용자 JWT + RLS를 사용하며 서비스 키가 필요 없습니다.

### 데모 모드

Supabase 없이 화면을 확인하려면 `.env.local`에 `NEXT_PUBLIC_DEMO_MODE=true`를 넣고 개발 서버를 다시 시작한 뒤 **데모 둘러보기**를 누르세요. 로그인한 실사용자가 없으면 데모가 자동으로 시작되지 않습니다. 고정 예시 참가자 20명과 5일 기록을 보여주고 현재 서울 날짜 기준 DAY 6으로 시작합니다. 수정된 예산·기록·닉네임은 이 브라우저의 localStorage에만 저장됩니다. 인증 이미지를 서버에 업로드하지 않으며 관리자 기능을 제공하지 않습니다. 로그아웃은 데모 체험만 종료합니다. 데이터를 초기화하려면 localStorage의 `leezimoney-demo`를 삭제하세요. 실서비스 배포에서는 `false`를 사용하세요.

## 2. Supabase 설정

1. Supabase 프로젝트 생성 → Project Settings / API에서 URL과 publishable key 확인.
2. SQL Editor에서 **`supabase/migrations/001_initial.sql` 전체를 한 번 실행**합니다. 테이블, 제약조건, RLS, 함수, 회원가입 profile 트리거, 비공개 `proofs` 버킷 및 Storage 정책을 함께 생성합니다. 이미 적용한 SQL을 재실행하지 마세요.
3. Supabase Auth → Providers에서 Email 활성화. 이메일 확인을 사용하면 운영 SMTP를 설정하고 테스트 메일을 확인합니다. 가입 시 nickname 메타데이터만 사용하고 role 메타데이터는 무시합니다.
4. Auth → URL Configuration:
   - Site URL: 실제 Netlify 사이트의 HTTPS 주소
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://내사이트.netlify.app/auth/callback`
   - 커스텀 도메인을 쓰면 해당 도메인의 callback도 추가합니다.
5. 환경변수를 설정하고 가입합니다. 이메일 링크로 인증을 완료한 뒤 로그인하세요.
6. 첫 운영자를 아래 SQL로 지정하고 `/admin`에서 챌린지를 만듭니다. 시작일이 오늘인 경우 상태를 `진행 중`으로 지정합니다. 기간은 항상 14일입니다.
7. 참가자는 로그인 → 현재 챌린지 참여 → 예산 설정으로 시작합니다.

### 관리자 계정 설정

운영자로 사용할 계정을 일반 회원가입하고 이메일 인증을 완료한 뒤 **Supabase SQL Editor에서** 실행하세요.

```sql
update public.profiles
set role = 'admin'
where email = '실제운영자이메일@example.com';
```

관리자 권한 회수는 `role='participant'`로 변경합니다. 프런트엔드에서 role을 수정할 권한은 없습니다. `/admin`은 서버에서 `getUser()` 및 DB role을 검증합니다. 상세 데이터 접근은 추가로 RLS에서 검증합니다. 관리자도 다른 참가자의 기록을 수정/삭제할 권한은 없습니다.

### 첫 챌린지 SQL 등록 (관리자 화면 대신 사용 가능)

```sql
insert into public.challenges(title,description,start_date,end_date,duration_days,status)
values ('1기 · 14일 가계부 챌린지','작은 기록이 만드는 소비 습관',
        '2026-10-07','2026-10-20',14,'upcoming');
```

시작일에 `status='active'`로 전환하세요. 날짜 범위를 벗어나면 상태가 active여도 신규 인증은 DB에서 차단합니다. 종료 상태로 전환하거나 날짜가 지난 기수의 과거 기록은 계속 열람·수정·삭제할 수 있습니다. 시작/종료 상태를 자동 전환하는 예약 작업은 아직 없습니다.

## 3. Netlify 배포

1. 이 GitHub 저장소를 Netlify의 **Add new project → Import an existing project**로 연결합니다.
2. 배포 브랜치: `main`. Build command: `npm run build`. Publish directory: `.next`.
3. `netlify.toml`이 Node.js 24와 빌드 설정을 제공합니다. Netlify가 Next.js 프레임워크를 감지해 공식 Next.js 어댑터를 설치합니다. **static export를 켜지 마세요.** SSR, 세션 쿠키, 인증 callback이 필요합니다.
4. Netlify의 Environment variables에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_DEMO_MODE=false`를 등록합니다. 빌드 시점에도 사용할 수 있게 설정합니다.
5. Supabase에 실제 도메인의 Site URL과 callback Redirect URL을 등록하고 배포합니다.
6. 두 참가자와 운영자 계정으로 가입/인증/접근 차단/이미지 표시를 확인하세요. Preview 환경을 연결하면 해당 callback 도메인도 명시적으로 허용하세요.

실제 Supabase 프로젝트·Netlify 설정이나 자격증명은 저장소에 포함되지 않습니다. GitHub에 소스만 업로드하며 배포는 사용자가 Netlify에서 수행합니다.

## 4. 테스트

```sh
npm run typecheck
npm test
npm run build
```

- 계산 테스트: 누적 지출·잔여 예산·경과일 기준 인증률·연속 인증·일일 예산·무지출·0 나누기·서울 자정·기간 전후.
- PostgreSQL 테스트: PGlite의 실제 PostgreSQL 엔진에 원본 마이그레이션을 적용하여 RLS, 다른 사용자의 기록/예산/카테고리/이미지 차단, 관리자 조회, role 승격 차단, 중복 인증, 다중 카테고리 원자적 저장, 미래/종료 후 인증 차단을 검증합니다.
- 테스트의 auth/storage 최소 스키마는 Supabase 제공 부분만 재현합니다. 배포된 Supabase Auth 이메일 전송·Storage HTTP 업로드·서명 URL과 Netlify 런타임은 이 테스트가 검증하지 않습니다.

폐기 가능한 **로컬 Supabase**에서 같은 보안 SQL을 실행하려면 마이그레이션 적용 후 아래처럼 실행하세요. `psql`이 필요합니다. 운영 DB에서는 테스트하지 마세요.

```sh
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres npm run test:db
```

테스트 SQL은 트랜잭션 안에서 임시 사용자와 기록을 만들고 마지막에 rollback합니다.

### 브라우저 수동 확인

- 375px / 데스크톱에서 홈·기록·함께하는 챌린지·MY 이동
- 0원 인증 → 완료 화면 → 달력·예산·연속 인증 반영
- 같은 날짜 신규 인증 중복 차단 및 기존 기록 수정/삭제
- 한 날짜 여러 카테고리 선택, 이미지 5MB/형식 제한
- 네트워크 단절 및 이미지 업로드 실패 시 메시지/기록 유지
- 시작 전/종료 후 신규 인증 차단, 과거 기록 열람
- 운영자 참가자 검색·오늘 인증자/미인증자 필터·개인 기록 조회

## 5. 구조

```text
app/                    Next.js routes, root layout, auth callback, admin server guard
components/             Navigation, access gate, dialog, plant illustration
features/auth/          Login/signup, account page
features/challenge/     Shared data state, dashboard, community, explicit demo
features/budget/        Initial budget setup/edit
features/records/       Create/edit/delete/detail/history
features/admin/         Operator metrics, participant search/details, challenge creation
lib/supabase/           Browser/server Supabase clients
utils/challenge.ts      Pure Seoul date and budget/statistics functions
proxy.ts                Supabase session cookie refresh
supabase/migrations/    PostgreSQL schema + RLS + private Storage policies
supabase/tests/         Transactional PostgreSQL security assertions
tests/                  Calculation and database tests
netlify.toml            Netlify deployment configuration
```

### 데이터 모델

- `profiles`: Auth ID, email, nickname, participant/admin role
- `challenges`: 시작/종료 날짜, 기간, 상태. 여러 기수 지원
- `challenge_participants`: 챌린지/사용자 unique. 참여 상태
- `budgets`: 챌린지/사용자 unique. 수입·고정비·저축·월 생활비·챌린지 예산
- `daily_records`: 챌린지/사용자/날짜 unique, 금액·메모·비공개 image_path
- `spending_categories` + `record_categories`: 날짜별 복수 카테고리 관계

## 6. 보안 및 계산 기준

- 본인 상세 재무 데이터만 참가자에게 조회/수정 허용. Admin은 운영 목적 조회만 허용.
- 프로필 수정 권한은 **nickname 열만** 부여. role과 email 변조 차단.
- `community_progress`는 멤버 또는 Admin에게 **user_id, nickname, record_dates만** 반환하는 허용 목록 방식의 SQL 함수. 이메일·금액·메모·이미지를 반환하지 않습니다.
- 이미지 버킷은 private, 경로는 `user_id/challenge_id/random-uuid.ext`. 공개 URL을 저장하지 않습니다. 조회 시 사용자 세션으로 60초 signed URL 생성. JPG/PNG/WebP, 최대 5MB. 이미지는 승인된 사용자에게만 전달합니다.
- 인증은 RPC에서 기록과 카테고리를 단일 트랜잭션으로 저장합니다. 이미지 저장은 별도 단계입니다. 이미지 실패에도 먼저 저장된 기록은 유지됩니다. 새 이미지 연결 후 이전 이미지 삭제를 시도합니다.
- 날짜는 **Asia/Seoul**, 날짜 연산은 ISO calendar date와 UTC 정수 일수로 처리합니다.
- 인증률: 인증 완료일 / 챌린지 경과일. 미래 날짜는 분모에서 제외. 14일 진행률은 별도로 완료일 / 14.
- 연속 인증: 오늘 또는 가장 최근 인증일부터 날짜가 이어지는 기록을 역산합니다. 미래 날짜는 제외하고 종료된 기수는 종료일 기준으로 계산합니다.
- 오늘 예산: 오늘 이전 남은 예산 / 오늘 포함 잔여 일수. 오늘 남은 예산은 오늘 지출을 차감합니다.
- 앞으로 하루 사용 가능액: 잔여 예산 / 잔여 날짜. 오늘 인증 완료 후에는 오늘을 잔여 일수에서 제외합니다. 종료 후 분모가 0이면 0원.
- 초과 지출 시 잔여 예산은 음수로 표시합니다. 일일 사용 가능액은 절삭해 예산을 초과해 제안하지 않습니다.
- 과거 상세의 남은 예산은 **현재 설정한 총 예산**에서 해당 날짜까지 지출을 빼서 재계산합니다. 예산 변경 이력의 당시 스냅샷은 아직 저장하지 않습니다.

## 7. 구현 기능

회원가입·이메일 인증·로그인·로그아웃, 닉네임 수정, 챌린지 참여, 다섯 가지 예산 설정, 홈 대시보드, DAY 1–14 달력, 인증 CRUD, 복수 카테고리, 선택 이미지 및 signed URL, 성공 화면, 기록 목록·카테고리 필터·상세, 리포트, 공개 참가 인증 현황, 꾸준함 배지, 관리자 서버 권한 검사·통계·검색·인증자/미인증자 필터·개인 기록 조회·새 기수 생성, 데모 체험, 모바일 하단 내비게이션, 반응형 UI, 입력/네트워크 오류 처리.

## 8. 미구현 및 향후 개선

- 배포된 Supabase/Netlify에서의 이메일·업로드 통합 검증은 실제 프로젝트 연결 후 필요합니다.
- 예산 변경 이력 스냅샷, admin 기수 수정/상태 자동 전환, 참가 상태(active/completed/dropped) 자동 동기화.
- 실패한 Storage 삭제의 잔여 이미지 정리 작업. 업로드와 DB 연결은 서비스 간 완전한 트랜잭션이 아니므로 주기적 정리가 유용합니다.
- 실시간 참가 현황 갱신은 없으며 페이지 이동/새로고침으로 확인합니다.
- 비밀번호 재설정·이메일 변경·계정 삭제, 전 기수 데이터 내보내기, 추가 접근성 자동 검사.
- 결제, 카카오 로그인, 푸시, AI 분석, 채팅, 소비액 랭킹, 금융기관 연동/카드 자동수집은 MVP에서 제외했습니다.
