import { isAnnouncementPublished } from "./announcement-published.util";

describe("isAnnouncementPublished", () => {
  const now = new Date("2026-09-16T12:00:00.000Z");

  it("returns true for active announcements within the date window", () => {
    expect(
      isAnnouncementPublished(
        {
          isActive: true,
          startDate: new Date("2026-09-16T10:00:00.000Z"),
          endDate: null,
        },
        now,
      ),
    ).toBe(true);
  });

  it("returns false for inactive announcements", () => {
    expect(
      isAnnouncementPublished(
        {
          isActive: false,
          startDate: new Date("2026-09-16T10:00:00.000Z"),
          endDate: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it("returns false for future start dates", () => {
    expect(
      isAnnouncementPublished(
        {
          isActive: true,
          startDate: new Date("2026-09-17T10:00:00.000Z"),
          endDate: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it("returns false for expired announcements", () => {
    expect(
      isAnnouncementPublished(
        {
          isActive: true,
          startDate: new Date("2026-09-01T10:00:00.000Z"),
          endDate: new Date("2026-09-15T10:00:00.000Z"),
        },
        now,
      ),
    ).toBe(false);
  });
});
