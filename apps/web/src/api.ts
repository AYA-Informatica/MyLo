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
