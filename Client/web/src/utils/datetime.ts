const DEFAULT_SCHEDULING_TIMEZONE = "America/Phoenix";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function parseDayKey(dayKey: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseTimeKey(timeKey: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(timeKey);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes, fallback: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? fallback);

  return {
    year: read("year", "0"),
    month: read("month", "1"),
    day: read("day", "1"),
    hour: read("hour", "0"),
    minute: read("minute", "0"),
  };
}

function utcComparable(parts: ZonedParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
}

export function getSchedulingTimeZone(): string {
  return import.meta.env.VITE_AVAILABILITY_TIMEZONE || DEFAULT_SCHEDULING_TIMEZONE;
}

export function zonedDateTimeToIso(dayKey: string, timeKey: string, timeZone = getSchedulingTimeZone()): string | undefined {
  const day = parseDayKey(dayKey);
  const time = parseTimeKey(timeKey);
  if (!day || !time) {
    return undefined;
  }

  const targetComparable = Date.UTC(day.year, day.month - 1, day.day, time.hour, time.minute, 0, 0);
  let current = targetComparable;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const diff = targetComparable - utcComparable(zonedParts(new Date(current), timeZone));
    if (diff === 0) {
      return new Date(current).toISOString();
    }
    current += diff;
  }

  return new Date(current).toISOString();
}

export function datetimeLocalInTimeZoneToIso(value?: string, timeZone = getSchedulingTimeZone()): string | undefined {
  if (!value) return undefined;
  const [dayKey, timeKey] = value.split("T");
  if (!dayKey || !timeKey) return undefined;
  return zonedDateTimeToIso(dayKey, timeKey, timeZone);
}

export function addDaysToDayKey(dayKey: string, days: number): string {
  const parts = parseDayKey(dayKey);
  if (!parts) return dayKey;
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 0, 0, 0, 0));
  return `${next.getUTCFullYear().toString().padStart(4, "0")}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function buildInclusiveDayRange(startDayKey: string, endDayKey: string): string[] {
  if (!parseDayKey(startDayKey) || !parseDayKey(endDayKey) || startDayKey > endDayKey) {
    return [];
  }

  const days: string[] = [];
  let current = startDayKey;
  while (current <= endDayKey) {
    days.push(current);
    current = addDaysToDayKey(current, 1);
  }
  return days;
}
