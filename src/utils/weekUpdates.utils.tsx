// utils/weekUpdates.ts
import type { Week, Day, Item } from "@/types/types";

export function addItemToDay(week: Week, dayISO: string, item: Item): Week {
  const dayIdx = week.days.findIndex((d) => d.date === dayISO);
  if (dayIdx === -1) {
    // If your week is always pre-built (7 days), this shouldn’t happen.
    // If you want to be defensive, you could create a new Day here.
    throw new Error(`Day ${dayISO} not found in week ${week.week_name}`);
  }

  const day: Day = week.days[dayIdx];

  const updatedDay: Day = {
    ...day,
    items: [...day.items, item], // append immutably
  };

  const updatedDays = [...week.days];
  updatedDays[dayIdx] = updatedDay;

  // Week “updates” simply by getting a new days array
  return {
    ...week,
    days: updatedDays,
  };
}
