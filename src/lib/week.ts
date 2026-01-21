// src/lib/week.ts
import type { Week, Day } from "./models";

// Local date helpers (no UTC shift)
function parseLocalISO(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function addDaysLocal(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// simple even split with rounding; change to floor if you prefer
const split7 = (total: number) => Math.round(total / 7);

export type BuildWeekArgs = {
  weekName: string;
  startISO: string; // "YYYY-MM-DD" from <input type="date">
  caloriesGoal: number;
  carbsGoal: number;
  proteinGoal: number;
  fiberGoal: number;
};

export function buildWeek({
  weekName,
  startISO,
  caloriesGoal,
  carbsGoal,
  proteinGoal,
  fiberGoal,
}: BuildWeekArgs): Week {
  const startDate = parseLocalISO(startISO); // LOCAL parse
  const endDate = addDaysLocal(startDate, 6); // LOCAL math

  // Per-day goals (rounded). If you want exact totals preserved,
  // we can distribute remainders across the first N days.
  const perDayCalories = split7(caloriesGoal);
  const perDayCarbs = split7(carbsGoal);
  const perDayProtein = split7(proteinGoal);
  const perDayFiber = split7(fiberGoal);

  const days: Day[] = Array.from({ length: 7 }).map((_, i) => {
    const d = addDaysLocal(startDate, i);
    const iso = toLocalISO(d); // store as "YYYY-MM-DD"
    return {
      date: iso,
      calories_goal: perDayCalories,
      carbs_goal: perDayCarbs,
      protein_goal: perDayProtein,
      fiber_goal: perDayFiber,
      items: [],
    };
  });

  return {
    week_name: weekName,
    start: toLocalISO(startDate), // strings, not Date objects
    end: toLocalISO(endDate),
    calories_goal: caloriesGoal,
    carbs_goal: carbsGoal,
    protein_goal: proteinGoal,
    fiber_goal: fiberGoal,
    days,
  };
}
