import {
  GEMINI_MODEL,
  validateCounselInput,
  geminiBody,
  geminiError,
  geminiText,
} from "./gemini";
const MAX_BODY_BYTES = 80000;
function response(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
async function readBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES)
    throw Error("요청이 너무 커요. 질문을 줄여주세요.");
  if (!request.body) throw Error("질문을 입력해주세요.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        throw Error("요청이 너무 커요. 질문을 줄여주세요.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(combined)) as unknown;
  } catch {
    throw Error("요청 형식을 확인해주세요.");
  }
}
// User-provided keys are used only for this request. Never log request bodies or upstream errors.
export async function handleCounselRequest(
  request: Request,
  {
    authorize,
    fetchImpl = fetch,
  }: { authorize: () => Promise<boolean>; fetchImpl?: typeof fetch },
) {
  // Next.js may use its internal bind address in request.url. Validate the
  // browser origin against the public Host and the reverse proxy's protocol.
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol === "https" || forwardedProtocol === "http"
      ? forwardedProtocol
      : url.protocol.slice(0, -1);
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(`${protocol}://${host}`).origin;
  } catch {
    return response({ error: "이 사이트의 상담 화면에서 요청해주세요." }, 403);
  }
  if (request.headers.get("origin") !== expectedOrigin)
    return response({ error: "이 사이트의 상담 화면에서 요청해주세요." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return response({ error: "요청 형식을 확인해주세요." }, 415);
  try {
    if (!(await authorize()))
      return response({ error: "로그인 후 다시 상담을 시작해주세요." }, 401);
  } catch {
    return response(
      { error: "로그인 상태를 확인하지 못했어요. 다시 시도해주세요." },
      503,
    );
  }
  let input;
  try {
    input = validateCounselInput(await readBody(request));
  } catch (error) {
    return response(
      {
        error:
          error instanceof Error ? error.message : "입력 내용을 확인해주세요.",
      },
      400,
    );
  }
  try {
    const upstream = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": input.apiKey,
        },
        body: JSON.stringify(geminiBody(input)),
        cache: "no-store",
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
      },
    );
    if (!upstream.ok)
      return response(
        { error: geminiError(upstream.status) },
        upstream.status === 429 ? 429 : 502,
      );
    let data: unknown;
    try {
      data = await upstream.json();
    } catch {
      return response(
        { error: "AI 답변을 읽지 못했어요. 다시 시도해주세요." },
        502,
      );
    }
    try {
      return response({ text: geminiText(data), model: GEMINI_MODEL });
    } catch (error) {
      return response(
        {
          error:
            error instanceof Error ? error.message : "답변을 받지 못했어요.",
        },
        422,
      );
    }
  } catch (error) {
    const timeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return response(
      {
        error: timeout
          ? "응답 시간이 길어졌어요. 잠시 후 다시 시도해주세요."
          : "AI에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.",
      },
      timeout ? 504 : 502,
    );
  }
}
