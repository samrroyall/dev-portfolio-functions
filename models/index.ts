export {
  type ApiSpotifyTopTracksResponse,
  type Track,
  mapApiSpotifyTrackToTrack,
} from "./spotify";

export {
  type ApiStravaActivitiesResponse,
  type CalendarMonth,
  type RunMonth,
  createRunCalendar,
  getCalendarMonth,
} from "./strava";

export interface ApiRefreshTokenResponse {
  access_token: string;
}

export interface AccessTokenResponse {
  token: string | null;
  status: number;
  message: string;
}
