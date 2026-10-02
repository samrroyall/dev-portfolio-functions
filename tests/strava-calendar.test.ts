import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { getStravaRunCalendar } from "../api/strava";
import { parseUtcOffset } from "../api/utils";
import {
  createRunCalendar,
  getCalendarMonth,
  type ApiStravaActivitiesResponse,
  type RunMonth,
} from "../models";

const activity = (id: number, startDateLocal: string, sportType = "Run") => ({
  id,
  sport_type: sportType,
  distance: 8046.72,
  moving_time: 2400,
  start_date_local: startDateLocal,
  average_heartrate: 150,
});

// the day of the month each run was placed on, read from its grid position
const placedRuns = (calendar: RunMonth) =>
  calendar.flatMap((week, row) =>
    week.flatMap((day, col) =>
      (day ?? []).map((run) => ({ id: run.id, row, col, day: run.day })),
    ),
  );

const october2026 = { year: 2026, month: 9 }; // the 1st is a Thursday

describe("createRunCalendar", () => {
  test("lays out the month with blank cells before the 1st", () => {
    const calendar = createRunCalendar([], october2026);

    expect(calendar).toHaveLength(5);
    expect(calendar[0]).toEqual([null, null, null, null, [], [], []]);
    expect(calendar[4]).toEqual([[], [], [], [], [], [], []]);
  });

  test("handles a month that fits in exactly four weeks", () => {
    const calendar = createRunCalendar([], { year: 2026, month: 1 });

    expect(calendar).toHaveLength(4);
    expect(calendar.flat().every((day) => day !== null)).toBe(true);
  });

  test("leaves out an evening run from the last day of the previous month", () => {
    const calendar = createRunCalendar(
      [
        activity(1, "2026-09-30T18:30:00Z"),
        activity(2, "2026-10-01T07:00:00Z"),
      ],
      october2026,
    );

    expect(placedRuns(calendar)).toEqual([{ id: 2, row: 0, col: 4, day: 1 }]);
    expect(calendar[4][5]).toEqual([]); // Fri, Oct 30
  });

  test("places runs on their local date at either end of the month", () => {
    const calendar = createRunCalendar(
      [
        activity(1, "2026-10-01T00:15:00Z"),
        activity(2, "2026-10-31T23:45:00Z"),
        activity(3, "2026-11-01T06:00:00Z"),
      ],
      october2026,
    );

    expect(placedRuns(calendar)).toEqual([
      { id: 1, row: 0, col: 4, day: 1 },
      { id: 2, row: 4, col: 6, day: 31 },
    ]);
  });

  test("only includes runs", () => {
    const calendar = createRunCalendar(
      [
        activity(1, "2026-10-05T07:00:00Z", "Ride"),
        activity(2, "2026-10-05T18:00:00Z"),
      ],
      october2026,
    );

    expect(placedRuns(calendar).map(({ id }) => id)).toEqual([2]);
  });
});

describe("getCalendarMonth", () => {
  test("uses the viewer's month, not UTC's", () => {
    const oct1Utc = new Date("2026-10-01T03:00:00Z"); // Sep 30, 8 PM PDT

    expect(getCalendarMonth(oct1Utc, -7)).toEqual({ year: 2026, month: 8 });
    expect(getCalendarMonth(oct1Utc)).toEqual({ year: 2026, month: 9 });
  });

  test("rolls back across a year boundary", () => {
    const jan1Utc = new Date("2027-01-01T05:00:00Z"); // Dec 31, 9 PM PST

    expect(getCalendarMonth(jan1Utc, -8)).toEqual({ year: 2026, month: 11 });
  });
});

describe("parseUtcOffset", () => {
  test("parses whole and fractional offsets", () => {
    expect(parseUtcOffset("-7")).toBe(-7);
    expect(parseUtcOffset("5.5")).toBe(5.5);
    expect(parseUtcOffset(["-4", "9"])).toBe(-4);
  });

  test("falls back to UTC for missing or invalid values", () => {
    expect(parseUtcOffset(undefined)).toBe(0);
    expect(parseUtcOffset("abc")).toBe(0);
    expect(parseUtcOffset("100")).toBe(0);
  });
});

describe("getStravaRunCalendar", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test("fetches from a day before the 1st and keeps last month's runs off the calendar", async () => {
    jest.useFakeTimers({
      now: new Date("2026-10-02T17:00:00Z"), // Fri, Oct 2, 10 AM PDT
      doNotFake: ["nextTick", "queueMicrotask", "setImmediate"],
    });

    process.env.STRAVA_API_URL = "https://strava.test/api/v3";

    const activities: ApiStravaActivitiesResponse = [
      activity(1, "2026-09-30T18:30:00Z"),
      activity(2, "2026-10-01T07:00:00Z"),
    ];

    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(activities),
    } as Response);

    const { runs } = await getStravaRunCalendar("token", -7);

    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);

    expect(requestUrl.searchParams.get("after")).toBe(
      (Date.UTC(2026, 8, 30) / 1000).toString(),
    );
    expect(requestUrl.searchParams.get("per_page")).toBe("200");
    expect(placedRuns(runs!)).toEqual([{ id: 2, row: 0, col: 4, day: 1 }]);
  });
});
