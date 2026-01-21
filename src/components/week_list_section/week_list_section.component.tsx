"use client";

import { parseLocalISO } from "@/lib/date";
import { Week } from "@/types/types";

function formatWeekRange(start: string | Date, end: string | Date) {
  const sDate = typeof start === "string" ? parseLocalISO(start) : start;
  const eDate = typeof end === "string" ? parseLocalISO(end) : end;

  const s = sDate.toLocaleString("en-US", { month: "short", day: "numeric" });
  const e = eDate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${s} - ${e}`;
}

function getWeekTotals(week: Week) {
  return week.days.reduce(
    (acc, day) => {
      for (const it of day.items) {
        acc.calories += it.calories ?? 0;
        acc.carbs += it.carbs ?? 0;
        acc.protein += (it as any).protein ?? (it as any).protein ?? 0; // tolerate old typo
        acc.fiber += it.fiber ?? 0;
      }
      return acc;
    },
    { calories: 0, carbs: 0, protein: 0, fiber: 0 }
  );
}

export default function WeekListSection({
  weeks,
  onSelectIndex,
}: {
  weeks: Week[];
  onSelectIndex?: (index: number) => void;
}) {
  return (
    <section className="py-10 w-full">
      <h2 className="text-3xl font-semibold text-white">Previous Weeks</h2>
      {weeks.length <= 1 && (
        <div className="flex flex-row w-full border-b border-gray-600 py-2 text-white gap-10 overflow-x-auto">
          <div className="min-w-max">
            <h3 className="text-lg font-semibold">No Previos Weeks</h3>
            <p>Start adding weeks to see them here.</p>
          </div>
        </div>
      )}
      {weeks
        .slice(0, -1)
        .reverse()
        .map((week, i) => {
          const totals = getWeekTotals(week);
          return (
            <div
              key={week.start.toString()}
              className="flex flex-row w-full border-b border-gray-600 py-2 text-white gap-10 overflow-x-auto cursor-pointer"
              onClick={() => onSelectIndex?.(weeks.length - 1 - i)}
            >
              <div className="min-w-max">
                <h3 className="text-lg font-semibold">{week.week_name}</h3>
                <p>{formatWeekRange(week.start, week.end)}</p>
              </div>

              <div className="min-w-max">
                <h6>Calories</h6>
                <div>
                  <span>{totals.calories}</span> /{" "}
                  <span>{week.calories_goal}</span>
                </div>
              </div>

              <div className="min-w-max">
                <h6>Carbs</h6>
                <div>
                  <span>{totals.carbs}</span> / <span>{week.carbs_goal}</span>
                </div>
              </div>

              <div className="min-w-max">
                <h6>Protein</h6>
                <div>
                  <span>{totals.protein}</span> /{" "}
                  <span>{week.protein_goal}</span>
                </div>
              </div>

              <div className="min-w-max">
                <h6>Fiber</h6>
                <div>
                  <span>{totals.fiber}</span> / <span>{week.fiber_goal}</span>
                </div>
              </div>
            </div>
          );
        })}
    </section>
  );
}
