import { MAX_REPOST_IN_HOURS, MAX_REPOST_INTERVAL_LIMIT, REPOSTING_TIME_INTERVAL } from "../../limits";
import { formatTime } from "../../utils/helpers";

// These are really not optimal, and they can also run twice. Which is not great.
// Luckily with SSG these only run once.

export function RepostTimeSelector() {
  const subIntervalLimit: number = 60 / REPOSTING_TIME_INTERVAL;
  return (<select disabled>
    {[...Array(MAX_REPOST_IN_HOURS)].map((x, i) => {
      if (i == 0) return;
      const dayField = Math.floor(i/24);
      const hourField = i % 24;
      // This array is pure evil and ugly and horrible
      let evilArray = [];
      for (let t = 0; t < subIntervalLimit; ++t) {
        const minutesValue = t * (REPOSTING_TIME_INTERVAL as number);
        evilArray.push(<option value={i + minutesValue/60}>{formatTime(dayField, hourField, minutesValue)}</option>);
        // When at limit, we should not add sub options, so break out.
        if (i == MAX_REPOST_IN_HOURS-1)
          break;
      }
      return evilArray;
    })}
  </select>);
};

export function RepostAmountSelector() {
  return (<select disabled>
    {[...Array(MAX_REPOST_INTERVAL_LIMIT)].map((x, i) => {
      if (i == 0) return;
      return (<option value={i}>{i} times</option>);
    })}
  </select>);
}