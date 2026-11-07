export type ReminderSettings = {
  enabled_24h: boolean;
  enabled_2h: boolean;
  channels: string[];
  advance_hours_first: number;
  advance_hours_second: number;
  notify_buyer: boolean;
  notify_executive: boolean;
  last_run_at: string | null;
  last_run_dispatched_count: number;
};

export type UpdateReminderSettingsPayload = {
  enabled_24h?: boolean;
  enabled_2h?: boolean;
  channels?: string[];
  advance_hours_first?: number;
  advance_hours_second?: number;
  notify_buyer?: boolean;
  notify_executive?: boolean;
};

export type AIAssistantSettings = {
  grounding_mode: "STRICT_FACTS_ONLY" | "BALANCED";
  default_temperature: number;
  max_response_tokens: number;
  fallback_reply: string;
  unconfigured_project_reply: string;
  multilingual_auto_detect: boolean;
};

export type UpdateAIAssistantSettingsPayload = {
  grounding_mode?: "STRICT_FACTS_ONLY" | "BALANCED";
  default_temperature?: number;
  max_response_tokens?: number;
  fallback_reply?: string;
  unconfigured_project_reply?: string;
  multilingual_auto_detect?: boolean;
};

export type LanguageItem = {
  code: string;
  name: string;
  native_name: string;
  is_default: boolean;
  is_enabled: boolean;
};

export type LanguageSettings = {
  languages: LanguageItem[];
};

export type UpdateLanguageSettingsPayload = {
  languages: LanguageItem[];
};

export type LeadAssignmentSettings = {
  strategy: "ROUND_ROBIN" | "LOAD_BALANCED" | "MANUAL_ONLY";
  working_hours_enabled: boolean;
  working_hours_start: string;
  working_hours_end: string;
  unreached_sla_hours: number;
  auto_reassignment_enabled: boolean;
  fallback_executive_id: string | null;
};

export type UpdateLeadAssignmentSettingsPayload = {
  strategy?: "ROUND_ROBIN" | "LOAD_BALANCED" | "MANUAL_ONLY";
  working_hours_enabled?: boolean;
  working_hours_start?: string;
  working_hours_end?: string;
  unreached_sla_hours?: number;
  auto_reassignment_enabled?: boolean;
  fallback_executive_id?: string | null;
};

export type AllSystemSettingsResponse = {
  reminders: ReminderSettings;
  ai_assistant: AIAssistantSettings;
  languages: LanguageSettings;
  lead_assignment: LeadAssignmentSettings;
};

export type NotificationTemplateItem = {
  id: string;
  name: string;
  type: string;
  channel: string;
  title_template: string;
  body_template: string;
  variables: string[];
  is_active: boolean;
  updated_at: string;
  updated_by_name?: string | null;
};

export type NotificationTemplateListResponse = {
  items: NotificationTemplateItem[];
  total: number;
};

export type UpdateNotificationTemplatePayload = {
  title_template: string;
  body_template: string;
  is_active?: boolean;
};

export type AuditLogItem = {
  id: string;
  action: string;
  actor_id: string | null;
  actor_name: string;
  actor_email: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  created_at: string;
};

export type AuditLogListResponse = {
  items: AuditLogItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type AuditLogQueryParams = {
  page?: number;
  pageSize?: number;
  action?: string;
  resourceType?: string;
  search?: string;
};

export type SystemNotificationItem = {
  id: string;
  user_id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_role: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type SystemNotificationListResponse = {
  items: SystemNotificationItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type SystemNotificationQueryParams = {
  page?: number;
  pageSize?: number;
  type?: string;
  isRead?: boolean;
  search?: string;
};

export type BroadcastNotificationPayload = {
  title: string;
  message: string;
  target_role: "ALL" | "SALES_EXECUTIVE" | "BUYER" | "ADMIN";
};

export type BroadcastNotificationResponse = {
  dispatched_count: number;
  message: string;
};
