import { afterEach, describe, expect, it, vi } from "vitest";
import { chatCompletion, isOmniRouteConfigured, parseCategoryReply, suggestCategory } from "./omniroute";

const categories = [
  { id: "food", name: "Food & Dining" },
  { id: "transport", name: "Transport" },
  { id: "home", name: "Home" },
];

function configure() {
  vi.stubEnv("OMNIROUTE_BASE_URL", "https://omniroute.test/v1/");
  vi.stubEnv("OMNIROUTE_API_KEY", "test-key");
  vi.stubEnv("OMNIROUTE_MODEL", "test-model");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("parseCategoryReply", () => {
  it("accepts an exact id, ignoring case and quoting", () => {
    expect(parseCategoryReply("food", categories)).toBe("food");
    expect(parseCategoryReply(' "Transport". ', categories)).toBe("transport");
  });

  it("accepts the category name instead of the id", () => {
    expect(parseCategoryReply("Food & Dining", categories)).toBe("food");
  });

  it("finds a single id mentioned in a sentence", () => {
    expect(parseCategoryReply("The best fit is home", categories)).toBe("home");
  });

  it("returns null for NONE, unknown, or ambiguous replies", () => {
    expect(parseCategoryReply("NONE", categories)).toBeNull();
    expect(parseCategoryReply("groceries", categories)).toBeNull();
    expect(parseCategoryReply("food or transport", categories)).toBeNull();
  });
});

describe("OmniRoute client", () => {
  it("is disabled until base URL, key and model are all set", () => {
    vi.stubEnv("OMNIROUTE_BASE_URL", "");
    vi.stubEnv("OMNIROUTE_API_KEY", "");
    vi.stubEnv("OMNIROUTE_MODEL", "");
    expect(isOmniRouteConfigured()).toBe(false);
    configure();
    expect(isOmniRouteConfigured()).toBe(true);
  });

  it("posts an OpenAI-compatible request and returns the reply", async () => {
    configure();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "transport" } }] })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(suggestCategory("Grab ride to work", "expense", categories)).resolves.toBe("transport");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://omniroute.test/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body)).toMatchObject({ model: "test-model", stream: false });
  });

  it("throws on a non-OK response", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 502 })));
    await expect(chatCompletion([{ role: "user", content: "hi" }])).rejects.toThrow("HTTP 502");
  });
});
