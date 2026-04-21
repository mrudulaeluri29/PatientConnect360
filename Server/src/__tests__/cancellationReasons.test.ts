import { groupCancellationReason } from "../lib/cancellationReasons";

describe("groupCancellationReason", () => {
  it.each([
    [null, "Unspecified"],
    ["", "Unspecified"],
    ["   ", "Unspecified"],
    ["Can't make it", "Unable to attend"],
    ["Can’t make it", "Unable to attend"],
    ["cannot make it", "Unable to attend"],
    ["Unable to attend", "Unable to attend"],
    ["Feeling sick today", "Patient not feeling well"],
    ["Patient not feeling well", "Patient not feeling well"],
    ["Work schedule conflict", "Scheduling conflict"],
    ["another appointment", "Scheduling conflict"],
    ["car trouble", "Transportation issue"],
    ["traffic delay", "Transportation issue"],
    ["family emergency", "Family or personal issue"],
    ["childcare issue", "Family or personal issue"],
    ["weather issues", "Weather"],
    ["snow storm", "Weather"],
    ["hidjsk", "Other"],
  ])("maps %p to %p", (input, expected) => {
    expect(groupCancellationReason(input)).toBe(expected);
  });
});
