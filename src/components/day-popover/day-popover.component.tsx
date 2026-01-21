"use client";

import { useMemo, useState } from "react";
import Popover from "../popover/popover.component";
import type { Day, Item, Week } from "@/types/types";
import { computeAdjustedDailyAllowance } from "@/lib/allowance";
import { parseLocalISO } from "@/lib/date";

type Props =
  | {
      close: () => void;
      dayISO: string; // e.g., "2025-11-02"
      setWeek: React.Dispatch<React.SetStateAction<Week>>;
      onAdd?: never;
      day: Day;
      week: Week;
    }
  | {
      close: () => void;
      dayISO: string;
      onAdd: (dayISO: string, item: Item) => void;
      setWeek?: never;
      day: Day;
      week: Week;
    };

// immutable updater for week.days[dayISO]
function updateDayInWeek(prev: Week, dayISO: string, newDay: Day): Week {
  const idx = prev.days.findIndex((d) => d.date === dayISO);
  if (idx === -1) return prev;
  const days = [...prev.days];
  days[idx] = newDay;
  return { ...prev, days };
}

export default function DayPopover(props: Props) {
  const { dayISO, day, week, close } = props;

  // local editable copy
  const [updatedDay, setUpdatedDay] = useState<Day>(props.day);
  const [editGoals, setEditGoals] = useState(false);
  const [showExitChoices, setShowExitChoices] = useState(false);

  // dirty check (unsaved changes)
  const isDirty = useMemo(
    () => JSON.stringify(updatedDay) !== JSON.stringify(day),
    [updatedDay, day]
  );

  // totals from the editable copy
  const current = useMemo(() => {
    return updatedDay.items.reduce(
      (acc, it) => {
        acc.calories += it.calories ?? 0;
        acc.carbs += it.carbs ?? 0;
        acc.protein += it.protein ?? 0;
        acc.fiber += it.fiber ?? 0;
        return acc;
      },
      { calories: 0, carbs: 0, protein: 0, fiber: 0 }
    );
  }, [updatedDay.items]);

  // date formatting
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

  // --- Adjusted Daily Allowance (subtle chip) ---
  // If real weekContext provided, use it. Otherwise show a gentle approximation.
  const ada = useMemo(() => {
    return computeAdjustedDailyAllowance(week, {
      dayISO,
      items: updatedDay.items, // 👈 apply the draft edits
    });
  }, [week, dayISO, updatedDay.items]);

  // handlers
  const handleItemFieldChange = (
    index: number,
    field: keyof Item,
    value: string
  ) => {
    setUpdatedDay((prev) => {
      const items = [...prev.items];
      const old = items[index];
      const parsed =
        field === "name"
          ? (value as unknown as Item[typeof field])
          : ((value === ""
              ? 0
              : Number(value)) as unknown as Item[typeof field]);
      items[index] = { ...old, [field]: parsed };
      return { ...prev, items };
    });
  };

  // Add new entry to the TOP (unshift)
  const handleAddEntry = () => {
    setUpdatedDay((prev) => ({
      ...prev,
      items: [
        {
          date: dayISO,
          name: "",
          calories: 0,
          carbs: 0,
          protein: 0,
          fiber: 0,
        },
        ...prev.items,
      ],
    }));
  };

  // Remove from the local copy (won’t persist until Save)
  const handleRemoveEntry = (index: number) => {
    setUpdatedDay((prev) => {
      const items = prev.items.slice();
      items.splice(index, 1);
      return { ...prev, items };
    });
  };

  const handleGoalsChange = (
    field: "calories_goal" | "carbs_goal" | "protein_goal" | "fiber_goal",
    value: string
  ) => {
    setUpdatedDay((prev) => ({
      ...prev,
      [field]: value === "" ? 0 : Number(value),
    }));
  };

  const commitSave = () => {
    if ("setWeek" in props && props.setWeek) {
      props.setWeek((prev) => updateDayInWeek(prev, dayISO, updatedDay));
    }
  };

  const handleSave = () => {
    commitSave();
    close();
  };

  // exit flow
  const attemptClose = () => {
    if (isDirty) {
      setShowExitChoices(true);
    } else {
      close();
    }
  };

  return (
    // intercept the popover's close with attemptClose
    <Popover closeTrigger={attemptClose}>
      <button
        onClick={attemptClose}
        aria-label="Close"
        className="absolute top-5 right-4 text-black text-3xl leading-none"
      >
        ×
      </button>
      <div className="relative p-4 overflow-y-auto max-h-[80vh]">
        {/* Close X (bigger, black, tight to corner) */}

        <h3 className="text-lg font-semibold">Day Details</h3>

        {/* Date header */}
        <div className="mt-1">
          <h4 className="text text-xl font-semibold">{formattedDate}</h4>
          <p className="text opacity-80 -mt-1">{weekday}</p>
        </div>

        {/* Summary row */}
        <div className="flex justify-between gap-5 pt-5 text">
          <div className="flex flex-col font-medium">
            <h5 className="text-lg">Today</h5>
            <span>Cal:</span>
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
            {!editGoals ? (
              <>
                <span>{Math.ceil(updatedDay.calories_goal)}</span>
                <span>{Math.ceil(updatedDay.carbs_goal)}</span>
                <span>{Math.ceil(updatedDay.protein_goal)}</span>
                <span>{Math.ceil(updatedDay.fiber_goal)}</span>
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  className="mt-1 block w-28 border border-gray-300 rounded-md shadow-sm p-1"
                  value={updatedDay.calories_goal}
                  onChange={(e) =>
                    handleGoalsChange("calories_goal", e.target.value)
                  }
                />
                <input
                  type="number"
                  className="mt-1 block w-28 border border-gray-300 rounded-md shadow-sm p-1"
                  value={updatedDay.carbs_goal}
                  onChange={(e) =>
                    handleGoalsChange("carbs_goal", e.target.value)
                  }
                />
                <input
                  type="number"
                  className="mt-1 block w-28 border border-gray-300 rounded-md shadow-sm p-1"
                  value={updatedDay.protein_goal}
                  onChange={(e) =>
                    handleGoalsChange("protein_goal", e.target.value)
                  }
                />
                <input
                  type="number"
                  className="mt-1 block w-28 border border-gray-300 rounded-md shadow-sm p-1"
                  value={updatedDay.fiber_goal}
                  onChange={(e) =>
                    handleGoalsChange("fiber_goal", e.target.value)
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Subtle Adjusted Daily Allowance chip */}
        <div className="pt-2">
          <span className="inline-block text-xs opacity-80 border border-gray-400 rounded-full px-2 py-[2px]">
            Adj. Daily Allowance: <b>{ada.value}</b>
          </span>
        </div>

        {/* Buttons */}
        <div className="pt-5 flex flex-col gap-3">
          <button
            onClick={handleAddEntry}
            className="flex justify-center items-center py-1 w-full rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
          >
            <span className="text-white text-lg font-semibold tracking-wider">
              Add Entry
            </span>
          </button>

          <button
            onClick={() => setEditGoals((v) => !v)}
            className="flex justify-center items-center py-1 w-full rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
          >
            <span className="text-white text-lg font-semibold tracking-wider">
              {editGoals ? "Done Editing Goals" : "Edit Goals"}
            </span>
          </button>
        </div>

        {/* Food Entries: mobile-friendly (name, then 2x2 of macros, then Remove) */}
        <div className="pt-5">
          <h4 className="text-lg font-semibold">Food Entries</h4>
          <ul className="list-disc pl-5">
            {updatedDay.items.map((item, index) => (
              <li key={index} className="mb-3">
                {/* Desktop / larger screens */}
                <div className="hidden sm:flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Name"
                    className="mt-1 block border border-gray-300 rounded-md shadow-sm p-1"
                    value={item.name ?? ""}
                    onChange={(e) =>
                      handleItemFieldChange(index, "name", e.target.value)
                    }
                  />

                  <span className="text-[10px] opacity-70">Cal</span>
                  <input
                    type="number"
                    placeholder="0"
                    className="mt-1 block w-24 border border-gray-300 rounded-md shadow-sm p-1"
                    value={item.calories ?? 0}
                    onChange={(e) =>
                      handleItemFieldChange(index, "calories", e.target.value)
                    }
                  />

                  <span className="text-[10px] opacity-70">Carbs</span>
                  <input
                    type="number"
                    placeholder="0"
                    className="mt-1 block w-20 border border-gray-300 rounded-md shadow-sm p-1"
                    value={item.carbs ?? 0}
                    onChange={(e) =>
                      handleItemFieldChange(index, "carbs", e.target.value)
                    }
                  />

                  <span className="text-[10px] opacity-70">Protein</span>
                  <input
                    type="number"
                    placeholder="0"
                    className="mt-1 block w-20 border border-gray-300 rounded-md shadow-sm p-1"
                    value={item.protein ?? 0}
                    onChange={(e) =>
                      handleItemFieldChange(index, "protein", e.target.value)
                    }
                  />

                  <span className="text-[10px] opacity-70">Fiber</span>
                  <input
                    type="number"
                    placeholder="0"
                    className="mt-1 block w-20 border border-gray-300 rounded-md shadow-sm p-1"
                    value={item.fiber ?? 0}
                    onChange={(e) =>
                      handleItemFieldChange(index, "fiber", e.target.value)
                    }
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveEntry(index)}
                    className="mt-1 px-2 py-1 rounded border border-gray-400"
                  >
                    Remove
                  </button>
                </div>

                {/* Mobile */}
                <div className="sm:hidden flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    className="mt-1 block border border-gray-300 rounded-md shadow-sm p-1"
                    value={item.name ?? ""}
                    onChange={(e) =>
                      handleItemFieldChange(index, "name", e.target.value)
                    }
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] opacity-70">Cal</span>
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1"
                        value={item.calories ?? 0}
                        onChange={(e) =>
                          handleItemFieldChange(
                            index,
                            "calories",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] opacity-70">Carbs</span>
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1"
                        value={item.carbs ?? 0}
                        onChange={(e) =>
                          handleItemFieldChange(index, "carbs", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] opacity-70">Protein</span>
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1"
                        value={item.protein ?? 0}
                        onChange={(e) =>
                          handleItemFieldChange(
                            index,
                            "protein",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] opacity-70">Fiber</span>
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1"
                        value={item.fiber ?? 0}
                        onChange={(e) =>
                          handleItemFieldChange(index, "fiber", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(index)}
                      className="px-2 py-1 rounded border border-gray-400"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Save / Exit choice sheet (appears only when trying to close with unsaved changes) */}
        {showExitChoices && (
          <div className="fixed inset-0 bg-black/30 flex items-end lg:items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-t-2xl p-4 shadow-xl">
              <p className="text-center mb-3">You have unsaved changes.</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowExitChoices(false)}
                  className="py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    setShowExitChoices(false);
                    close(); // discard
                  }}
                  className="py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50"
                >
                  Exit without saving
                </button>
                <button
                  onClick={() => {
                    setShowExitChoices(false);
                    handleSave(); // saves then closes
                  }}
                  className="py-2 rounded-xl border border-gray-400 bg-[#372d66ff] hover:bg-[#3c365bff] text-white font-semibold"
                >
                  Save & exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save changes */}
        <div className="pt-5">
          <button
            onClick={handleSave}
            className="flex justify-center items-center py-1 w-full rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
          >
            <span className="text-white text-lg font-semibold tracking-wider">
              Save Changes
            </span>
          </button>
        </div>
      </div>
    </Popover>
  );
}
