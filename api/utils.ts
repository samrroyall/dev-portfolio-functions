const stringEnvVariables = [
  process.env.SPOTIFY_API_URL,
  process.env.SPOTIFY_ACCOUNT_URL,
  process.env.SPOTIFY_CLIENT_ID,
  process.env.SPOTIFY_CLIENT_SECRET,
  process.env.SPOTIFY_REFRESH_TOKEN,
  process.env.STRAVA_API_URL,
  process.env.STRAVA_CLIENT_ID,
  process.env.STRAVA_CLIENT_SECRET,
  process.env.STRAVA_REFRESH_TOKEN,
];

const numericEnvVariables = [process.env.CACHE_SECONDS];

export const envVariablesValid = (): boolean =>
  stringEnvVariables.filter((v) => !v).length === 0 &&
  numericEnvVariables.filter((v) => !v || isNaN(parseInt(v))).length === 0;

// the viewer's UTC offset in hours (e.g. -7 for PDT), from the offset query
// param. anything missing or invalid falls back to UTC
export const parseUtcOffset = (
  value: string | string[] | undefined,
): number => {
  const offset = Number(Array.isArray(value) ? value[0] : value);

  return Number.isFinite(offset) && Math.abs(offset) <= 14 ? offset : 0;
};
