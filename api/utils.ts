const stringEnvVariables = [
  process.env.SPOTIFY_API_URL,
  process.env.SPOTIFY_ACCOUNT_URL,
  process.env.SPOTIFY_CLIENT_ID,
  process.env.SPOTIFY_CLIENT_SECRET,
  process.env.SPOTIFY_REFRESH_TOKEN,
];

const numericEnvVariables = [process.env.CACHE_SECONDS];

export const envVariablesValid = (): boolean =>
  stringEnvVariables.filter((v) => !v).length === 0 &&
  numericEnvVariables.filter((v) => !v || isNaN(parseInt(v))).length === 0;
