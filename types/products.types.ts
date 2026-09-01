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
}
export interface CreateLogRequest {
  note: string;
  status: string;
  logDate: string;
}

export type MedicationListResponse = ApiResponse<Medication[]>;
