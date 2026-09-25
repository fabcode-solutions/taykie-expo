import { format } from "date-fns";
import type { LidDoseOption } from "@/services/api/device";

/** The user's calendar date for an instant, "YYYY-MM-DD". */
export function toLocalDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function toMinutes(hhmm: string): number | null {
  const [h, m] = hhmm.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/** Smallest gap in minutes between the open time and any of the dose's times. */
function distanceToOpen(dose: LidDoseOption, openedAt: Date): number {
  const openMinutes = openedAt.getHours() * 60 + openedAt.getMinutes();
  const gaps = dose.times
    .map(toMinutes)
    .filter((t): t is number => t !== null)
    .map((t) => Math.abs(t - openMinutes));
  return gaps.length > 0 ? Math.min(...gaps) : Number.POSITIVE_INFINITY;
}

/**
 * Doses ordered nearest-to-the-open-time first. Doses already marked taken go
 * last (they cannot be picked again); ties keep the server order.
 */
export function orderDosesByProximity(doses: LidDoseOption[], openedAt: Date): LidDoseOption[] {
  return doses
    .map((dose, index) => ({ dose, index, distance: distanceToOpen(dose, openedAt) }))
    .sort((a, b) => {
      if (a.dose.isTaken !== b.dose.isTaken) return a.dose.isTaken ? 1 : -1;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.index - b.index;
    })
    .map(({ dose }) => dose);
}
