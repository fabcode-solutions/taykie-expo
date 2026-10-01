import { ApiResponse } from "./api.types";

export interface ProductRequest {
  name: string;
  description?: string;
  dosage?: string;
  strength?: string;
  type?: "private" | "public";
  media?: string[];
  // Offer the supplement to the shared catalog. It is held as "pending" review and
  // stays private to the submitter until an admin approves it.
  submitForReview?: boolean;
  // Supplement details (all optional). Unit, form and market may be custom values.
  brandName?: string;
  primaryActiveIngredient?: string;
  dosageAmount?: number;
  dosageUnit?: string;
  deliveryForm?: string;
  targetMarket?: string;
  category?: string;
  barcodeGtin?: string;
}

export interface Medication {
  id: string;
  userId: string;
  type: string;
  dosage: string;
  strength: string;
  name: string;
  description: string;
  media: string[];
  isOther: boolean;
  createdAt: string;
  updatedAt: string;
  frequency?: string;
  timeOfDay?: string;
  reminders?: { push?: boolean; led?: boolean; sound?: boolean };
  // Present when this Medication was built from a SearchItem rather than
  // fetched from our own product list — see SearchModal/ScheduleModals'
  // supplement search flow. "api" items need a local product record created
  // before they can be scheduled, since their id is an OFF barcode, not ours.
  source?: "local" | "api" | "custom";
  // Unit of `strength` while a product is being edited/scheduled in the app.
  strengthUnit?: string;
  // Review state of a supplement the user submitted to the shared catalog.
  reviewStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  // Supplement catalog fields, set on admin-managed public products.
  brandName?: string | null;
  primaryActiveIngredient?: string | null;
  targetMarket?: string | null;
  deliveryForm?: string | null;
  brand?: string;
  category?: string;
  offId?: string;
}
export interface CreateLogRequest {
  note: string;
  status: string;
  logDate: string;
}

export type MedicationListResponse = ApiResponse<Medication[]>;
