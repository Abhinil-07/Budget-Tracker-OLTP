export type SyncTriggerType = "scheduled" | "manual";
export type SyncStatusType = "success" | "failed" | "in_progress";

export interface SyncLog {
  id: string;
  triggered_at: string;
  trigger_type: SyncTriggerType;
  status: SyncStatusType;
  rows_exported?: number;
  error_message?: string;
  databricks_run_id?: number;
  completed_at?: string;
}

export interface SyncStatus {
  last_sync: SyncLog | null;
}
