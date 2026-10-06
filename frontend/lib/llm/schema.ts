export const SPLIT_RESULT_JSON_SCHEMA = {
  type: "object",
  properties: {
    reasoning: {
      type: "string",
      description: "Step by step calculation of how items and remaining amounts were divided."
    },
    splits: {
      type: "array",
      description: "List of split items for each person involved. The sum of amount_paise MUST equal total_paise.",
      items: {
        type: "object",
        properties: {
          person_name: {
            type: "string",
            description: "Name or alias of the person (e.g. 'Me', 'Roommate', or the actual matched person name)."
          },
          amount_paise: {
            type: "integer",
            description: "Amount allocated to this person in integer paise (1 INR = 100 paise). NEVER float."
          },
          category: {
            type: "string",
            description: "Expense category (e.g. Food & Dining, Grocery, Shopping, Transport, Miscellaneous)."
          },
          note: {
            type: "string",
            description: "Short description of items or reason for this split."
          }
        },
        required: ["person_name", "amount_paise"],
        additionalProperties: false
      }
    }
  },
  required: ["splits"],
  additionalProperties: false
} as const;
