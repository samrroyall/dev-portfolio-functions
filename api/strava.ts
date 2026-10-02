import { type VercelRequest, type VercelResponse } from "@vercel/node";
import {
  createRunCalendar,
  getCalendarMonth,
  type AccessTokenResponse,
  type ApiRefreshTokenResponse,
  type ApiStravaActivitiesResponse,
  type RunMonth,
} from "../models";
import { envVariablesValid, parseUtcOffset } from "./utils";

const secondsPerDay = 24 * 60 * 60;

export const getStravaAccessToken = async (): Promise<AccessTokenResponse> => {
  try {
    const baseUrl = process.env.STRAVA_API_URL!;
    const clientId = process.env.STRAVA_CLIENT_ID!;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET!;
    const refreshToken = process.env.STRAVA_REFRESH_TOKEN!;

    const queryParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const apiResponse = await fetch(`${baseUrl}/oauth/token?${queryParams}`, {
      method: "POST",
    });

    if (apiResponse.status !== 200) {
      return {
        token: null,
        status: apiResponse.status,
        message: apiResponse.statusText,
      };
    }

    const jsonData = (await apiResponse.json()) as ApiRefreshTokenResponse;

    return {
      token: jsonData.access_token,
      status: 200,
      message: "Success",
    };
  } catch (err) {
    return {
      token: null,
      status: 500,
      message: JSON.stringify(err),
    };
  }
};

interface RunCalendarResponse {
  runs: RunMonth | null;
  status: number;
  message: string;
}

export const getStravaRunCalendar = async (
  token: string,
  utcOffset = 0,
): Promise<RunCalendarResponse> => {
  try {
    const apiUrl = process.env.STRAVA_API_URL!;

    const calendarMonth = getCalendarMonth(new Date(), utcOffset);

    // Strava compares `after` against each activity's UTC start time, but runs
    // go on the calendar by their local date. Start a day early so a run on the
    // 1st is included in any timezone; createRunCalendar drops the extra day
    const after =
      Date.UTC(calendarMonth.year, calendarMonth.month, 1) / 1000 -
      secondsPerDay;

    const queryParams = new URLSearchParams({
      after: after.toString(),
      per_page: "200",
    });

    const apiResponse = await fetch(
      `${apiUrl}/athlete/activities?${queryParams}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (apiResponse.status !== 200) {
      return {
        runs: null,
        status: apiResponse.status,
        message: apiResponse.statusText,
      };
    }

    const jsonData = (await apiResponse.json()) as ApiStravaActivitiesResponse;

    return {
      runs: createRunCalendar(jsonData, calendarMonth),
      status: 200,
      message: "Success",
    };
  } catch (err) {
    return {
      runs: null,
      status: 500,
      message: JSON.stringify(err),
    };
  }
};

export default async function (
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    if (!envVariablesValid()) {
      return response
        .status(500)
        .json({ message: "One or more environment variables is undefined." });
    }

    const {
      token,
      status: tokenStatus,
      message: tokenMessage,
    } = await getStravaAccessToken();

    if (!token) {
      return response.status(tokenStatus).json({ tokenMessage });
    }

    const {
      runs,
      status: runsStatus,
      message: runsMessage,
    } = await getStravaRunCalendar(token, parseUtcOffset(request.query.offset));

    if (!runs) {
      return response.status(runsStatus).json({ runsMessage });
    }

    const cacheSeconds = process.env.CACHE_SECONDS!;

    response.setHeader("Cache-Control", `public, s-maxage=${cacheSeconds}`);

    return response.status(200).json(runs);
  } catch (err) {
    return response.status(500).json({ message: JSON.stringify(err) });
  }
}
