import { type VercelRequest, type VercelResponse } from "@vercel/node";
import {
  mapApiSpotifyTrackToTrack,
  type ApiSpotifyRefreshTokenResponse,
  type ApiSpotifyTopTracksResponse,
  type Track,
} from "../models/spotify";
import { envVariablesValid } from "./utils";

interface AccessTokenResponse {
  token: string | null;
  status: number;
  message: string;
}

export const getSpotifyAccessToken = async (): Promise<AccessTokenResponse> => {
  try {
    const baseUrl = process.env.SPOTIFY_ACCOUNT_URL!;
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN!;

    const token = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const apiResponse = await fetch(`${baseUrl}/api/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (apiResponse.status !== 200) {
      return {
        token: null,
        status: apiResponse.status,
        message: apiResponse.statusText,
      };
    }

    const jsonData =
      (await apiResponse.json()) as ApiSpotifyRefreshTokenResponse;

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

interface TopTracksResponse {
  tracks: Track[] | null;
  status: number;
  message: string;
}

export const getSpotifyTopTracks = async (
  token: string,
  limit = 5,
): Promise<TopTracksResponse> => {
  try {
    const apiUrl = process.env.SPOTIFY_API_URL!;

    const apiResponse = await fetch(
      `${apiUrl}/me/top/tracks?time_range=short_term&limit=${limit}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (apiResponse.status !== 200) {
      return {
        tracks: null,
        status: apiResponse.status,
        message: apiResponse.statusText,
      };
    }

    const jsonData = (await apiResponse.json()) as ApiSpotifyTopTracksResponse;

    return {
      tracks: jsonData.items.map(mapApiSpotifyTrackToTrack),
      status: 200,
      message: "Success",
    };
  } catch (err) {
    return {
      tracks: null,
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
    } = await getSpotifyAccessToken();

    if (!token) {
      return response.status(tokenStatus).json({ tokenMessage });
    }

    const {
      tracks,
      status: tracksStatus,
      message: tracksMessage,
    } = await getSpotifyTopTracks(token);

    if (!tracks) {
      return response.status(tracksStatus).json({ tracksMessage });
    }

    const cacheSeconds = process.env.CACHE_SECONDS!;

    response.setHeader("Cache-Control", `public, s-maxage=${cacheSeconds}`);

    return response.status(200).json(tracks);
  } catch (err) {
    return response.status(500).json({ message: JSON.stringify(err) });
  }
}
