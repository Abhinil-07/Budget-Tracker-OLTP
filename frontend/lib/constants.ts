// lib/constants.ts

export const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "Healthcare",
  "Utilities",
  "Rent",
  "Salary",
  "Freelance",
  "Investment",
  "Transfer",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const ACCOUNT_TYPES = {
  savings: "Savings",
  current: "Current",
  credit_card: "Credit Card",
} as const;

export type AccountType = keyof typeof ACCOUNT_TYPES;
