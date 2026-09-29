import { ApiResponse } from "./api.types";

export interface ProductRequest {
  name: string;
  description?: string;
  dosage?: string;
  strength?: string;
  type?: "private" | "public";
  media?: string[];
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
