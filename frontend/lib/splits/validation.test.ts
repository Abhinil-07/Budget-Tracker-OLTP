import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSplits, matchPerson } from "./validation";
import { PersonContext } from "../llm/types";

const mockPeople: PersonContext[] = [
  { id: "me-id-1", name: "Me", is_me: true, aliases: ["me", "myself", "i", "self"] },
  { id: "roommate-id-2", name: "Rohan", is_me: false, aliases: ["roommate", "rohan", "flatmate"] },
  { id: "friend-id-3", name: "Priya", is_me: false, aliases: ["priya", "pri"] },
];

describe("Split Validation Module", () => {
  it("successfully validates an exact 50/50 split", () => {
    const rawSplits = [
      { person_name: "me", amount_paise: 12500, note: "half" },
      { person_name: "roommate", amount_paise: 12500, note: "half" },
    ];
    const totalPaise = 25000; // ₹250.00

    const result = validateSplits(rawSplits, totalPaise, mockPeople);
    assert.equal(result.isValid, true);
    if (result.isValid) {
      assert.equal(result.mySharePaise, 12500);
      assert.equal(result.othersSharePaise, 12500);
      assert.equal(result.splits.length, 2);
      assert.equal(result.splits[0].person_id, "me-id-1");
      assert.equal(result.splits[1].person_id, "roommate-id-2");
      assert.match(result.summaryText, /Logged ✅ Your share: ₹125 \| Rohan owes you: ₹125/);
    }
  });

  it("handles complex itemized split matching total", () => {
    // ₹50 milk (me) + ₹200 sauce (split 50/50) = ₹150 me, ₹100 Rohan
    const rawSplits = [
      { person_name: "Me", amount_paise: 15000, note: "milk 50 + half sauce 100" },
      { person_name: "Rohan", amount_paise: 10000, note: "half sauce 100" },
    ];
    const totalPaise = 25000;

    const result = validateSplits(rawSplits, totalPaise, mockPeople);
    assert.equal(result.isValid, true);
    if (result.isValid) {
      assert.equal(result.mySharePaise, 15000);
      assert.equal(result.othersSharePaise, 10000);
    }
  });

  it("rejects when splits sum is less than debit and provides specific question", () => {
    const rawSplits = [
      { person_name: "Me", amount_paise: 10000 },
      { person_name: "Rohan", amount_paise: 13000 },
    ];
    const totalPaise = 25000; // sum is 23000 (₹230), debit is 25000 (₹250)

    const result = validateSplits(rawSplits, totalPaise, mockPeople);
    assert.equal(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.clarificationPrompt, /Splits add up to ₹230 but the debit is ₹250\. Who gets the remaining ₹20\?/);
    }
  });

  it("rejects when splits sum exceeds debit and provides specific question", () => {
    const rawSplits = [
      { person_name: "Me", amount_paise: 15000 },
      { person_name: "Rohan", amount_paise: 15000 },
    ];
    const totalPaise = 25000; // sum is 30000 (₹300), debit is 25000 (₹250)

    const result = validateSplits(rawSplits, totalPaise, mockPeople);
    assert.equal(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.clarificationPrompt, /Splits add up to ₹300, which exceeds the debit of ₹250 by ₹50/);
    }
  });

  it("rejects non-integer / float amounts strictly", () => {
    const rawSplits = [
      { person_name: "Me", amount_paise: 12500.5 as any },
      { person_name: "Rohan", amount_paise: 12499.5 as any },
    ];
    const totalPaise = 25000;

    const result = validateSplits(rawSplits, totalPaise, mockPeople);
    assert.equal(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.clarificationPrompt, /Amounts must be positive whole numbers in paise/);
    }
  });

  it("rejects unrecognized person with helpful guidance", () => {
    const rawSplits = [
      { person_name: "Unknown Guy", amount_paise: 25000 },
    ];
    const totalPaise = 25000;

    const result = validateSplits(rawSplits, totalPaise, mockPeople);
    assert.equal(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.clarificationPrompt, /I couldn't match 'Unknown Guy' to anyone in your known people list/);
    }
  });

  it("matches aliases correctly", () => {
    const matched = matchPerson("flatmate", mockPeople);
    assert.ok(matched);
    assert.equal(matched?.id, "roommate-id-2");
    assert.equal(matched?.name, "Rohan");
  });
});
