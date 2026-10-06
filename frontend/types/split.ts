export interface Person {
  id: string;
  user_id: string;
  name: string;
  is_me: boolean;
  aliases: string[];
  created_at: string;
}

export interface TransactionSplit {
  id: string;
  transaction_id: string;
  person_id: string;
  amount_paise: number;
  category?: string;
  note?: string;
  parsed_by?: string;
  created_at: string;
  person?: Person;
}

export interface Settlement {
  id: string;
  user_id: string;
  from_person: string;
  to_person: string;
  amount_paise: number;
  date: string;
  note?: string;
  created_at: string;
  from_person_details?: Person;
  to_person_details?: Person;
}

export interface MerchantDefault {
  id: string;
  user_id: string;
  merchant_pattern: string;
  default_split_rule: any;
  auto_approve_after_hours?: number;
  created_at: string;
}

export interface PersonBalance {
  person_id: string;
  user_id: string;
  name: string;
  aliases: string[];
  total_split_paise: number;
  total_repaid_paise: number;
  total_lent_paise: number;
  net_balance_paise: number;
}
