import type { Week, Day, Item } from "@/types/types";

const dayCalories = (d: Day) =>
  d.items.reduce((sum, it) => sum + (it.calories ?? 0), 0);

export function computeAdjustedDailyAllowance(
  week: Week,
  override?: { dayISO: string; items: Item[] }
): { value: number; remainingCalories: number; missingDays: number } {
  // Build a temp view of days with optional override
  const days: Day[] = week.days.map((d) =>
    override && d.date === override.dayISO ? { ...d, items: override.items } : d
  );

  const totalConsumed = days.reduce((acc, d) => acc + dayCalories(d), 0);
  const remainingCalories = Math.max(week.calories_goal - totalConsumed, 0);

  // "Missing" = days with 0 calories after applying override
  const missingDays = days.filter((d) => dayCalories(d) === 0).length;

  const value =
    missingDays > 0 ? Math.ceil(remainingCalories / missingDays) : 0;
  return { value, remainingCalories, missingDays };
}
