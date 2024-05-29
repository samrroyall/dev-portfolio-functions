import { type VercelRequest, type VercelResponse } from "@vercel/node";
import {
  createRunCalendar,
  type AccessTokenResponse,
  type ApiRefreshTokenResponse,
  type ApiStravaActivitiesResponse,
  type RunMonth,
} from "../models";
import { envVariablesValid } from "./utils";

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
): Promise<RunCalendarResponse> => {
  try {
    const apiUrl = process.env.STRAVA_API_URL!;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth());

    const apiResponse = await fetch(
      `${apiUrl}/athlete/activities?after=${startOfMonth.valueOf() / 1000}`,
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
      runs: createRunCalendar(jsonData),
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
  _request: VercelRequest,
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
    } = await getStravaRunCalendar(token);

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
