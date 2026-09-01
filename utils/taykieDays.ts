export const Days = {
  MON: 1 << 0,
  TUE: 1 << 1,
  WED: 1 << 2,
  THU: 1 << 3,
  FRI: 1 << 4,
  SAT: 1 << 5,
  SUN: 1 << 6,
};

export function buildDayMask(days: number[]) {
  return days.reduce((mask, d) => mask | d, 0);
}

export function parseDayMask(mask: number) {
  return {
    mon: !!(mask & Days.MON),
    tue: !!(mask & Days.TUE),
    wed: !!(mask & Days.WED),
    thu: !!(mask & Days.THU),
    fri: !!(mask & Days.FRI),
    sat: !!(mask & Days.SAT),
    sun: !!(mask & Days.SUN),
  };
}
