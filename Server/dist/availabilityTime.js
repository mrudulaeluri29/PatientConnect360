"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailabilityTimeZone = getAvailabilityTimeZone;
exports.addDaysToDayKey = addDaysToDayKey;
exports.dateTimeInTimeZoneToUtc = dateTimeInTimeZoneToUtc;
exports.dayKeyToStoredAvailabilityDate = dayKeyToStoredAvailabilityDate;
exports.timeZoneDayKeyToUtcRange = timeZoneDayKeyToUtcRange;
exports.dayKeyInTimeZone = dayKeyInTimeZone;
exports.wallClockMinutesInTimeZone = wallClockMinutesInTimeZone;
/**
 * Availability slots store startTime/endTime as local wall-clock "HH:MM" for a calendar date.
 * Visits store scheduledAt as a UTC instant — compare using the same IANA zone clinicians/admin
 * intend (set AVAILABILITY_TIMEZONE in Server .env to your org’s zone, e.g. America/Chicago).
 */
function getAvailabilityTimeZone() {
    return process.env.AVAILABILITY_TIMEZONE || "America/New_York";
}
function parseDayKey(dayKey) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
    if (!match) {
        throw new Error(`Invalid day key: ${dayKey}`);
    }
    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
    };
}
function parseTimeKey(timeKey) {
    const match = /^(\d{2}):(\d{2})$/.exec(timeKey);
    if (!match) {
        throw new Error(`Invalid time key: ${timeKey}`);
    }
    return {
        hour: Number(match[1]),
        minute: Number(match[2]),
    };
}
function zonedParts(date, timeZone) {
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
    const read = (type, fallback) => Number(parts.find((part) => part.type === type)?.value ?? fallback);
    return {
        year: read("year", "0"),
        month: read("month", "1"),
        day: read("day", "1"),
        hour: read("hour", "0"),
        minute: read("minute", "0"),
    };
}
function utcComparableFromParts(parts) {
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
}
function formatDayKey(year, month, day) {
    return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}
function addDaysToDayKey(dayKey, days) {
    const { year, month, day } = parseDayKey(dayKey);
    const next = new Date(Date.UTC(year, month - 1, day + days, 0, 0, 0, 0));
    return formatDayKey(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}
/**
 * Converts an org-local date + wall-clock time into a UTC instant.
 * This keeps schedule semantics anchored to AVAILABILITY_TIMEZONE instead of the caller's machine timezone.
 */
function dateTimeInTimeZoneToUtc(dayKey, timeKey, timeZone) {
    const day = parseDayKey(dayKey);
    const time = parseTimeKey(timeKey);
    const targetComparable = Date.UTC(day.year, day.month - 1, day.day, time.hour, time.minute, 0, 0);
    let current = targetComparable;
    for (let attempt = 0; attempt < 6; attempt += 1) {
        const parts = zonedParts(new Date(current), timeZone);
        const diff = targetComparable - utcComparableFromParts(parts);
        if (diff === 0) {
            return new Date(current);
        }
        current += diff;
    }
    return new Date(current);
}
/**
 * Canonical storage instant for an org-local availability day.
 * The DB still uses DateTime, so we normalize each local day to the UTC instant representing local midnight.
 */
function dayKeyToStoredAvailabilityDate(dayKey, timeZone) {
    return dateTimeInTimeZoneToUtc(dayKey, "00:00", timeZone);
}
function timeZoneDayKeyToUtcRange(dayKey, timeZone) {
    const start = dayKeyToStoredAvailabilityDate(dayKey, timeZone);
    const end = dayKeyToStoredAvailabilityDate(addDaysToDayKey(dayKey, 1), timeZone);
    return { start, end };
}
/** YYYY-MM-DD for the instant in the given zone (matches clinician date picker semantics). */
function dayKeyInTimeZone(date, timeZone) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}
/** Minutes from local midnight in the given zone (0–1439, or 1440 for edge cases). */
function wallClockMinutesInTimeZone(date, timeZone) {
    const parts = zonedParts(date, timeZone);
    return parts.hour * 60 + parts.minute;
}
