/**
 * One generate() over two backends, so local and hosted models are scored by
 * exactly the same harness and the numbers are comparable.
 *
 * Routing is by model id: anything containing "/" is an OpenRouter id
 * (`google/gemma-4-31b-it:free`), anything else is a local Ollama tag
 * (`gemma3:4b`).
 *
 * The OpenRouter key is read from the environment only. It is never written to
 * a file the repository tracks — a key pasted into a chat or committed to git
 * should be treated as public from that moment.
 */
const OLLAMA = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";

const isHosted = (model) => model.includes("/");

async function generateOllama(model, prompt, { maxTokens }) {
  const res = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      // Reasoning models otherwise spend the whole budget thinking and return
      // an empty answer, which reads as a capability result but is an artefact.
      think: false,
      options: { temperature: 0, num_predict: maxTokens },
    }),
  });
  if (!res.ok)
    throw new Error(
      `ollama ${res.status}: ${(await res.text()).slice(0, 160)}`,
    );
  const body = await res.json();
  return { text: body.response ?? "", tokens: body.eval_count ?? 0 };
}

async function generateOpenRouter(model, prompt, { maxTokens }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch(OPENROUTER, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://github.com/AYA-Informatica/MyLo",
      "X-Title": "MyLo Kinyarwanda evaluation",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      // Match the local runs: greedy, same ceiling, so the comparison is fair.
      temperature: 0,
      max_tokens: maxTokens,
      // Free endpoints are rate-limited and occasionally drop a provider;
      // letting OpenRouter fall back keeps a long run from dying on one blip.
      route: "fallback",
    }),
  });

  if (!res.ok)
    throw new Error(
      `openrouter ${res.status}: ${(await res.text()).slice(0, 160)}`,
    );
  const body = await res.json();
  if (body.error)
    throw new Error(`openrouter: ${JSON.stringify(body.error).slice(0, 160)}`);

  const choice = body.choices?.[0]?.message;
  // Some hosted reasoning models return their chain separately; the answer is
  // the content field, and reasoning is deliberately discarded.
  const text = choice?.content ?? "";
  return { text, tokens: body.usage?.completion_tokens ?? 0 };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @returns {Promise<{text: string, tokens: number, seconds: number}>}
 *
 * Hosted free endpoints are shared and frequently return 429 or a transient
 * upstream error. Those are queueing artefacts, not model behaviour, so they are
 * retried with backoff rather than being allowed to score as failures — a
 * rate-limited request recorded as an empty answer would understate the model.
 */
export async function generate(
  model,
  prompt,
  { maxTokens = 1024, retries = 4 } = {},
) {
  const started = Date.now();
  const fn = isHosted(model) ? generateOpenRouter : generateOllama;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { text, tokens } = await fn(model, prompt, { maxTokens });
      return {
        text: (text ?? "").trim(),
        tokens,
        seconds: (Date.now() - started) / 1000,
      };
    } catch (err) {
      lastError = err;
      const transient = /\b(429|408|5\d\d)\b|rate.?limit|temporarily/i.test(
        String(err.message),
      );
      if (!transient || attempt === retries) break;
      await sleep(3000 * 2 ** attempt); // 3s, 6s, 12s, 24s
    }
  }
  throw lastError;
}

/** Strips reasoning blocks and a leading restatement some models emit. */
export const tidy = (s) =>
  s
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(
      /^\s*(kinyarwanda|ikinyarwanda|translation|traduction)\s*:\s*/i,
      "",
    )
    .trim();
