"use client";

import { useMemo, useState } from "react";
import DayCard from "../day-card/day-card.component";
import { computeAdjustedDailyAllowance } from "@/lib/allowance";
import type { SavedFood, Week } from "@/types/types";
import { dailyGoalFromWeek, sumWeek } from "@/utils/week.utils";
import EditWeekPopover from "../edit-week-popover/edit-week-popover.component";
import { FoodLibraryProvider } from "@/context/food-library.context";

export default function WeekSection({
  week,
  setWeek,
  savedFoods,
  addSavedFood,
  removeSavedFood,
}: {
  week: Week;
  setWeek: React.Dispatch<React.SetStateAction<Week>>;
  savedFoods: SavedFood[];
  addSavedFood: (f: Omit<SavedFood, "id">) => Promise<void> | void;
  removeSavedFood: (id: string) => Promise<void> | void;
}) {
  const [showEdit, setShowEdit] = useState(false);

  const weeklyTotals = useMemo(() => sumWeek(week), [week]);
  const dailyGoal = useMemo(() => dailyGoalFromWeek(week), [week]);
  const adjustedAllowance = useMemo(() => {
    return computeAdjustedDailyAllowance(week);
  }, [week]);

  const toggleEdit = () => setShowEdit((v) => !v);

  return (
    <section>
      <FoodLibraryProvider
        value={{ savedFoods, addSavedFood, removeSavedFood }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white text-xl font-semibold">{week.week_name}</h2>
          <button
            onClick={toggleEdit}
            className="px-3 py-1 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
          >
            <span className="text-white font-semibold">Edit Week</span>
          </button>
        </div>

        {showEdit && (
          <EditWeekPopover
            week={week}
            close={toggleEdit}
            setWeek={setWeek} // or pass onSubmit={(w)=>setWeek(w)}
          />
        )}

        {/* Week overview row */}
        <div className="grid grid-cols-3 gap-4 text-white py-4">
          <div className="flex flex-col">
            <h6>Calories</h6>
            <div>
              <span>{weeklyTotals.calories}</span> /{" "}
              <span>{week.calories_goal}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <h6>Carbs</h6>
            <div>
              <span>{weeklyTotals.carbs}</span> / <span>{week.carbs_goal}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <h6>Protein</h6>
            <div>
              <span>{weeklyTotals.protein}</span> /{" "}
              <span>{week.protein_goal}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <h6>Fiber</h6>
            <div>
              <span>{weeklyTotals.fiber}</span> / <span>{week.fiber_goal}</span>
            </div>
          </div>

          <div className="flex flex-col">
            <h6>Daily Goal</h6>
            <div>
              <span className="font-bold">
                {Math.ceil(week.calories_goal / 7)}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <h6>Adjusted Daily Allowance *</h6>
            <div>
              <span className="font-bold">{adjustedAllowance.value}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-300">
          * Adjusted Daily Allowance = (weekly goal − calories consumed so far)
          ÷ remaining un-logged days.
        </p>

        <div className="flex flex-row overflow-x-auto gap-4 py-4">
          {week.days.map((day) => (
            <DayCard key={day.date} day={day} setWeek={setWeek} week={week} />
          ))}
        </div>
      </FoodLibraryProvider>
    </section>
  );
}
