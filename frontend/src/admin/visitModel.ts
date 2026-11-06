export type AdminBookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type BookingItem = {
  id: string;
  slot_id: string;
  lead_id: string;
  project_id: string;
  buyer_id: string;
  executive_id: string | null;
  status: AdminBookingStatus;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  buyer_name: string;
  buyer_phone: string | null;
  buyer_email: string | null;
  slot_start_time: string;
  slot_end_time: string;
  project_name?: string | null;
  executive_name?: string | null;
};

export type BookingListResponse = {
  items: BookingItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type BookingMetrics = {
  total_visits: number;
  upcoming_visits: number;
  completed_visits: number;
  cancelled_visits: number;
  total_slots: number;
  active_slots: number;
  blocked_slots: number;
};

export type VisitSlotItem = {
  id: string;
  project_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string | null;
  booked_count?: number;
  available_capacity?: number;
};

export type VisitSlotListResponse = {
  items: VisitSlotItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type CreateSlotPayload = {
  project_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  notes?: string;
  is_active?: boolean;
};

export type UpdateSlotPayload = {
  start_time?: string;
  end_time?: string;
  capacity?: number;
  notes?: string;
  is_active?: boolean;
};

export type CancelBookingPayload = {
  cancellation_reason?: string;
};

export type RescheduleBookingPayload = {
  slot_id?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
};

export type UpdateBookingStatusPayload = {
  status: AdminBookingStatus;
  notes?: string;
};

export type ScheduleCustomBookingPayload = {
  lead_id: string;
  start_time: string;
  end_time: string;
  notes?: string;
};
