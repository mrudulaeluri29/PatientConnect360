const WHITESPACE_RE = /\s+/g;

export function groupCancellationReason(raw: string | null | undefined): string {
  const normalized = normalizeReasonForMatching(raw);

  if (!normalized) return "Unspecified";

  if (matchesHealthReason(normalized)) return "Patient not feeling well";
  if (matchesTransportationReason(normalized)) return "Transportation issue";
  if (matchesFamilyOrPersonalReason(normalized)) return "Family or personal issue";
  if (matchesWeatherReason(normalized)) return "Weather";
  if (matchesSchedulingReason(normalized)) return "Scheduling conflict";
  if (matchesUnableToAttendReason(normalized)) return "Unable to attend";

  return "Other";
}

function normalizeReasonForMatching(raw: string | null | undefined): string {
  if (!raw) return "";

  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(WHITESPACE_RE, " ")
    .trim();
}

function matchesHealthReason(value: string): boolean {
  return [
    /\bnot feeling well\b/,
    /\bfeeling sick\b/,
    /\bpatient sick\b/,
    /\bunwell\b/,
    /\bnot well\b/,
    /\bill\b/,
    /\bsick\b/,
    /\bunder the weather\b/,
    /\bflu\b/,
    /\bcovid\b/,
    /\bfever\b/,
    /\bmigraine\b/,
    /\bheadache\b/,
    /\bnausea\b/,
    /\bvomiting\b/,
    /\binjury\b/,
    /\bhospital(?:ized)?\b/,
  ].some((pattern) => pattern.test(value));
}

function matchesTransportationReason(value: string): boolean {
  return [
    /\btransport(?:ation)?\b/,
    /\bcar trouble\b/,
    /\bcar issue\b/,
    /\bflat tire\b/,
    /\bno ride\b/,
    /\bride fell through\b/,
    /\btraffic\b/,
    /\bbus\b/,
    /\btrain\b/,
  ].some((pattern) => pattern.test(value));
}

function matchesFamilyOrPersonalReason(value: string): boolean {
  return [
    /\bfamily issue\b/,
    /\bfamily emergency\b/,
    /\bpersonal issue\b/,
    /\bpersonal emergency\b/,
    /\bchildcare\b/,
    /\bbabysitt?er\b/,
    /\bfuneral\b/,
    /\bbereavement\b/,
    /\bdeath in family\b/,
  ].some((pattern) => pattern.test(value));
}

function matchesWeatherReason(value: string): boolean {
  return [
    /\bweather\b/,
    /\brain\b/,
    /\bsnow\b/,
    /\bstorm\b/,
    /\bicy?\b/,
    /\bflood\b/,
    /\bhurricane\b/,
  ].some((pattern) => pattern.test(value));
}

function matchesSchedulingReason(value: string): boolean {
  return [
    /\bschedule(?:d|ing)?\b/,
    /\bcalendar\b/,
    /\bdouble booked\b/,
    /\bwork conflict\b/,
    /\bappointment conflict\b/,
    /\btime conflict\b/,
    /\banother appointment\b/,
    /\bmeeting\b/,
    /\bconflict\b/,
  ].some((pattern) => pattern.test(value));
}

function matchesUnableToAttendReason(value: string): boolean {
  return [
    /\bcant make it\b/,
    /\bcannot make it\b/,
    /\bcan not make it\b/,
    /\bcouldnt make it\b/,
    /\bunable to make it\b/,
    /\bunable to attend\b/,
    /\bcant attend\b/,
    /\bcannot attend\b/,
    /\bcan not attend\b/,
    /\bnot available\b/,
    /\bwont be able to make it\b/,
    /\bwill not be able to make it\b/,
  ].some((pattern) => pattern.test(value));
}
