import "dotenv/config";
import { describe, expect, test } from "@jest/globals";
import { getStravaAccessToken, getStravaRunCalendar } from "../api/strava";
import { createRunCalendar } from "../models";

describe("strava tests", () => {
  let stravaAccessToken: string | null = null;

  test("strava refresh token yields a new access token", async () => {
    const { token } = await getStravaAccessToken();

    expect(token).not.toBeNull();

    stravaAccessToken = token;
  });

  test("strava access token yields run calendar", async () => {
    expect(stravaAccessToken).not.toBeNull();

    const { runs } = await getStravaRunCalendar(stravaAccessToken!);

    expect(runs).not.toBeNull();
  });

  test("crate run calendar works on empty data", () => {
    const runs = createRunCalendar([]);

    expect(runs).not.toBeNull();
  });
});
