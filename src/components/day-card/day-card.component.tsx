"use client";

import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { useMemo, useState } from "react";
import DayPopover from "../day-popover/day-popover.component";
import AddEntryPopover from "../add-entry-popover/add-entry-popover.component";
import DayPlanPopover from "../day-plan-popover/day-plan-popover.component";
import type { Day, Week } from "@/types/types";
import { parseLocalISO } from "@/lib/date";

export default function DayCard({
  day,
  week,
  setWeek,
}: {
  day: Day;
  week: Week;
  setWeek: React.Dispatch<React.SetStateAction<Week>>;
}) {
  const [showDayPopover, setShowDayPopover] = useState(false);
  const [showAddEntryPopover, setShowAddEntryPopover] = useState(false);
  const [showPlanPopover, setShowPlanPopover] = useState(false);

  const toggleDayPopover = () => setShowDayPopover((prev) => !prev);
  const toggleAddEntryPopover = () => setShowAddEntryPopover((prev) => !prev);
  const togglePlanPopover = () => setShowPlanPopover((prev) => !prev);

  const current = useMemo(() => {
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
  }, [day.items]);

  const dateObj = useMemo(() => parseLocalISO(day.date), [day.date]);

  const formattedDate = useMemo(
    () =>
      dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [dateObj]
  );

  const weekday = useMemo(
    () => dateObj.toLocaleDateString("en-US", { weekday: "long" }),
    [dateObj]
  );

  return (
    <div className="relative flex flex-col border border-gray-400 bg-gray-400 p-5 rounded flex-shrink-0">
      <UnfoldMoreIcon
        onClick={toggleDayPopover}
        className="absolute top-1 right-1 -rotate-45"
      />

      {showDayPopover && (
        <DayPopover
          day={day}
          close={toggleDayPopover}
          dayISO={day.date}
          setWeek={setWeek}
          week={week}
        />
      )}

      {showAddEntryPopover && (
        <AddEntryPopover
          dayISO={day.date}
          close={toggleAddEntryPopover}
          setWeek={setWeek}
        />
      )}

      {showPlanPopover && (
        <DayPlanPopover
          dayISO={day.date}
          day={day}
          setWeek={setWeek}
          close={togglePlanPopover}
        />
      )}

      <h2 className="text text-center text-2xl font-semibold">
        {formattedDate}
      </h2>
      <p className="text text-center -mt-1 opacity-80">{weekday}</p>

      <div className="flex justify-between gap-5 pt-5 text">
        <div className="flex flex-col font-medium">
          <h5 className="text-lg">Today</h5>
          <span>Calories:</span>
          <span>Carbs:</span>
          <span>Protein:</span>
          <span>Fiber:</span>
        </div>
        <div className="flex flex-col items-center">
          <h5 className="text-lg">Current</h5>
          <span>{current.calories}</span>
          <span>{current.carbs}</span>
          <span>{current.protein}</span>
          <span>{current.fiber}</span>
        </div>
        <div className="flex flex-col items-center">
          <h5 className="text-lg">Goal</h5>
          <span>{Math.ceil(day.calories_goal)}</span>
          <span>{Math.ceil(day.carbs_goal)}</span>
          <span>{Math.ceil(day.protein_goal)}</span>
          <span>{Math.ceil(day.fiber_goal)}</span>
        </div>
      </div>

      <div className="pt-5 flex flex-col gap-2">
        <button
          onClick={togglePlanPopover}
          className="flex justify-center items-center py-1 w-full rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
        >
          <span className="text-white text-lg font-semibold tracking-wider">
            Plan Meals
          </span>
        </button>
        <button
          onClick={toggleAddEntryPopover}
          className="flex justify-center items-center py-1 w-full rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
        >
          <span className="text-white text-lg font-semibold tracking-wider">
            Add Entry
          </span>
        </button>
      </div>
    </div>
  );
}
