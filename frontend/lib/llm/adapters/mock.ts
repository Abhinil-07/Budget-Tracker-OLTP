import { LLMAdapter, ParseSplitsInput, RawSplitResult } from "../types";

export interface MockAdapterConfig {
  shouldFail?: boolean;
  failCount?: number;
  delayMs?: number;
  customResult?: RawSplitResult;
  supportsImages?: boolean;
}

export class MockAdapter implements LLMAdapter {
  name = "mock";
  supportsImages: boolean;
  private config: MockAdapterConfig;
  private callCount = 0;

  constructor(config: MockAdapterConfig = {}) {
    this.config = config;
    this.supportsImages = config.supportsImages ?? true;
  }

  setConfig(config: MockAdapterConfig) {
    this.config = config;
    if (config.supportsImages !== undefined) {
      this.supportsImages = config.supportsImages;
    }
  }

  getCallCount() {
    return this.callCount;
  }

  resetCallCount() {
    this.callCount = 0;
  }

  async parseSplits(
    input: ParseSplitsInput,
    model: string,
    apiKey: string,
    timeoutMs: number = 25000
  ): Promise<RawSplitResult> {
    this.callCount++;

    if (this.config.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delayMs));
    }

    if (this.config.shouldFail) {
      if (!this.config.failCount || this.callCount <= this.config.failCount) {
        throw new Error(`Mock adapter simulated failure (call #${this.callCount})`);
      }
    }

    if (this.config.customResult) {
      return this.config.customResult;
    }

    const text = (input.text || "").toLowerCase();
    const total = input.context.total_paise;
    const mePerson = input.context.people.find((p) => p.is_me) || input.context.people[0];
    const otherPerson = input.context.people.find((p) => !p.is_me) || mePerson;

    // Pattern 1: "all his" or "all other"
    if (text.includes("all his") || text.includes("all roommate")) {
      return {
        splits: [
          {
            person_name: otherPerson.name,
            amount_paise: total,
            note: "All allocated to other person",
          },
        ],
        reasoning: "Allocated entire amount to roommate",
      };
    }

    // Pattern 2: "all mine" or "all me"
    if (text.includes("all mine") || text.includes("all me")) {
      return {
        splits: [
          {
            person_name: mePerson.name,
            amount_paise: total,
            note: "100% self",
          },
        ],
        reasoning: "Allocated entire amount to self",
      };
    }

    // Pattern 3: "milk 50 me, sauce 200 half half" (or similar fixed split)
    // 50 INR to me = 5000 paise. 200 INR half = 10000 paise each.
    if (text.includes("milk 50") && text.includes("sauce 200")) {
      return {
        splits: [
          {
            person_name: mePerson.name,
            amount_paise: 15000,
            note: "Milk (₹50) + half of sauce (₹100)",
          },
          {
            person_name: otherPerson.name,
            amount_paise: 10000,
            note: "Half of sauce (₹100)",
          },
        ],
        reasoning: "Milk allocated to me, sauce split 50/50",
      };
    }

    // Default: 50/50 split between me and otherPerson
    const half = Math.floor(total / 2);
    const meShare = total - half; // Handles odd paise by giving remainder to me
    return {
      splits: [
        {
          person_name: mePerson.name,
          amount_paise: meShare,
          note: "50% split",
        },
        {
          person_name: otherPerson.name,
          amount_paise: half,
          note: "50% split",
        },
      ],
      reasoning: "Default equal 50/50 split between me and roommate",
    };
  }
}
