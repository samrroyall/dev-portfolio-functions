import "dotenv/config";
import { describe, expect, test } from "@jest/globals";
import { getSpotifyAccessToken, getSpotifyTopTracks } from "../api/spotify";

describe("spotify tests", () => {
  let spotifyAccessToken: string | null = null;

  test("spotify refresh token yields a new access token", async () => {
    const { token } = await getSpotifyAccessToken();

    expect(token).not.toBeNull();

    spotifyAccessToken = token;
  });

  test("spotify access token yields top tracks", async () => {
    expect(spotifyAccessToken).not.toBeNull();

    const { tracks } = await getSpotifyTopTracks(spotifyAccessToken!);

    expect(tracks).not.toBeNull();
  });
});
