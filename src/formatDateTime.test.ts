import { describe, expect, it } from "vitest";
import { formatDateTime } from "./formatDateTime";

describe("formatDateTime", () => {
  it("shows weekday, date and 24-hour time", () => {
    expect(formatDateTime(new Date(2026, 10, 10, 14, 5).getTime())).toBe("Tue 10 Nov, 14:05");
  });
});
