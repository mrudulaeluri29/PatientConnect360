"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailabilityTimeZone = getAvailabilityTimeZone;
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
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return hour * 60 + minute;
}
