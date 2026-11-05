import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Users,
} from "lucide-react";
import {
  fetchAvailableSlots,
  createBooking,
  type AvailableSlot,
  type BuyerBooking,
} from "../api";

type BookVisitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  leadId: string;
  onBookingConfirmed?: (booking: BuyerBooking) => void;
};

export function BookVisitModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  leadId,
  onBookingConfirmed,
}: BookVisitModalProps) {
  const queryClient = useQueryClient();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch genuine available slots
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["availableSlots", projectId],
    queryFn: () => fetchAvailableSlots(projectId),
    enabled: isOpen && Boolean(projectId),
  });

  const slots = slotsData?.items || [];

  const bookingMutation = useMutation({
    mutationFn: (slotId: string) =>
      createBooking({
        slot_id: slotId,
        lead_id: leadId,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (newBooking) => {
      queryClient.invalidateQueries({ queryKey: ["buyer", "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["buyer", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["availableSlots", projectId] });
      if (onBookingConfirmed) onBookingConfirmed(newBooking);
      onClose();
    },
    onError: (err: any) => {
      setSubmitError(err.message || "Failed to reserve site visit slot.");
    },
  });

  if (!isOpen) return null;

  const formatSlot = (slot: AvailableSlot) => {
    try {
      const s = new Date(slot.start_time);
      const e = new Date(slot.end_time);
      return {
        date: s.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: `${s.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })} – ${e.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}`,
      };
    } catch {
      return { date: slot.start_time, time: slot.end_time };
    }
  };

  const handleConfirm = () => {
    if (!selectedSlotId) return;
    setSubmitError(null);
    bookingMutation.mutate(selectedSlotId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-charcoal/15 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
          <div className="space-y-1">
            <span className="eyebrow">Real Estate Concierge</span>
            <h3 className="font-serif text-xl font-normal text-charcoal">
              Book a Site Visit
            </h3>
            <p className="text-xs text-charcoal/70">
              Project: <span className="font-semibold text-charcoal">{projectName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div className="text-xs text-charcoal/75">
            Select an officially verified available appointment slot below. Our on-site advisory team will be reserved exclusively for you.
          </div>

          {slotsLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-charcoal/60">
              <LoaderCircle className="size-4 animate-spin text-forest" />
              <span>Looking up genuinely available slots...</span>
            </div>
          ) : slots.length > 0 ? (
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {slots.map((slot) => {
                const { date, time } = formatSlot(slot);
                const isSelected = selectedSlotId === slot.id;

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setSubmitError(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-forest bg-forest/5 shadow-xs"
                        : "border-charcoal/10 hover:border-forest/40 hover:bg-ivory/30"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm font-medium text-charcoal">
                          {date}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="size-4 text-forest" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-forest font-medium">
                        <Clock className="size-3.5" />
                        <span>{time}</span>
                      </div>
                      {slot.notes && (
                        <p className="text-[0.68rem] text-charcoal/60 italic">
                          {slot.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-sand/20 px-2 py-0.5 text-[0.68rem] font-semibold text-charcoal">
                        <Users className="size-3 text-sand" />
                        {slot.available_capacity} left
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-charcoal/20 bg-ivory/30 p-6 text-center">
              <Calendar className="mx-auto size-8 text-charcoal/30" />
              <p className="mt-2 text-xs font-semibold text-charcoal">
                No open slots currently available
              </p>
              <p className="mt-1 text-[0.72rem] text-charcoal/60">
                All scheduled visit windows for this project are currently fully booked. You can request a callback via sales handoff.
              </p>
            </div>
          )}

          {/* Notes input */}
          {slots.length > 0 && (
            <div className="space-y-1.5">
              <label
                htmlFor="visit-notes"
                className="text-xs font-semibold text-charcoal/80"
              >
                Special Requirements or Floor Plan Preferences (Optional)
              </label>
              <textarea
                id="visit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Interested in 3 BHK sample flat walkthrough, vastu orientation..."
                className="w-full rounded-xl border border-charcoal/15 p-3 text-xs text-charcoal placeholder:text-charcoal/40 focus:border-forest focus:outline-none"
                rows={2}
                maxLength={500}
              />
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div className="flex items-center gap-2 rounded-lg bg-clay-soft/60 border border-clay/30 p-3 text-xs text-clay">
              <AlertCircle className="size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-charcoal/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-charcoal/15 px-4 py-2 text-xs font-semibold text-charcoal/70 hover:bg-charcoal/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedSlotId || bookingMutation.isPending}
            onClick={handleConfirm}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-xs font-semibold text-ivory shadow-xs hover:bg-forest-deep disabled:opacity-50"
          >
            {bookingMutation.isPending && (
              <LoaderCircle className="size-3.5 animate-spin" />
            )}
            <span>Confirm Site Visit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
