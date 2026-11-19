import { describe, expect, it } from "vitest";
import { formatSavedDate } from "./library";

// Finding 6: a check run at 00:30 on 19 Nov in India (18:30 UTC on 18 Nov)
// was dated "18 Nov 2026". The reader's own date is what they expect.

describe("formatSavedDate", () => {
  const lateEvening = "2026-11-18T19:00:56.443Z"; // 00:30 on 19 Nov in India

  it("defaults to UTC, which is what the server renders", () => {
    expect(formatSavedDate(lateEvening)).toBe("18 Nov 2026");
  });

  it("shows the reader's own date in their time zone", () => {
    expect(formatSavedDate(lateEvening, "Asia/Kolkata")).toBe("19 Nov 2026");
    expect(formatSavedDate(lateEvening, "America/Los_Angeles")).toBe("18 Nov 2026");
  });

  it("falls back to UTC for a time zone the browser reports oddly", () => {
    expect(formatSavedDate(lateEvening, "Not/AZone")).toBe("18 Nov 2026");
  });

  it("returns nothing for a date it can't read", () => {
    expect(formatSavedDate("not a date", "Asia/Kolkata")).toBe("");
  });
});
