import { RawSplitItem, PersonContext } from "../llm/types";

export interface ValidatedSplitItem {
  person_id: string;
  person_name: string;
  is_me: boolean;
  amount_paise: number;
  category?: string;
  note?: string;
}

export interface ValidationSuccess {
  isValid: true;
  splits: ValidatedSplitItem[];
  mySharePaise: number;
  othersSharePaise: number;
  summaryText: string;
}

export interface ValidationFailure {
  isValid: false;
  clarificationPrompt: string;
  reason: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

function formatPaiseToInr(paise: number): string {
  const inr = Math.abs(paise) / 100;
  return `₹${inr % 1 === 0 ? inr.toFixed(0) : inr.toFixed(2)}`;
}

export function matchPerson(nameOrAlias: string, knownPeople: PersonContext[]): PersonContext | undefined {
  const normalized = nameOrAlias.trim().toLowerCase();

  // 1. Direct "me" aliases
  if (["me", "myself", "i", "self", "mine"].includes(normalized)) {
    return knownPeople.find((p) => p.is_me);
  }

  // 2. Exact or normalized name match
  const nameMatch = knownPeople.find((p) => p.name.trim().toLowerCase() === normalized);
  if (nameMatch) return nameMatch;

  // 3. Check alias list
  const aliasMatch = knownPeople.find((p) =>
    p.aliases.some((alias) => alias.trim().toLowerCase() === normalized)
  );
  if (aliasMatch) return aliasMatch;

  // 4. Substring / first-name match
  const partialMatch = knownPeople.find(
    (p) =>
      p.name.toLowerCase().startsWith(normalized) ||
      normalized.startsWith(p.name.toLowerCase())
  );
  return partialMatch;
}

export function validateSplits(
  rawSplits: RawSplitItem[],
  totalPaise: number,
  knownPeople: PersonContext[]
): ValidationResult {
  if (!rawSplits || !Array.isArray(rawSplits) || rawSplits.length === 0) {
    return {
      isValid: false,
      reason: "Empty or missing splits array",
      clarificationPrompt: "I couldn't identify any splits from your message. How would you like to split this expense?",
    };
  }

  const validatedItems: ValidatedSplitItem[] = [];
  let sumPaise = 0;

  for (const item of rawSplits) {
    // 1. Integer check
    if (
      typeof item.amount_paise !== "number" ||
      !Number.isInteger(item.amount_paise) ||
      item.amount_paise <= 0
    ) {
      return {
        isValid: false,
        reason: `Invalid amount: ${item.amount_paise} for ${item.person_name}`,
        clarificationPrompt: `Invalid amount '${item.amount_paise}' for ${item.person_name}. Amounts must be positive whole numbers in paise. Could you clarify?`,
      };
    }

    // 2. Match person
    const matchedPerson = matchPerson(item.person_name, knownPeople);
    if (!matchedPerson) {
      const knownNames = knownPeople.map((p) => p.name).join(", ");
      return {
        isValid: false,
        reason: `Unrecognized person: '${item.person_name}'`,
        clarificationPrompt: `I couldn't match '${item.person_name}' to anyone in your known people list (${knownNames}). Who should this be assigned to?`,
      };
    }

    sumPaise += item.amount_paise;
    validatedItems.push({
      person_id: matchedPerson.id,
      person_name: matchedPerson.name,
      is_me: matchedPerson.is_me,
      amount_paise: item.amount_paise,
      category: item.category,
      note: item.note,
    });
  }

  // 3. Exact sum constraint
  if (sumPaise !== totalPaise) {
    const sumFormatted = formatPaiseToInr(sumPaise);
    const totalFormatted = formatPaiseToInr(totalPaise);

    if (sumPaise < totalPaise) {
      const diffFormatted = formatPaiseToInr(totalPaise - sumPaise);
      return {
        isValid: false,
        reason: `Splits sum (${sumPaise}p) less than total debit (${totalPaise}p)`,
        clarificationPrompt: `Splits add up to ${sumFormatted} but the debit is ${totalFormatted}. Who gets the remaining ${diffFormatted}?`,
      };
    } else {
      const diffFormatted = formatPaiseToInr(sumPaise - totalPaise);
      return {
        isValid: false,
        reason: `Splits sum (${sumPaise}p) exceeds total debit (${totalPaise}p)`,
        clarificationPrompt: `Splits add up to ${sumFormatted}, which exceeds the debit of ${totalFormatted} by ${diffFormatted}. How should this be adjusted?`,
      };
    }
  }

  // Calculate shares
  let mySharePaise = 0;
  let othersSharePaise = 0;
  const perPersonBreakdown: Record<string, number> = {};

  for (const item of validatedItems) {
    if (item.is_me) {
      mySharePaise += item.amount_paise;
    } else {
      othersSharePaise += item.amount_paise;
      perPersonBreakdown[item.person_name] =
        (perPersonBreakdown[item.person_name] || 0) + item.amount_paise;
    }
  }

  // Generate clean summary text for Telegram reply
  // Format: "Logged ✅ You paid: ₹250. Your share: ₹150. Roommate owes you: ₹100."
  const breakdownParts = Object.entries(perPersonBreakdown).map(
    ([name, amount]) => `${name} owes you: ${formatPaiseToInr(amount)}`
  );

  const breakdownStr = breakdownParts.length > 0 ? breakdownParts.join(", ") : "All yours";
  const summaryText = `Logged ✅ Your share: ${formatPaiseToInr(mySharePaise)} | ${breakdownStr}`;

  return {
    isValid: true,
    splits: validatedItems,
    mySharePaise,
    othersSharePaise,
    summaryText,
  };
}
