import { SplitContext } from "./types";

export function buildSystemPrompt(): string {
  return `You are a precise expense split calculator and receipt parser.
Your job is to read the user's split instruction (and optional order screenshot/receipt), and calculate the exact split per person.

CRITICAL RULES:
1. CURRENCY IN PAISE:
   All money amounts must be represented in integer PAISE (1 INR = 100 paise). Never use floats.
   Example: ₹50.00 = 5000 paise, ₹250 = 25000 paise.

2. EXACT SUM CONSTRAINT:
   The sum of all splits[].amount_paise MUST SUM EXACTLY to the given transaction total_paise.
   If an equal split leaves an odd remainder of paise (e.g. 25001 split 2 ways = 12500 and 12501), assign the extra 1 paisa to "Me".

3. INTERPRETING INSTRUCTIONS:
   - "all mine" / "all me" -> 100% of total_paise allocated to "Me".
   - "all his" / "all [name]" -> 100% of total_paise allocated to [name].
   - "half half" / "50/50" / "split equal" -> 50% to "Me" and 50% to the other person (e.g. roommate).
   - "milk 50 me, sauce 200 half half" (total ₹250):
     * Milk ₹50 (5000 paise) to Me.
     * Sauce ₹200 (20000 paise) split 50/50 -> ₹100 to Me, ₹100 to other person.
     * Total Me: ₹150 (15000 paise), Other person: ₹100 (10000 paise). Sum = ₹250 (25000 paise).
   - "X for me, rest half half": Allocate X to Me, divide (Total - X) equally.

4. RECEIPTS & SCREENSHOTS:
   If an image/screenshot of an order (e.g. Zepto, Blinkit, Swiggy) is provided:
   - Identify line items, item prices, discounts, taxes, and delivery fees.
   - If the user specifies specific items (e.g. "chips mine, rest half"), assign those specific items to the person, and divide shared costs (or remainder) accordingly.

5. ENTITY MATCHING:
   - Use the known people list provided in context.
   - "me", "i", "mine", "myself" refers to the person with is_me = true.
   - Match names or aliases provided in context.

Output only valid JSON conforming strictly to the requested schema.`;
}

export function buildUserPrompt(
  text: string | undefined,
  context: SplitContext,
  hasImage: boolean
): string {
  const formattedPeople = context.people
    .map((p) => `- ${p.name} (ID: ${p.id}, is_me: ${p.is_me}, aliases: [${p.aliases.join(", ")}])`)
    .join("\n");

  const totalInr = (context.total_paise / 100).toFixed(2);

  return `Transaction Details:
- Merchant: ${context.merchant || "Unknown Merchant"}
- Total Amount: ₹${totalInr} (${context.total_paise} paise)

Known People in Database:
${formattedPeople}

User Split Instruction:
${text ? `"${text}"` : "(No text instruction provided, split based on receipt or equal split)"}

${hasImage ? "Note: An image of the order receipt/screenshot is attached. Please read the items from the image and apply the instruction." : ""}

Calculate the splits so that their sum in paise equals exactly ${context.total_paise} paise.`;
}
