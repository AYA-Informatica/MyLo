/**
 * The one place the browser talks to the API.
 *
 * Responses are parsed through the shared Zod schema rather than cast. A cast
 * would let a contract change reach the screen as `undefined` inside a citation,
 * which for this product means an article rendered without the law it comes
 * from. Parsing turns that into a caught error instead.
 */
import {
  askResponseSchema,
  type AskRequest,
  type AskResponse,
} from "@mylo/domain";

export async function ask(request: AskRequest): Promise<AskResponse> {
  const res = await fetch("/api/v1/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new Error(`The service is unavailable (${res.status}).`);
  }

  const parsed = askResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error(
      "The service returned a response this version cannot read.",
    );
  }
  return parsed.data;
}

/**
 * Asks MyLo to remember a question it could not answer.
 *
 * Separate from `ask` and never called automatically. The audit trail records
 * every answer without asking, as a property of the system; this records one
 * question because the reader chose to hand it over. That difference is the
 * whole justification for storing the text at all, so it has to be an action
 * someone takes rather than a side effect of asking.
 */
export async function recordUnanswered(request: {
  question: string;
  language: string;
}): Promise<{ handle: string; expiresInDays: number }> {
  const res = await fetch("/api/v1/unanswered", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  if (res.status === 429) {
    throw new Error("rate_limited");
  }
  if (!res.ok) {
    throw new Error(`failed_${res.status}`);
  }
  return res.json();
}

/** Withdraws it again. The handle is the only way in, by design. */
export async function withdrawUnanswered(handle: string): Promise<void> {
  const res = await fetch(`/api/v1/unanswered/${encodeURIComponent(handle)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) throw new Error(`failed_${res.status}`);
}
