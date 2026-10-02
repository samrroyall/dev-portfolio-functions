interface ApiStravaActivity {
  id: number;
  sport_type: string;
  distance: number;
  moving_time: number;
  start_date_local: string;
  average_heartrate?: number;
}

export type ApiStravaActivitiesResponse = ApiStravaActivity[];

interface RunDay {
  id: number;
  day: number; // 1-indexed
  miles: number;
  minutesPerMile: number;
  avgBpm: number | null;
}

type RunWeek = [
  RunDay[] | null,
  RunDay[] | null,
  RunDay[] | null,
  RunDay[] | null,
  RunDay[] | null,
  RunDay[] | null,
  RunDay[] | null,
];

export type RunMonth = RunWeek[];

export interface CalendarMonth {
  year: number;
  month: number; // 0-indexed, like Date.getMonth()
}

const metersPerMile = 1609.344;
const msPerHour = 60 * 60 * 1000;

// the month it currently is for a viewer utcOffset hours from UTC. shifting the
// timestamp and reading the UTC fields keeps this independent of the server's
// own timezone
export const getCalendarMonth = (now: Date, utcOffset = 0): CalendarMonth => {
  const viewerNow = new Date(now.getTime() + utcOffset * msPerHour);

  return { year: viewerNow.getUTCFullYear(), month: viewerNow.getUTCMonth() };
};

// start_date_local is the wall-clock time where the activity happened, but
// Strava formats it with a trailing "Z" as if it were UTC, so read the date
// straight from the string rather than letting Date convert it
const getLocalDate = (startDateLocal: string) => {
  const [year, month, day] = startDateLocal.slice(0, 10).split("-").map(Number);

  return { year, month: month - 1, day };
};

const mapApiStravaActivityToRunDay = ({
  id,
  distance,
  moving_time,
  start_date_local,
  average_heartrate,
}: ApiStravaActivity): RunDay => {
  const minutes = moving_time / 60;
  const miles = distance / metersPerMile;

  return {
    id,
    day: getLocalDate(start_date_local).day,
    miles,
    minutesPerMile: minutes / miles,
    avgBpm: average_heartrate ? average_heartrate : null,
  };
};

export const createRunCalendar = (
  apiResponse: ApiStravaActivitiesResponse,
  { year, month }: CalendarMonth = getCalendarMonth(new Date()),
): RunMonth => {
  // month + 1 is the next month, placing 0 for day does a negative wrap to the
  // last day of this month, and getUTCDate() gets the day, not the day index
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // the date is the first day of the month, getUTCDay() returns the day of the
  // week index for it
  const firstOfMonthDayIdx = new Date(Date.UTC(year, month, 1)).getUTCDay();

  // number of rows in our calendar is the number of days in the month, shifted
  // right based on the first day of the month's day of the week index over 7
  const numWeeksInMonth = Math.ceil((firstOfMonthDayIdx + daysInMonth) / 7);

  const runs: RunWeek[] = [];

  for (let i = 0; i < numWeeksInMonth; i++) {
    runs.push([null, null, null, null, null, null, null]);
  }

  for (let i = firstOfMonthDayIdx; i < firstOfMonthDayIdx + daysInMonth; i++) {
    runs[Math.floor(i / 7)][i % 7] = [];
  }

  apiResponse
    .filter(({ sport_type }) => sport_type === "Run")
    // activities are fetched starting a day before the 1st (see
    // getStravaRunCalendar), so only keep runs whose local date is this month
    .filter(({ start_date_local }) => {
      const date = getLocalDate(start_date_local);

      return date.year === year && date.month === month;
    })
    .map(mapApiStravaActivityToRunDay)
    .forEach((run) => {
      const dayIdx = firstOfMonthDayIdx + run.day - 1;

      runs[Math.floor(dayIdx / 7)][dayIdx % 7]!.push(run);
    });

  return runs;
};
