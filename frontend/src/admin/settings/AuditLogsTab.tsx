import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Search,
  Shield,
  X,
} from "lucide-react";
import type { AuditLogItem, AuditLogListResponse } from "../settingsModel";

type AuditLogsTabProps = {
  logsData: AuditLogListResponse | null;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  actionFilter: string;
  onActionFilterChange: (a: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
};

export function AuditLogsTab({
  logsData,
  loading,
  page,
  onPageChange,
  actionFilter,
  onActionFilterChange,
  search,
  onSearchChange,
}: AuditLogsTabProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const items = logsData?.items || [];
  const total = logsData?.total || 0;
  const pages = logsData?.pages || 1;

  const formatActionName = (act: string) => {
    return act
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getActionBadge = (act: string) => {
    if (act.includes("REMINDER")) {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    if (act.includes("AI") || act.includes("LANGUAGE")) {
      return "bg-purple-50 text-purple-800 border-purple-200";
    }
    if (act.includes("ASSIGNMENT") || act.includes("LEAD")) {
      return "bg-blue-50 text-blue-800 border-blue-200";
    }
    if (act.includes("BROADCAST") || act.includes("NOTIFICATION")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    return "bg-charcoal/5 text-charcoal border-charcoal/10";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white/80 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-charcoal/40" />
            <input
              type="text"
              id="search-audit-logs-input"
              placeholder="Search action, admin name, email, or resource..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8.5 w-full rounded-xl border border-charcoal/15 bg-white pl-9 pr-3 text-xs text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-hidden"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-charcoal/15 bg-white px-2.5 py-1.5 text-xs">
            <Filter className="size-3 text-charcoal/50" />
            <select
              id="filter-audit-action"
              value={actionFilter}
              onChange={(e) => onActionFilterChange(e.target.value)}
              className="bg-transparent font-medium text-charcoal focus:outline-hidden"
            >
              <option value="ALL">All Actions</option>
              <option value="UPDATE_REMINDER_SETTINGS">Reminder Settings</option>
              <option value="TRIGGER_REMINDERS_SCAN">Reminders Trigger</option>
              <option value="UPDATE_AI_SETTINGS">AI Assistant Settings</option>
              <option value="UPDATE_LANGUAGES">Languages Update</option>
              <option value="UPDATE_ASSIGNMENT_RULES">Lead Routing Rules</option>
              <option value="UPDATE_TEMPLATE">Template Modified</option>
              <option value="RESET_TEMPLATE">Template Reset</option>
              <option value="BROADCAST_NOTIFICATION">Broadcast Announcement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-charcoal/10 bg-white/80 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-charcoal" />
            <h3 className="font-serif text-base font-bold text-charcoal">
              System Audit Trail & Administrative Accountability
            </h3>
            <span className="rounded-full bg-charcoal/5 px-2 py-0.5 text-[10px] font-semibold text-charcoal/70">
              {total} recorded events
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs">
            <thead>
              <tr className="border-b border-charcoal/10 text-[11px] font-semibold uppercase tracking-wider text-charcoal/60">
                <th className="pb-3 pl-1">Action</th>
                <th className="pb-3">Admin Actor</th>
                <th className="pb-3">Target Resource</th>
                <th className="pb-3">Change Summary</th>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3 pr-1 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5 font-medium text-charcoal">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-charcoal/50">
                    <div className="flex justify-center items-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
                      <span>Loading audit trail...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-charcoal/50">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                items.map((log) => (
                  <tr key={log.id} className="hover:bg-charcoal/[0.02] transition-colors">
                    <td className="py-3 pl-1">
                      <span className={`inline-block rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${getActionBadge(log.action)}`}>
                        {formatActionName(log.action)}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-charcoal">{log.actor_name}</span>
                        <span className="text-[11px] text-charcoal/50">{log.actor_email}</span>
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-charcoal/80">
                      {log.resource_type}
                      {log.resource_id ? ` : ${log.resource_id}` : ""}
                    </td>
                    <td className="py-3 max-w-xs truncate text-[11px] text-charcoal/70">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="py-3 text-charcoal/60 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 pr-1 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2 py-1 text-[11px] font-semibold text-charcoal hover:bg-charcoal/5"
                      >
                        <Eye className="size-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-charcoal/5 pt-3 text-xs">
            <span className="text-charcoal/60">
              Page {page} of {pages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-charcoal/15 p-1 text-charcoal hover:bg-charcoal/5 disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= pages}
                className="rounded-lg border border-charcoal/15 p-1 text-charcoal hover:bg-charcoal/5 disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-charcoal/10 pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-charcoal">
                  Audit Log Details
                </h3>
                <p className="text-[11px] text-charcoal/60">
                  {formatActionName(selectedLog.action)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-charcoal/50 hover:bg-charcoal/5 hover:text-charcoal"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs">
              <div>
                <span className="font-semibold text-charcoal/60 block">Actor</span>
                <span className="font-bold text-charcoal">{selectedLog.actor_name} ({selectedLog.actor_email})</span>
              </div>
              <div>
                <span className="font-semibold text-charcoal/60 block">Timestamp</span>
                <span className="text-charcoal">{new Date(selectedLog.created_at).toUTCString()}</span>
              </div>
              <div>
                <span className="font-semibold text-charcoal/60 block">Resource</span>
                <span className="text-charcoal">{selectedLog.resource_type} ({selectedLog.resource_id || "Global"})</span>
              </div>
              <div>
                <span className="font-semibold text-charcoal/60 block mb-1">Payload / Changes</span>
                <pre className="max-h-56 overflow-auto rounded-xl bg-charcoal/5 p-3 font-mono text-[11px] text-charcoal leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t border-charcoal/10 pt-3">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-charcoal px-4 py-2 text-xs font-semibold text-white shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
