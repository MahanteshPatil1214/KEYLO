import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  Bot,
  CheckCircle2,
  FileText,
  Megaphone,
  Scale,
  Settings,
  Shield,
} from "lucide-react";
import type {
  AllSystemSettingsResponse,
  AuditLogListResponse,
  BroadcastNotificationPayload,
  NotificationTemplateItem,
  SystemNotificationListResponse,
  UpdateAIAssistantSettingsPayload,
  UpdateLanguageSettingsPayload,
  UpdateLeadAssignmentSettingsPayload,
  UpdateNotificationTemplatePayload,
  UpdateReminderSettingsPayload,
} from "./settingsModel";
import {
  broadcastSystemNotification,
  fetchAuditLogs,
  fetchNotificationTemplates,
  fetchSystemNotifications,
  fetchSystemSettings,
  resetNotificationTemplate,
  triggerRemindersScan,
  updateAIAssistantSettings,
  updateLanguageSettings,
  updateLeadAssignmentSettings,
  updateNotificationTemplate,
  updateReminderSettings,
} from "./api";
import { RemindersConfigTab } from "./settings/RemindersConfigTab";
import { SystemNotificationsTab } from "./settings/SystemNotificationsTab";
import { NotificationTemplatesTab } from "./settings/NotificationTemplatesTab";
import { AIAssistantSettingsTab } from "./settings/AIAssistantSettingsTab";
import { LeadAssignmentTab } from "./settings/LeadAssignmentTab";
import { AuditLogsTab } from "./settings/AuditLogsTab";

type SettingsTab =
  | "reminders"
  | "notifications"
  | "templates"
  | "ai_assistant"
  | "lead_assignment"
  | "audit_logs";

export function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("reminders");

  const [settings, setSettings] = useState<AllSystemSettingsResponse | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplateItem[]>([]);
  const [notificationsData, setNotificationsData] = useState<SystemNotificationListResponse | null>(null);
  const [logsData, setLogsData] = useState<AuditLogListResponse | null>(null);

  // Filters & Pagination
  const [notifPage, setNotifPage] = useState(1);
  const [notifType, setNotifType] = useState("ALL");
  const [notifSearch, setNotifSearch] = useState("");

  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState("ALL");
  const [auditSearch, setAuditSearch] = useState("");

  // Loading & Submitting flags
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load Settings
  const loadSettingsData = useCallback(async () => {
    try {
      const res = await fetchSystemSettings();
      setSettings(res);
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      setError(err?.message || "Failed to load system settings.");
    }
  }, []);

  // Load Templates
  const loadTemplatesData = useCallback(async () => {
    try {
      const res = await fetchNotificationTemplates();
      setTemplates(res.items);
    } catch (err: any) {
      console.error("Failed to load templates:", err);
    }
  }, []);

  // Load Notifications
  const loadNotificationsData = useCallback(async () => {
    try {
      const res = await fetchSystemNotifications({
        page: notifPage,
        pageSize: 15,
        type: notifType !== "ALL" ? notifType : undefined,
        search: notifSearch || undefined,
      });
      setNotificationsData(res);
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
    }
  }, [notifPage, notifType, notifSearch]);

  // Load Audit Logs
  const loadAuditLogsData = useCallback(async () => {
    try {
      const res = await fetchAuditLogs({
        page: auditPage,
        pageSize: 15,
        action: auditAction !== "ALL" ? auditAction : undefined,
        search: auditSearch || undefined,
      });
      setLogsData(res);
    } catch (err: any) {
      console.error("Failed to load audit logs:", err);
    }
  }, [auditPage, auditAction, auditSearch]);

  // Initial Load
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.allSettled([
        loadSettingsData(),
        loadTemplatesData(),
        loadNotificationsData(),
        loadAuditLogsData(),
      ]);
      setLoading(false);
    }
    init();
  }, [loadSettingsData, loadTemplatesData, loadNotificationsData, loadAuditLogsData]);

  // Tab change refreshes relevant tab data
  useEffect(() => {
    if (activeTab === "notifications") {
      loadNotificationsData();
    } else if (activeTab === "audit_logs") {
      loadAuditLogsData();
    } else if (activeTab === "templates") {
      loadTemplatesData();
    }
  }, [activeTab, loadNotificationsData, loadAuditLogsData, loadTemplatesData]);

  // Handlers
  const handleUpdateReminders = async (payload: UpdateReminderSettingsPayload) => {
    setIsSaving(true);
    try {
      const updated = await updateReminderSettings(payload);
      setSettings((prev) => (prev ? { ...prev, reminders: updated } : null));
      setToast("Site visit reminder configuration updated successfully.");
      loadAuditLogsData();
    } catch (err: any) {
      alert(err?.message || "Failed to save reminder settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerReminders = async () => {
    setIsTriggering(true);
    try {
      const res = await triggerRemindersScan();
      setToast(`Reminder scan complete. Dispatched ${res.dispatched_count} notifications.`);
      loadSettingsData();
      loadNotificationsData();
      loadAuditLogsData();
    } catch (err: any) {
      alert(err?.message || "Failed to trigger reminders scan.");
    } finally {
      setIsTriggering(false);
    }
  };

  const handleUpdateAI = async (payload: UpdateAIAssistantSettingsPayload) => {
    setIsSaving(true);
    try {
      const updated = await updateAIAssistantSettings(payload);
      setSettings((prev) => (prev ? { ...prev, ai_assistant: updated } : null));
      setToast("AI Assistant grounding and generation settings updated.");
      loadAuditLogsData();
    } catch (err: any) {
      alert(err?.message || "Failed to update AI settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLanguages = async (payload: UpdateLanguageSettingsPayload) => {
    setIsSaving(true);
    try {
      const updated = await updateLanguageSettings(payload);
      setSettings((prev) => (prev ? { ...prev, languages: updated } : null));
      setToast("Multilingual support languages updated successfully.");
      loadAuditLogsData();
    } catch (err: any) {
      alert(err?.message || "Failed to update language settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLeadAssignment = async (payload: UpdateLeadAssignmentSettingsPayload) => {
    setIsSaving(true);
    try {
      const updated = await updateLeadAssignmentSettings(payload);
      setSettings((prev) => (prev ? { ...prev, lead_assignment: updated } : null));
      setToast("Lead routing and assignment strategy updated.");
      loadAuditLogsData();
    } catch (err: any) {
      alert(err?.message || "Failed to update lead assignment rules.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTemplate = async (templateId: string, payload: UpdateNotificationTemplatePayload) => {
    setIsSaving(true);
    try {
      await updateNotificationTemplate(templateId, payload);
      setToast("Notification template updated successfully.");
      loadTemplatesData();
      loadAuditLogsData();
    } catch (err: any) {
      alert(err?.message || "Failed to update template.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetTemplate = async (templateId: string) => {
    setIsSaving(true);
    try {
      await resetNotificationTemplate(templateId);
      setToast("Notification template restored to system default wording.");
      loadTemplatesData();
      loadAuditLogsData();
    } catch (err: any) {
      alert(err?.message || "Failed to reset template.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBroadcast = async (payload: BroadcastNotificationPayload) => {
    setIsBroadcasting(true);
    try {
      const res = await broadcastSystemNotification(payload);
      setToast(res.message);
      loadNotificationsData();
      loadAuditLogsData();
    } finally {
      setIsBroadcasting(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "reminders", label: "Reminders & Alerts", icon: Bell },
    { id: "notifications", label: "System Notifications", icon: Megaphone },
    { id: "templates", label: "Notification Templates", icon: FileText },
    { id: "ai_assistant", label: "AI & Languages", icon: Bot },
    { id: "lead_assignment", label: "Lead Routing", icon: Scale },
    { id: "audit_logs", label: "Audit Trail", icon: Shield },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-charcoal px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-charcoal text-white">
              <Settings className="size-4" />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
              Notifications & System Settings
            </h1>
          </div>
          <p className="mt-1 text-xs text-charcoal/60 sm:text-sm">
            Configure site-visit reminders, notification templates, AI guardrails, lead routing rules, and audit logs
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertCircle className="size-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-charcoal/10 bg-charcoal/5 p-1.5 text-xs font-semibold">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 transition-all ${
                isActive
                  ? "bg-white text-charcoal shadow-xs"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="flex h-64 w-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="size-8 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
            <span className="text-xs text-charcoal/50">Loading settings and configuration...</span>
          </div>
        </div>
      ) : (
        <div>
          {activeTab === "reminders" && settings && (
            <RemindersConfigTab
              settings={settings.reminders}
              onUpdate={handleUpdateReminders}
              onTriggerScan={handleTriggerReminders}
              isSaving={isSaving}
              isTriggering={isTriggering}
            />
          )}

          {activeTab === "notifications" && (
            <SystemNotificationsTab
              notificationsData={notificationsData}
              loading={false}
              page={notifPage}
              onPageChange={setNotifPage}
              typeFilter={notifType}
              onTypeFilterChange={(val) => {
                setNotifType(val);
                setNotifPage(1);
              }}
              search={notifSearch}
              onSearchChange={(val) => {
                setNotifSearch(val);
                setNotifPage(1);
              }}
              onBroadcast={handleBroadcast}
              isBroadcasting={isBroadcasting}
            />
          )}

          {activeTab === "templates" && (
            <NotificationTemplatesTab
              templates={templates}
              loading={false}
              onUpdateTemplate={handleUpdateTemplate}
              onResetTemplate={handleResetTemplate}
              isSaving={isSaving}
            />
          )}

          {activeTab === "ai_assistant" && settings && (
            <AIAssistantSettingsTab
              aiSettings={settings.ai_assistant}
              langSettings={settings.languages}
              onUpdateAI={handleUpdateAI}
              onUpdateLanguages={handleUpdateLanguages}
              isSaving={isSaving}
            />
          )}

          {activeTab === "lead_assignment" && settings && (
            <LeadAssignmentTab
              settings={settings.lead_assignment}
              onUpdate={handleUpdateLeadAssignment}
              isSaving={isSaving}
            />
          )}

          {activeTab === "audit_logs" && (
            <AuditLogsTab
              logsData={logsData}
              loading={false}
              page={auditPage}
              onPageChange={setAuditPage}
              actionFilter={auditAction}
              onActionFilterChange={(val) => {
                setAuditAction(val);
                setAuditPage(1);
              }}
              search={auditSearch}
              onSearchChange={(val) => {
                setAuditSearch(val);
                setAuditPage(1);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
