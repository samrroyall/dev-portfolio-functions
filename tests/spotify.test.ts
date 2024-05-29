import "dotenv/config";
import { describe, expect, test } from "@jest/globals";
import { getSpotifyAccessToken, getSpotifyTopTracks } from "../api/spotify";

describe("spotify tests", () => {
  test("spotify refresh token yields a new access token", async () => {
    await expect(getSpotifyAccessToken()).resolves.not.toContain({
      token: null,
    });
  });

  test("spotify access token yields top tracks", async () => {
    const { token } = await getSpotifyAccessToken();

    expect(token).not.toBeNull();

    await expect(getSpotifyTopTracks(token!)).resolves.not.toContain({
      tracks: null,
    });
  });
});
