import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MessageSquare,
  RotateCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  fetchAllAssignedLeads,
  fetchAllBookings,
  fetchAllConversations,
  fetchAllHandoffs,
  fetchAllProjects,
  type LeadSource,
  type LeadStatus,
  type SalesLead,
} from "./api";
import type { SalesBooking, SalesConversation, SalesHandoff } from "./api";
import {
  ErrorState,
  Panel,
  PanelCount,
  PanelHeader,
  sourceLabel,
} from "./ui";
import { LeadFilters } from "./leads/LeadFilters";
import { LeadTable } from "./leads/LeadTable";
import { LeadCardList } from "./leads/LeadCardList";
import { LeadDetailDrawer } from "./leads/LeadDetailDrawer";
import {
  EMPTY_DATE_FILTER,
  buildLeadRow,
  leadMatchesSearch,
  matchesDateFilter,
  paginationWindow,
  sortLeadRows,
  titleCaseStatus,
} from "./leads/leadModel";
import type {
  DatePreset,
  LeadDateFilter,
  LeadRow,
  LeadSortKey,
  SortDirection,
} from "./leads/leadModel";

const PAGE_SIZE_OPTIONS = [8, 10, 20, 50];

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  ALL: "All time",
  TODAY: "Today",
  "7D": "Last 7 days",
  "30D": "Last 30 days",
  CUSTOM: "Custom range",
};

const SORT_LABELS: Record<LeadSortKey, string> = {
  buyer: "Buyer",
  project: "Project",
  source: "Source",
  status: "Status",
  priority: "Priority",
  lastInteraction: "Last interaction",
};

type ActivitySummary = {
  updatedAt: string | null;
  count: number;
};

function summariseActivity<T extends { updated_at: string }>(
  records: T[],
  leadIdOf: (record: T) => string,
): Map<string, ActivitySummary> {
  const result = new Map<string, ActivitySummary>();

  for (const record of records) {
    const leadId = leadIdOf(record);
    const existing = result.get(leadId);
    const time = new Date(record.updated_at).getTime();
    const existingTime = existing?.updatedAt
      ? new Date(existing.updatedAt).getTime()
      : Number.NEGATIVE_INFINITY;

    result.set(leadId, {
      updatedAt:
        time > existingTime && !Number.isNaN(time)
          ? record.updated_at
          : (existing?.updatedAt ?? null),
      count: (existing?.count ?? 0) + 1,
    });
  }

  return result;
}

function MetricCell({
  label,
  value,
  hint,
  icon: Icon,
  loading,
  error,
}: {
  label: string;
  value: number | undefined;
  hint: string;
  icon: typeof Users;
  loading: boolean;
  error: boolean;
}) {
  return (
    <div className="bg-charcoal px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[0.58rem] font-semibold tracking-[0.17em] text-ivory/60 uppercase">
          {label}
        </span>
        <Icon aria-hidden="true" className="size-3.5 shrink-0 text-sand" />
      </div>
      {loading ? (
        <>
          <span className="sr-only">Loading {label}</span>
          <div
            aria-hidden="true"
            className="mt-2 h-8 w-12 animate-pulse rounded bg-ivory/10 motion-reduce:animate-none"
          />
        </>
      ) : (
        <p className="mt-1.5 font-display text-[1.9rem] leading-none text-ivory">
          {error || value === undefined
            ? "—"
            : value.toLocaleString("en-IN")}
        </p>
      )}
      <p className="mt-1.5 text-[0.66rem] leading-4 text-ivory/55">
        {error ? "Unavailable right now" : hint}
      </p>
    </div>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/8 py-1 pr-1 pl-2.5 text-[0.64rem] font-semibold text-forest">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="grid size-5 place-items-center rounded-full transition-colors hover:bg-forest/15"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </span>
  );
}

function LeadTableSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading assigned leads</span>
      <div className="hidden divide-y divide-charcoal/8 lg:block">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[1.8fr_1.2fr_0.9fr_1fr_0.8fr_1fr_0.7fr] items-center gap-4 px-6 py-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="size-8 animate-pulse rounded-lg bg-charcoal/10 motion-reduce:animate-none" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-28 animate-pulse rounded-full bg-charcoal/10 motion-reduce:animate-none" />
                <div className="h-2 w-20 animate-pulse rounded-full bg-charcoal/5 motion-reduce:animate-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-24 animate-pulse rounded-full bg-charcoal/10 motion-reduce:animate-none" />
              <div className="h-2 w-16 animate-pulse rounded-full bg-charcoal/5 motion-reduce:animate-none" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-charcoal/8 motion-reduce:animate-none" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-charcoal/8 motion-reduce:animate-none" />
            <div className="h-5 w-14 animate-pulse rounded-full bg-charcoal/8 motion-reduce:animate-none" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-16 animate-pulse rounded-full bg-charcoal/10 motion-reduce:animate-none" />
              <div className="h-2 w-12 animate-pulse rounded-full bg-charcoal/5 motion-reduce:animate-none" />
            </div>
            <div className="ml-auto flex gap-1.5">
              <div className="size-9 animate-pulse rounded-lg bg-charcoal/8 motion-reduce:animate-none" />
              <div className="size-9 animate-pulse rounded-lg bg-charcoal/8 motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-charcoal/10 bg-white p-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="size-9 animate-pulse rounded-lg bg-charcoal/10 motion-reduce:animate-none" />
              <div className="space-y-1.5">
                <div className="h-3 w-28 animate-pulse rounded-full bg-charcoal/10 motion-reduce:animate-none" />
                <div className="h-2 w-20 animate-pulse rounded-full bg-charcoal/5 motion-reduce:animate-none" />
              </div>
            </div>
            <div className="h-2.5 w-full animate-pulse rounded-full bg-charcoal/5 motion-reduce:animate-none" />
            <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-charcoal/5 motion-reduce:animate-none" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-charcoal/8 motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const window = paginationWindow(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-charcoal/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[0.68rem] text-charcoal/65">
          Showing{" "}
          <span className="font-semibold text-charcoal">
            {start.toLocaleString("en-IN")}–{end.toLocaleString("en-IN")}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-charcoal">
            {totalItems.toLocaleString("en-IN")}
          </span>
        </p>
        <label className="inline-flex items-center gap-1.5 text-[0.66rem] text-charcoal/60">
          <span className="sr-only sm:not-sr-only">Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value))
            }
            aria-label="Rows per page"
            className="min-h-8 rounded-lg border border-charcoal/15 bg-white px-2 text-[0.68rem] font-semibold text-charcoal outline-none transition-colors focus:border-forest"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav
        aria-label="Lead pagination"
        className="flex items-center gap-1 self-end sm:self-auto"
      >
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 text-[0.66rem] font-semibold text-charcoal/75 transition-colors hover:border-forest/40 hover:text-forest disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {window.map((entry, index) =>
          entry === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="px-1 text-[0.66rem] text-charcoal/40"
            >
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              aria-label={`Page ${entry}`}
              aria-current={entry === page ? "page" : undefined}
              className={`inline-flex size-9 items-center justify-center rounded-lg border text-[0.68rem] font-semibold transition-colors ${
                entry === page
                  ? "border-forest bg-forest text-ivory"
                  : "border-charcoal/15 bg-white text-charcoal/70 hover:border-forest/40 hover:text-forest"
              }`}
            >
              {entry}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-charcoal/15 bg-white px-2.5 text-[0.66rem] font-semibold text-charcoal/75 transition-colors hover:border-forest/40 hover:text-forest disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </button>
      </nav>
    </div>
  );
}

export function SalesLeadsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "ALL">("ALL");
  const [source, setSource] = useState<LeadSource | "ALL">("ALL");
  const [dateFilter, setDateFilter] =
    useState<LeadDateFilter>(EMPTY_DATE_FILTER);
  const [sortKey, setSortKey] = useState<LeadSortKey>("lastInteraction");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSection, setDrawerSection] = useState<"details" | "history">(
    "details",
  );

  const deferredSearch = useDeferredValue(search);

  const leadsQuery = useQuery({
    queryKey: ["sales", "leads", "workspace"],
    queryFn: fetchAllAssignedLeads,
  });

  const projectsQuery = useQuery({
    queryKey: ["sales", "projects", "all"],
    queryFn: fetchAllProjects,
  });

  const conversationsQuery = useQuery({
    queryKey: ["sales", "conversations", "all"],
    queryFn: fetchAllConversations,
  });

  const bookingsQuery = useQuery({
    queryKey: ["sales", "bookings", "all"],
    queryFn: fetchAllBookings,
  });

  const handoffsQuery = useQuery({
    queryKey: ["sales", "handoffs", "all"],
    queryFn: fetchAllHandoffs,
  });

  const projectsById = useMemo(() => {
    const map = new Map(
      (projectsQuery.data ?? []).map((project) => [project.id, project]),
    );
    return map;
  }, [projectsQuery.data]);

  const conversationSummary = useMemo(
    () =>
      summariseActivity<SalesConversation>(
        conversationsQuery.data ?? [],
        (conversation) => conversation.lead_id,
      ),
    [conversationsQuery.data],
  );

  const bookingSummary = useMemo(
    () =>
      summariseActivity<SalesBooking>(
        bookingsQuery.data ?? [],
        (booking) => booking.lead_id,
      ),
    [bookingsQuery.data],
  );

  const handoffSummary = useMemo(
    () =>
      summariseActivity<SalesHandoff>(
        handoffsQuery.data ?? [],
        (handoff) => handoff.lead_id,
      ),
    [handoffsQuery.data],
  );

  const rows = useMemo<LeadRow[]>(() => {
    return (leadsQuery.data ?? []).map((lead: SalesLead) => {
      const conversations = conversationSummary.get(lead.id);
      const bookings = bookingSummary.get(lead.id);
      const handoffs = handoffSummary.get(lead.id);

      return buildLeadRow({
        lead,
        project: projectsById.get(lead.project_id) ?? null,
        conversationUpdatedAt: conversations?.updatedAt ?? null,
        bookingUpdatedAt: bookings?.updatedAt ?? null,
        handoffUpdatedAt: handoffs?.updatedAt ?? null,
        conversationCount: conversations?.count ?? 0,
        bookingCount: bookings?.count ?? 0,
        handoffCount: handoffs?.count ?? 0,
      });
    });
  }, [
    leadsQuery.data,
    projectsById,
    conversationSummary,
    bookingSummary,
    handoffSummary,
  ]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (status !== "ALL" ? 1 : 0) +
    (source !== "ALL" ? 1 : 0) +
    (dateFilter.preset !== "ALL" ? 1 : 0);

  const filteredRows = useMemo(() => {
    return rows.filter((lead) => {
      if (!leadMatchesSearch(lead, deferredSearch)) return false;
      if (status !== "ALL" && lead.status !== status) return false;
      if (source !== "ALL" && lead.source !== source) return false;
      if (!matchesDateFilter(lead.created_at, dateFilter)) return false;
      return true;
    });
  }, [rows, deferredSearch, status, source, dateFilter]);

  const sortedRows = useMemo(
    () => sortLeadRows(filteredRows, sortKey, sortDirection),
    [filteredRows, sortKey, sortDirection],
  );

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const isLoading = leadsQuery.isPending;
  const primaryError = leadsQuery.isError;
  const activityWarning =
    projectsQuery.isError ||
    conversationsQuery.isError ||
    bookingsQuery.isError ||
    handoffsQuery.isError;

  const metrics = useMemo(() => {
    const allRows = rows;
    return [
      {
        label: "Assigned leads",
        value: allRows.length,
        hint: "Your active portfolio",
        icon: Users,
      },
      {
        label: "New enquiries",
        value: allRows.filter((lead) => lead.status === "NEW").length,
        hint: "Awaiting first contact",
        icon: Sparkles,
      },
      {
        label: "Visits in motion",
        value: allRows.filter(
          (lead) =>
            lead.status === "VISIT_BOOKED" || lead.status === "VISITED",
        ).length,
        hint: "Booked or completed",
        icon: CalendarCheck,
      },
      {
        label: "Converted",
        value: allRows.filter((lead) => lead.status === "CONVERTED").length,
        hint: "Closed successfully",
        icon: CheckCheck,
      },
    ];
  }, [rows]);

  const openLead = useCallback((lead: LeadRow) => {
    setSelectedLead(lead);
    setDrawerSection("details");
    setDrawerOpen(true);
  }, []);

  const openConversation = useCallback((lead: LeadRow) => {
    setSelectedLead(lead);
    setDrawerSection("history");
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const resetFilters = useCallback(() => {
    setSearch("");
    setStatus("ALL");
    setSource("ALL");
    setDateFilter(EMPTY_DATE_FILTER);
    setPage(1);
  }, []);

  const handleSort = useCallback(
    (key: LeadSortKey) => {
      setPage(1);
      if (key === sortKey) {
        setSortDirection((direction) =>
          direction === "asc" ? "desc" : "asc",
        );
        return;
      }
      setSortKey(key);
      setSortDirection(
        key === "lastInteraction" ? "desc" : "asc",
      );
    },
    [sortKey],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sales", "leads"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "projects"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "conversations"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "bookings"] });
    queryClient.invalidateQueries({ queryKey: ["sales", "handoffs"] });
  }, [queryClient]);

  const refreshing =
    leadsQuery.isFetching ||
    projectsQuery.isFetching ||
    conversationsQuery.isFetching ||
    bookingsQuery.isFetching ||
    handoffsQuery.isFetching;

  const dateChipLabel =
    dateFilter.preset === "CUSTOM"
      ? `Received ${dateFilter.from || "…"} to ${dateFilter.to || "…"}`
      : DATE_PRESET_LABELS[dateFilter.preset];

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[0.64rem] font-semibold tracking-[0.22em] text-forest uppercase">
              Pipeline
            </p>
            <span aria-hidden="true" className="h-px w-6 bg-sand" />
            <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-medium text-charcoal/60">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-forest"
              />
              Live portfolio
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl leading-tight text-charcoal sm:text-4xl">
            My leads
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal/70">
            Every enquiry actively assigned to you, with the context needed to
            move the next conversation forward.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-charcoal/10 bg-white/70 px-3 text-[0.68rem] font-semibold text-charcoal/70">
            <ShieldCheck aria-hidden="true" className="size-4 text-forest" />
            Assignment-scoped
          </span>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh assigned leads"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-charcoal px-3.5 text-[0.7rem] font-semibold text-ivory transition-colors hover:bg-charcoal-soft"
          >
            <RotateCw
              aria-hidden="true"
              className={`size-3.5 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
            Refresh
          </button>
        </div>
      </header>

      <section
        aria-label="Portfolio pulse"
        className="relative overflow-hidden rounded-2xl bg-charcoal shadow-sm"
      >
        <div className="grid grid-cols-2 gap-px bg-ivory/10 sm:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCell
              key={metric.label}
              label={metric.label}
              value={isLoading ? undefined : metric.value}
              hint={metric.hint}
              icon={metric.icon}
              loading={isLoading}
              error={primaryError}
            />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -bottom-10 text-ivory/[0.04]"
        >
          <Users className="size-44" strokeWidth={0.8} />
        </div>
      </section>

      {activityWarning && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sand/40 bg-sand/10 px-4 py-2.5"
        >
          <p className="flex items-center gap-2 text-[0.7rem] font-medium text-charcoal/75">
            <AlertTriangle
              aria-hidden="true"
              className="size-4 shrink-0 text-clay"
            />
            Some project names or activity timestamps are temporarily
            unavailable.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="text-[0.68rem] font-semibold text-forest transition-colors hover:text-forest-deep"
          >
            Try again
          </button>
        </div>
      )}

      <LeadFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        source={source}
        onSourceChange={(value) => {
          setSource(value);
          setPage(1);
        }}
        dateFilter={dateFilter}
        onDateFilterChange={(value) => {
          setDateFilter(value);
          setPage(1);
        }}
        onReset={resetFilters}
        activeFilterCount={activeFilterCount}
        resultCount={sortedRows.length}
        totalCount={rows.length}
        loading={isLoading}
      />

      <Panel labelledBy="assigned-leads-heading">
        <PanelHeader
          eyebrow="Assigned portfolio"
          title="Your leads"
          id="assigned-leads-heading"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <PanelCount>
                {isLoading
                  ? "Loading"
                  : `${sortedRows.length.toLocaleString("en-IN")} ${
                      sortedRows.length === 1 ? "lead" : "leads"
                    }`}
              </PanelCount>
              {!isLoading && !primaryError && sortedRows.length > 0 && (
                <span className="hidden text-[0.64rem] text-charcoal/55 xl:inline">
                  Sorted by {SORT_LABELS[sortKey].toLowerCase()}{" "}
                  {sortDirection === "asc" ? "ascending" : "descending"}
                </span>
              )}
            </div>
          }
        />

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-charcoal/10 bg-ivory/40 px-4 py-2.5 sm:px-5">
            <span className="text-[0.58rem] font-semibold tracking-[0.15em] text-charcoal/50 uppercase">
              Active
            </span>
            {search.trim() && (
              <FilterChip
                label={`“${search.trim()}”`}
                onRemove={() => {
                  setSearch("");
                  setPage(1);
                }}
              />
            )}
            {status !== "ALL" && (
              <FilterChip
                label={titleCaseStatus(status)}
                onRemove={() => {
                  setStatus("ALL");
                  setPage(1);
                }}
              />
            )}
            {source !== "ALL" && (
              <FilterChip
                label={sourceLabel(source)}
                onRemove={() => {
                  setSource("ALL");
                  setPage(1);
                }}
              />
            )}
            {dateFilter.preset !== "ALL" && (
              <FilterChip
                label={dateChipLabel}
                onRemove={() => {
                  setDateFilter(EMPTY_DATE_FILTER);
                  setPage(1);
                }}
              />
            )}
          </div>
        )}

        {isLoading ? (
          <LeadTableSkeleton />
        ) : primaryError ? (
          <ErrorState
            message="Keylo could not retrieve the leads assigned to you."
            onRetry={() => leadsQuery.refetch()}
          />
        ) : sortedRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-10 text-center sm:px-6">
            <span className="grid size-11 place-items-center rounded-xl border border-charcoal/10 bg-ivory text-forest">
              {rows.length === 0 ? (
                <Inbox aria-hidden="true" className="size-5" />
              ) : (
                <Search aria-hidden="true" className="size-5" />
              )}
            </span>
            <p className="mt-3 text-sm font-semibold text-charcoal">
              {rows.length === 0
                ? "No leads assigned yet"
                : "No leads match these filters"}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-charcoal/65">
              {rows.length === 0
                ? "New enquiries assigned to you will appear here as soon as they arrive."
                : "Try a different name, contact, status, source or received date."}
            </p>
            {rows.length > 0 && activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-forest px-3 text-[0.7rem] font-semibold text-ivory transition-colors hover:bg-forest-deep"
              >
                <X aria-hidden="true" className="size-3.5" />
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-charcoal/10 px-4 py-2.5 lg:hidden">
              <span className="text-[0.62rem] font-semibold tracking-[0.12em] text-charcoal/55 uppercase">
                Sort
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={sortKey}
                  onChange={(event) =>
                    handleSort(event.target.value as LeadSortKey)
                  }
                  aria-label="Sort leads by"
                  className="min-h-9 rounded-lg border border-charcoal/15 bg-white px-2 text-[0.68rem] font-semibold text-charcoal outline-none transition-colors focus:border-forest"
                >
                  {(Object.keys(SORT_LABELS) as LeadSortKey[]).map((key) => (
                    <option key={key} value={key}>
                      {SORT_LABELS[key]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setSortDirection((direction) =>
                      direction === "asc" ? "desc" : "asc",
                    );
                  }}
                  aria-label={
                    sortDirection === "asc"
                      ? "Sort descending"
                      : "Sort ascending"
                  }
                  className="grid size-9 place-items-center rounded-lg border border-charcoal/15 bg-white text-charcoal/70 transition-colors hover:border-forest/40 hover:text-forest"
                >
                  {sortDirection === "asc" ? (
                    <ArrowUp aria-hidden="true" className="size-4" />
                  ) : (
                    <ArrowDown aria-hidden="true" className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="hidden lg:block">
              <LeadTable
                rows={pagedRows}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                onOpenLead={openLead}
                onOpenConversation={openConversation}
              />
            </div>
            <LeadCardList
              rows={pagedRows}
              onOpenLead={openLead}
              onOpenConversation={openConversation}
            />

            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={sortedRows.length}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </Panel>

      <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-[0.64rem] text-charcoal/45">
        <MessageSquare aria-hidden="true" className="size-3" />
        Open any lead to review the complete buyer record and enquiry history.
      </p>

      <LeadDetailDrawer
        lead={selectedLead}
        open={drawerOpen}
        initialSection={drawerSection}
        onClose={closeDrawer}
      />
    </div>
  );
}
