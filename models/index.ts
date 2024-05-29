export {
  type ApiSpotifyTopTracksResponse,
  type Track,
  mapApiSpotifyTrackToTrack,
} from "./spotify";

export {
  type ApiStravaActivitiesResponse,
  type RunMonth,
  createRunCalendar,
} from "./strava";

export interface ApiRefreshTokenResponse {
  access_token: string;
}

export interface AccessTokenResponse {
  token: string | null;
  status: number;
  message: string;
}
