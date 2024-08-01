interface ApiStravaActivity {
  id: number;
  sport_type: string;
  distance: number;
  elapsed_time: number;
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

const metersPerMile = 1609.344;

const mapApiStravaActivityToRunDay = ({
  id,
  distance,
  elapsed_time,
  start_date_local,
  average_heartrate,
}: ApiStravaActivity): RunDay => {
  const minutes = elapsed_time / 60;
  const miles = distance / metersPerMile;

  return {
    id,
    day: new Date(start_date_local).getDate(),
    miles,
    minutesPerMile: minutes / miles,
    avgBpm: average_heartrate ? average_heartrate : null,
  };
};

const now = new Date();

// now.getMonth() + 1 is the next month, placing 0 for day does a negative
// wrap to the last day of the previous month, and getDate() gets the day, not
// the day index
const daysInMonth = new Date(
  now.getFullYear(),
  now.getMonth() + 1,
  0,
).getDate();

// the date is the first day of the current month, getDay() returns the day of
// the week index for it
const firstOfMonthDayIdx = new Date(
  now.getFullYear(),
  now.getMonth(),
  1,
).getDay();

// number of rows in our calendar is the number of days in the month, shifted
// right based on the first day of the month's day of the week index over 7
const numWeeksInMonth = Math.ceil((firstOfMonthDayIdx + daysInMonth) / 7);

export const createRunCalendar = (
  apiResponse: ApiStravaActivitiesResponse,
): RunMonth => {
  const runs: RunWeek[] = [];

  for (let i = 0; i < numWeeksInMonth; i++) {
    runs.push([null, null, null, null, null, null, null]);
  }

  for (let i = firstOfMonthDayIdx; i < firstOfMonthDayIdx + daysInMonth; i++) {
    runs[Math.floor(i / 7)][i % 7] = [];
  }

  apiResponse
    .filter(({ sport_type }) => sport_type === "Run")
    .map(mapApiStravaActivityToRunDay)
    .forEach((run) => {
      const dayIdx = firstOfMonthDayIdx + run.day - 1;

      runs[Math.floor(dayIdx / 7)][dayIdx % 7]!.push(run);
    });

  return runs;
};
