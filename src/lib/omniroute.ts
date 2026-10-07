import "server-only";

/**
 * OmniRoute client. OmniRoute is a self-hosted AI gateway that exposes one
 * OpenAI-compatible endpoint in front of many LLM providers, so the app only
 * speaks the `/chat/completions` protocol and the gateway decides which
 * provider/model actually answers.
 *
 * Configure with:
 *   OMNIROUTE_BASE_URL  e.g. https://omniroute.example.com/v1
 *   OMNIROUTE_API_KEY   an API key issued by your OmniRoute dashboard
 *   OMNIROUTE_MODEL     model or combo name routed by OmniRoute
 *
 * AI features stay disabled (and are hidden in the UI) until all three are set.
 */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type OmniRouteConfig = { baseUrl: string; apiKey: string; model: string };

function getConfig(): OmniRouteConfig | null {
  const baseUrl = process.env.OMNIROUTE_BASE_URL?.trim().replace(/\/+$/, "");
  const apiKey = process.env.OMNIROUTE_API_KEY?.trim();
  const model = process.env.OMNIROUTE_MODEL?.trim();
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl, apiKey, model };
}

export function isOmniRouteConfigured(): boolean {
  return getConfig() !== null;
}

export class OmniRouteError extends Error {}

/** Send a chat completion through OmniRoute and return the assistant text. */
export async function chatCompletion(messages: ChatMessage[], options: { maxTokens?: number; timeoutMs?: number } = {}): Promise<string> {
  const config = getConfig();
  if (!config) throw new OmniRouteError("OmniRoute is not configured.");
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.model, messages, temperature: 0, max_tokens: options.maxTokens ?? 50, stream: false }),
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });
  } catch (error) {
    throw new OmniRouteError(`OmniRoute request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) throw new OmniRouteError(`OmniRoute responded with HTTP ${response.status}.`);
  const body = (await response.json().catch(() => null)) as { choices?: Array<{ message?: { content?: unknown } }> } | null;
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new OmniRouteError("OmniRoute returned an unexpected response.");
  return content;
}

export type CategoryCandidate = { id: string; name: string };

export function buildCategoryPrompt(note: string, type: "expense" | "income", categories: CategoryCandidate[]): ChatMessage[] {
  const list = categories.map((category) => `- ${category.id}: ${category.name}`).join("\n");
  return [
    {
      role: "system",
      content: "You categorize household budget transactions. Reply with exactly one category id from the provided list and nothing else. If none fits, reply with NONE.",
    },
    { role: "user", content: `Transaction type: ${type}\nDescription: ${note}\n\nCategories (id: name):\n${list}` },
  ];
}

/**
 * Map the model's free-text reply back onto a known category id. Tolerates
 * quoting, punctuation, or the model answering with the name instead of the id;
 * returns null rather than ever inventing a category.
 */
export function parseCategoryReply(reply: string, categories: CategoryCandidate[]): string | null {
  const cleaned = reply.trim().replace(/^["'`\s-]+|["'`.\s]+$/g, "").toLowerCase();
  if (!cleaned || cleaned === "none") return null;
  const exact = categories.find((category) => category.id.toLowerCase() === cleaned || category.name.toLowerCase() === cleaned);
  if (exact) return exact.id;
  const mentioned = categories.filter((category) => cleaned.includes(category.id.toLowerCase()));
  return mentioned.length === 1 ? mentioned[0].id : null;
}

export async function suggestCategory(note: string, type: "expense" | "income", categories: CategoryCandidate[]): Promise<string | null> {
  if (!categories.length) return null;
  const reply = await chatCompletion(buildCategoryPrompt(note, type, categories));
  return parseCategoryReply(reply, categories);
}
