import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { fetchBuyerBookings, type BuyerBooking } from "./api";

export function SiteVisitsPage() {
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["buyer", "bookings"],
    queryFn: () => fetchBuyerBookings(1, 20),
  });

  const bookings: BuyerBooking[] = bookingsData?.items || [];

  const formatSlotTime = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const date = s.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const startTime = s.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const endTime = e.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return { date, time: `${startTime} – ${endTime}` };
    } catch {
      return { date: startStr, time: endStr };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-semibold text-forest">
            <CheckCircle2 className="size-3" />
            Confirmed
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sand/25 px-2.5 py-0.5 text-xs font-semibold text-charcoal">
            <CheckCircle2 className="size-3 text-sand" />
            Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-charcoal/10 px-2.5 py-0.5 text-xs font-semibold text-charcoal/60">
            <XCircle className="size-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sand/20 px-2.5 py-0.5 text-xs font-semibold text-charcoal">
            <Clock className="size-3" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <span className="eyebrow">Property Tours</span>
        <h1 className="font-serif text-3xl font-normal text-charcoal sm:text-4xl">
          My Site Visits
        </h1>
        <p className="text-sm text-charcoal/70">
          Track upcoming and historical property visits scheduled with the on-site sales team.
        </p>
      </div>

      {/* Module 12 Notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-sand/40 bg-sand/10 p-5">
        <Sparkles className="size-5 shrink-0 text-sand mt-0.5" />
        <div className="text-xs text-charcoal/80 leading-relaxed">
          <strong className="font-semibold text-charcoal">Self-Serve Slot Booking:</strong>{" "}
          Interactive slot selection, instant rescheduling, and reminder preferences will connect in Module 12. All bookings created via concierge are synchronized below.
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {bookingsLoading ? (
          <div className="rounded-2xl border border-charcoal/10 bg-white p-12 text-center text-sm text-charcoal/60">
            Loading site visit appointments...
          </div>
        ) : bookings.length > 0 ? (
          bookings.map((booking) => {
            const { date, time } = formatSlotTime(
              booking.slot_start_time,
              booking.slot_end_time
            );

            return (
              <div
                key={booking.id}
                className="flex flex-col justify-between gap-6 rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xs transition-shadow hover:shadow-sm md:flex-row md:items-center"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-serif text-xl font-normal text-charcoal">
                      {date}
                    </span>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal/70">
                    <div className="flex items-center gap-1.5 font-medium text-forest">
                      <Clock className="size-3.5" />
                      <span>{time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-sand" />
                      <span>On-site Experience Center</span>
                    </div>
                  </div>

                  {booking.notes && (
                    <p className="text-xs text-charcoal/65 italic">
                      Special notes: “{booking.notes}”
                    </p>
                  )}

                  {booking.status === "CANCELLED" && booking.cancellation_reason && (
                    <p className="text-xs text-charcoal/60">
                      Reason for cancellation: <span className="italic">{booking.cancellation_reason}</span>
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col sm:flex-row md:flex-col gap-2">
                  <span className="text-[0.7rem] font-mono text-charcoal/50">
                    Booking #{booking.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-charcoal/20 bg-white p-12 text-center">
            <Calendar className="mx-auto size-10 text-charcoal/30" />
            <h3 className="mt-3 font-serif text-lg font-normal text-charcoal">
              No site visits scheduled
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-charcoal/60">
              You currently do not have any property tours booked. You can request a visit through your advisory thread.
            </p>
            <div className="mt-6">
              <Link
                to="/buyer"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-forest px-4 text-xs font-semibold text-ivory hover:bg-forest-deep"
              >
                <span>Back to Overview</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
