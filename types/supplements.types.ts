export type SupplementEventAction = "added" | "edited" | "removed";
export type SupplementEventSource = "api" | "seed" | "user_created";

export interface CreateSupplementEventRequest {
  deviceId?: string;
  market?: string;
  compartment?: number;
  action: SupplementEventAction;
  brand?: string;
  productName: string;
  category?: string;
  form?: string;
  doseQuantity?: string;
  schedule?: string;
  bottleQuantity?: number;
  source: SupplementEventSource;
  offId?: string;
}
