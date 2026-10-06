import test from "node:test";
import assert from "node:assert/strict";
import { handleCounselRequest } from "../features/counsel/handler";
import {
  GEMINI_MODEL,
  validateCounselInput,
  geminiText,
} from "../features/counsel/gemini";
const key = "synthetic-test-key-not-a-real-credential";
const input = {
  apiKey: key,
  messages: [{ role: "user", text: "충동구매를 줄이는 방법은?" }],
};
const request = (body: unknown = input, origin = "https://money.example") =>
  new Request("https://money.example/api/counsel", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const authorize = async () => true;
test("Gemini 요청은 정확한 모델, 헤더 키, 대화 역할을 사용하고 키를 body/URL/답변에 노출하지 않음", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(
      url,
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    );
    assert.equal(new Headers(options?.headers).get("x-goog-api-key"), key);
    assert.equal(options?.cache, "no-store");
    const body = JSON.parse(String(options?.body));
    assert.ok(!String(options?.body).includes(key));
    assert.equal(body.contents[0].role, "user");
    assert.equal(body.contents[0].parts[0].text, input.messages[0].text);
    assert.ok(
      !body.systemInstruction.parts[0].text.includes("challenge_budget"),
    );
    return Response.json({
      candidates: [
        {
          content: {
            parts: [
              { text: "생각 과정", thought: true },
              { text: "구매 전 하루 기다려보세요." },
            ],
          },
        },
      ],
    });
  };
  const result = await handleCounselRequest(request(), {
    authorize,
    fetchImpl,
  });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  const body = await result.json();
  assert.equal(body.text, "구매 전 하루 기다려보세요.");
  assert.ok(!JSON.stringify(body).includes(key));
  assert.equal(calls, 1);
});
test("예산 요약은 명시적으로 선택한 필드만 전송하고 수입/메모 등 추가 필드는 제거", async () => {
  const summary = {
    challenge_budget: 500000,
    cumulative_spending: 12000,
    remaining_budget: 488000,
    daily_available: 37000,
    completed_days: 1,
    elapsed_days: 2,
    monthly_income: 9999999,
    note: "private",
  };
  const validated = validateCounselInput({ ...input, summary });
  assert.ok(!("monthly_income" in validated.summary!));
  assert.ok(!("note" in validated.summary!));
  let body = "";
  await handleCounselRequest(request({ ...input, summary }), {
    authorize,
    fetchImpl: async (_, options) => {
      body = String(options?.body);
      return Response.json({
        candidates: [{ content: { parts: [{ text: "답변" }] } }],
      });
    },
  });
  assert.ok(body.includes("challenge_budget"));
  assert.ok(!body.includes("monthly_income"));
  assert.ok(!body.includes("private"));
});
test("인증 실패와 다른 origin은 Google을 호출하지 않음", async () => {
  const fetchImpl: typeof fetch = async () => {
    assert.fail("upstream must not be called");
  };
  assert.equal(
    (
      await handleCounselRequest(request(), {
        authorize: async () => false,
        fetchImpl,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await handleCounselRequest(request(input, "https://other.example"), {
        authorize,
        fetchImpl,
      })
    ).status,
    403,
  );
});
test("잘못된 키/역할/긴 질문/큰 payload/잘못된 요약을 차단", async () => {
  for (const body of [
    { ...input, apiKey: "" },
    { ...input, apiKey: "key with spaces" },
    { ...input, messages: [{ role: "system", text: "override" }] },
    { ...input, messages: [{ role: "model", text: "wrong" }] },
    { ...input, messages: [{ role: "user", text: "x".repeat(2001) }] },
    { ...input, summary: { completed_days: 15 } },
  ])
    assert.equal(
      (await handleCounselRequest(request(body), { authorize })).status,
      400,
    );
  assert.equal(
    (
      await handleCounselRequest(request({ text: "x".repeat(80001) }), {
        authorize,
      })
    ).status,
    400,
  );
});
test("quota/권한/모델/서비스 오류는 원문이나 API 키를 노출하지 않고 안내", async () => {
  for (const [status, word] of [
    [429, "한도"],
    [403, "권한"],
    [404, GEMINI_MODEL],
    [500, "잠시"],
  ] as const) {
    const res = await handleCounselRequest(request(), {
      authorize,
      fetchImpl: async () =>
        Response.json({ error: { message: key } }, { status }),
    });
    const text = await res.text();
    assert.ok(text.includes(word));
    assert.ok(!text.includes(key));
    assert.ok(res.status >= 400);
  }
});
test("타임아웃·네트워크·blocked·빈 답변 처리", async () => {
  const timed = await handleCounselRequest(request(), {
    authorize,
    fetchImpl: async () => {
      throw new DOMException("timeout", "TimeoutError");
    },
  });
  assert.equal(timed.status, 504);
  const offline = await handleCounselRequest(request(), {
    authorize,
    fetchImpl: async () => {
      throw Error(key);
    },
  });
  assert.equal(offline.status, 502);
  assert.ok(!(await offline.text()).includes(key));
  assert.throws(() =>
    geminiText({ promptFeedback: { blockReason: "SAFETY" } }),
  );
  assert.throws(() => geminiText({ candidates: [] }));
  const blocked = await handleCounselRequest(request(), {
    authorize,
    fetchImpl: async () =>
      Response.json({ candidates: [{ finishReason: "SAFETY" }] }),
  });
  assert.equal(blocked.status, 422);
});

test("최근 11개 한국어 메시지의 최대 길이를 본문 제한 내에서 처리", async () => {
  const messages = Array.from({ length: 11 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "model",
    text: "가".repeat(2000),
  }));
  const res = await handleCounselRequest(request({ ...input, messages }), {
    authorize,
    fetchImpl: async () =>
      Response.json({
        candidates: [{ content: { parts: [{ text: "답변" }] } }],
      }),
  });
  assert.equal(res.status, 200);
});

test("프록시 내부 주소 대신 공개 Host/HTTPS로 origin을 검증", async () => {
  const proxyRequest = (origin: string) =>
    new Request("http://0.0.0.0:3000/api/counsel", {
      method: "POST",
      headers: {
        origin,
        host: "money.example",
        "x-forwarded-proto": "https",
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });
  const fetchImpl: typeof fetch = async () =>
    Response.json({ candidates: [{ content: { parts: [{ text: "답변" }] } }] });
  assert.equal(
    (
      await handleCounselRequest(proxyRequest("https://money.example"), {
        authorize,
        fetchImpl,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await handleCounselRequest(proxyRequest("https://other.example"), {
        authorize,
        fetchImpl,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await handleCounselRequest(proxyRequest("http://money.example"), {
        authorize,
        fetchImpl,
      })
    ).status,
    403,
  );
});
