import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { parseSplits, getAdapter, ImageNotSupportedError } from "./registry";
import { MockAdapter } from "./adapters/mock";
import { ParseSplitsInput } from "./types";

const mockInput: ParseSplitsInput = {
  text: "milk 50 me, sauce 200 half half",
  context: {
    total_paise: 25000,
    merchant: "Zepto",
    people: [
      { id: "p1", name: "Me", is_me: true, aliases: ["me"] },
      { id: "p2", name: "Rohan", is_me: false, aliases: ["roommate"] },
    ],
  },
};

describe("LLM Registry & Fallback", () => {
  const mockAdapter = getAdapter("mock") as MockAdapter;

  beforeEach(() => {
    mockAdapter.resetCallCount();
    mockAdapter.setConfig({ shouldFail: false, supportsImages: true });
  });

  it("resolves primary adapter and parses splits successfully", async () => {
    const res = await parseSplits(mockInput, { provider: "mock", model: "mock-v1" });
    assert.equal(res.provider, "mock");
    assert.equal(res.model, "mock-v1");
    assert.equal(res.result.splits.length, 2);
    assert.equal(res.result.splits[0].amount_paise, 15000);
    assert.equal(res.result.splits[1].amount_paise, 10000);
  });

  it("retries once upon failure and succeeds", async () => {
    // Fail once, succeed on attempt 2
    mockAdapter.setConfig({ shouldFail: true, failCount: 1 });

    const res = await parseSplits(mockInput, { provider: "mock", model: "mock-v1" });
    assert.equal(mockAdapter.getCallCount(), 2);
    assert.equal(res.provider, "mock");
    assert.equal(res.result.splits.length, 2);
  });

  it("fails primary after retry and engages fallback provider", async () => {
    // Fail both attempts of primary, fallback succeeds
    mockAdapter.setConfig({ shouldFail: true, failCount: 2 });

    const res = await parseSplits(mockInput, {
      provider: "mock",
      model: "mock-primary",
      fallbackProvider: "mock",
      fallbackModel: "mock-fallback",
    });

    // 2 calls for primary + 1 call for fallback = 3 calls
    assert.equal(mockAdapter.getCallCount(), 3);
    assert.equal(res.provider, "mock");
    assert.equal(res.model, "mock-fallback");
  });

  it("rejects image input if adapter does not support images", async () => {
    mockAdapter.setConfig({ supportsImages: false });

    const inputWithImage: ParseSplitsInput = {
      ...mockInput,
      image: {
        base64: "dummybase64data",
        mimeType: "image/jpeg",
      },
    };

    await assert.rejects(
      async () => {
        await parseSplits(inputWithImage, { provider: "mock", model: "mock-v1" });
      },
      (err: any) => {
        assert.ok(err instanceof ImageNotSupportedError);
        assert.match(err.message, /does not support receipt images/);
        return true;
      }
    );
  });
});
