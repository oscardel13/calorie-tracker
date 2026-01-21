import type { Week, Day, Item } from "@/types/types"; // adjust your path

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

type BuildWeekArgs = {
  weekName: string;
  startISO: string; // from <input type="date">
  caloriesGoal: number;
  carbsGoal: number;
  proteinGoal: number;
  fiberGoal: number;
};

function parseLocalISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysLocal(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function buildWeek({
  weekName,
  startISO, // "YYYY-MM-DD" from input
  caloriesGoal,
  carbsGoal,
  proteinGoal,
  fiberGoal,
}: {
  weekName: string;
  startISO: string;
  caloriesGoal: number;
  carbsGoal: number;
  proteinGoal: number;
  fiberGoal: number;
}): Week {
  const start = parseLocalISO(startISO);
  const end = addDaysLocal(start, 6);

  return {
    week_name: weekName,
    start: toLocalISO(start), // store as local string!
    end: toLocalISO(end),
    calories_goal: caloriesGoal,
    carbs_goal: carbsGoal,
    protein_goal: proteinGoal,
    fiber_goal: fiberGoal,
    days: Array.from({ length: 7 }).map((_, i) => {
      const d = addDaysLocal(start, i);
      const iso = toLocalISO(d);
      return {
        date: iso,
        calories_goal: Math.round(caloriesGoal / 7),
        carbs_goal: Math.round(carbsGoal / 7),
        protein_goal: Math.round(proteinGoal / 7),
        fiber_goal: Math.round(fiberGoal / 7),
        items: [],
      };
    }),
  };
}

// ---- Selectors / helpers ----
export function sumDay(day: Day) {
  return day.items.reduce(
    (acc, it) => {
      acc.calories += it.calories ?? 0;
      acc.carbs += it.carbs ?? 0;
      acc.protein += it.protein ?? 0;
      acc.fiber += it.fiber ?? 0;
      return acc;
    },
    { calories: 0, carbs: 0, protein: 0, fiber: 0 }
  );
}

export function sumWeek(week: Week) {
  return week.days.reduce(
    (totals, d) => {
      const t = sumDay(d);
      totals.calories += t.calories;
      totals.carbs += t.carbs;
      totals.protein += t.protein;
      totals.fiber += t.fiber;
      return totals;
    },
    { calories: 0, carbs: 0, protein: 0, fiber: 0 }
  );
}

export function dailyGoalFromWeek(week: Week) {
  if (!week.days.length) return { calories: 0, carbs: 0, protein: 0, fiber: 0 };
  const sums = week.days.reduce(
    (acc, d) => {
      acc.calories += d.calories_goal;
      acc.carbs += d.carbs_goal;
      acc.protein += d.protein_goal;
      acc.fiber += d.fiber_goal;
      return acc;
    },
    { calories: 0, carbs: 0, protein: 0, fiber: 0 }
  );
  const n = week.days.length;
  return {
    calories: Math.round(sums.calories / n),
    carbs: Math.round(sums.carbs / n),
    protein: Math.round(sums.protein / n),
    fiber: Math.round(sums.fiber / n),
  };
}
