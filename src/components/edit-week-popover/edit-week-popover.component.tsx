"use client";

import { useEffect, useMemo, useState } from "react";
import Popover from "../popover/popover.component";
import type { Week, Day, Item } from "@/types/types";
import { parseLocalISO, addDaysLocal, toLocalISO } from "@/lib/date";

type Mode = "weekly" | "daily";

export default function EditWeekPopover({
  week,
  close,
  onSubmit,
  setWeek,
}: {
  week: Week;
  close: () => void;
  // choose ONE: either pass onSubmit (preferred) or setWeek updater
  onSubmit?: (updated: Week) => void;
  setWeek?: React.Dispatch<React.SetStateAction<Week>>;
}) {
  // UI state
  const [mode, setMode] = useState<Mode>("daily");
  const [name, setName] = useState(week.week_name ?? "");
  const [startISO, setStartISO] = useState<string>(
    typeof week.start === "string" ? week.start : toLocalISO(week.start as any)
  );
  const endISO = useMemo(
    () => toLocalISO(addDaysLocal(parseLocalISO(startISO), 6)),
    [startISO]
  );

  // weekly totals (used in weekly mode)
  const [wCal, setWCal] = useState<number>(week.calories_goal ?? 0);
  const [wCarb, setWCarb] = useState<number>(week.carbs_goal ?? 0);
  const [wProt, setWProt] = useState<number>(week.protein_goal ?? 0);
  const [wFib, setWFib] = useState<number>(week.fiber_goal ?? 0);

  // daily goals (used in daily mode)
  const [dayGoals, setDayGoals] = useState(
    week.days.map((d) => ({
      calories: String(Math.round(d.calories_goal ?? 0)),
      carbs: String(Math.round(d.carbs_goal ?? 0)),
      protein: String(Math.round(d.protein_goal ?? 0)),
      fiber: String(Math.round(d.fiber_goal ?? 0)),
    }))
  );

  // derived date labels based on startISO
  const dayDates = useMemo(() => {
    const s = parseLocalISO(startISO);
    return Array.from({ length: 7 }).map((_, i) => addDaysLocal(s, i));
  }, [startISO]);

  // daily totals (sum UI inputs)
  const dailyTotals = useMemo(() => {
    return dayGoals.reduce(
      (acc, g) => {
        acc.calories += g.calories ? Number(g.calories) : 0;
        acc.carbs += g.carbs ? Number(g.carbs) : 0;
        acc.protein += g.protein ? Number(g.protein) : 0;
        acc.fiber += g.fiber ? Number(g.fiber) : 0;
        return acc;
      },
      { calories: 0, carbs: 0, protein: 0, fiber: 0 }
    );
  }, [dayGoals]);

  // keep weekly totals preview in sync when in daily mode
  useEffect(() => {
    if (mode === "daily") {
      setWCal(dailyTotals.calories);
      setWCarb(dailyTotals.carbs);
      setWProt(dailyTotals.protein);
      setWFib(dailyTotals.fiber);
    }
  }, [mode, dailyTotals]);

  // helpers
  const split7 = (n: number) => Math.round((n ?? 0) / 7);

  const handleDayGoalChange = (
    index: number,
    field: "calories" | "carbs" | "protein" | "fiber",
    value: string
  ) => {
    setDayGoals((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Build a preview Week from current UI state (used for dirty check)
  const buildPreviewWeek = (): Week => {
    const s = parseLocalISO(startISO);

    const days: Day[] = Array.from({ length: 7 }).map((_, i) => {
      const newDateISO = toLocalISO(addDaysLocal(s, i));
      const old = week.days[i];

      // derive goals
      const g =
        mode === "weekly"
          ? {
              calories_goal: split7(wCal),
              carbs_goal: split7(wCarb),
              protein_goal: split7(wProt),
              fiber_goal: split7(wFib),
            }
          : {
              calories_goal: Number(dayGoals[i]?.calories) || 0,
              carbs_goal: Number(dayGoals[i]?.carbs) || 0,
              protein_goal: Number(dayGoals[i]?.protein) || 0,
              fiber_goal: Number(dayGoals[i]?.fiber) || 0,
            };

      // update each item's date to match the new day ISO (keeps consistency)
      const items: Item[] = (old?.items ?? []).map((it) => ({
        ...it,
        // tolerate both Date|string stored previously
        date:
          typeof it.date === "string"
            ? newDateISO
            : // if it was a Date, replace with ISO string to keep shape consistent
              newDateISO,
      }));

      return {
        date: newDateISO,
        ...g,
        items,
      };
    });

    const totals =
      mode === "weekly"
        ? {
            calories_goal: wCal,
            carbs_goal: wCarb,
            protein_goal: wProt,
            fiber_goal: wFib,
          }
        : {
            calories_goal: dailyTotals.calories,
            carbs_goal: dailyTotals.carbs,
            protein_goal: dailyTotals.protein,
            fiber_goal: dailyTotals.fiber,
          };

    return {
      ...week,
      week_name: name.trim(),
      start: startISO,
      end: endISO,
      ...totals,
      days,
    };
  };

  // dirty check
  const initialJSON = useMemo(() => JSON.stringify(week), [week]);
  const isDirty = useMemo(
    () => JSON.stringify(buildPreviewWeek()) !== initialJSON,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, startISO, mode, wCal, wCarb, wProt, wFib, dayGoals]
  );

  // save
  const handleSave = () => {
    const updated = buildPreviewWeek();
    if (onSubmit) onSubmit(updated);
    else if (setWeek) setWeek(updated);
    close();
  };

  // exit flow like DayPopover
  const [showExitChoices, setShowExitChoices] = useState(false);
  const attemptClose = () => {
    if (isDirty) setShowExitChoices(true);
    else close();
  };

  return (
    <Popover closeTrigger={attemptClose}>
      {/* Close X */}
      <button
        onClick={attemptClose}
        aria-label="Close"
        className="absolute top-5 right-4 text-black text-3xl leading-none"
      >
        ×
      </button>

      <div className="relative p-4 overflow-y-auto overflow-x-hidden max-h-[80vh]">
        <h3 className="text-lg font-semibold">Edit Week</h3>

        {/* Week name */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-black">
            Week Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        {/* Start date (editable) */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-black">
            Start Date
          </label>
          <input
            type="date"
            value={startISO}
            onChange={(e) => setStartISO(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
          <p className="text-xs text-black/60 mt-1">
            End:{" "}
            {parseLocalISO(endISO).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mt-4">
          <div className="flex w-full rounded-xl overflow-hidden border border-gray-400">
            <button
              type="button"
              onClick={() => setMode("weekly")}
              className={`flex-1 py-2 ${
                mode === "weekly"
                  ? "bg-[#372d66ff] text-white"
                  : "bg-white text-black"
              }`}
            >
              Weekly totals
            </button>
            <button
              type="button"
              onClick={() => setMode("daily")}
              className={`flex-1 py-2 ${
                mode === "daily"
                  ? "bg-[#372d66ff] text-white"
                  : "bg-white text-black"
              }`}
            >
              Daily goals
            </button>
          </div>
          <p className="text-xs opacity-70 mt-1 text-black">
            {mode === "weekly"
              ? "Set weekly totals; per-day goals will be spread evenly."
              : "Edit each day's goals; weekly totals will be summed automatically."}
          </p>
        </div>

        {/* Weekly totals editor */}
        {mode === "weekly" && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-black">
                Calories (weekly)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                value={wCal}
                onChange={(e) => setWCal(Number(e.target.value) || 0)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black">
                Carbs (g, weekly)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                value={wCarb}
                onChange={(e) => setWCarb(Number(e.target.value) || 0)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black">
                Protein (g, weekly)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                value={wProt}
                onChange={(e) => setWProt(Number(e.target.value) || 0)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black">
                Fiber (g, weekly)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                value={wFib}
                onChange={(e) => setWFib(Number(e.target.value) || 0)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
          </div>
        )}

        {/* Daily goals editor */}
        {mode === "daily" && (
          <div className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 7 }).map((_, i) => {
                const dateObj = dayDates[i];
                const weekdayShort = dateObj
                  ? dateObj.toLocaleDateString("en-US", { weekday: "short" })
                  : "";
                const dateText = dateObj
                  ? dateObj.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "";
                const g = dayGoals[i];

                return (
                  <div
                    key={i}
                    className="border border-gray-300 rounded-md p-2 bg-white"
                  >
                    <div className="flex items-baseline justify-between">
                      <h5 className="text-sm font-semibold text-black">
                        {weekdayShort}
                      </h5>
                      <span className="text-[11px] text-black/70">
                        {dateText}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-black/70">
                          Cal
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={g.calories}
                          onChange={(e) =>
                            handleDayGoalChange(i, "calories", e.target.value)
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-black/70">
                          Carbs
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={g.carbs}
                          onChange={(e) =>
                            handleDayGoalChange(i, "carbs", e.target.value)
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-black/70">
                          Protein
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={g.protein}
                          onChange={(e) =>
                            handleDayGoalChange(i, "protein", e.target.value)
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-black/70">
                          Fiber
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={g.fiber}
                          onChange={(e) =>
                            handleDayGoalChange(i, "fiber", e.target.value)
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-1"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weekly totals summary (from daily inputs) */}
            <div className="mt-4 border border-gray-300 rounded-md p-3 bg-white">
              <h6 className="text-sm font-semibold text-black mb-2">
                Weekly totals
              </h6>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-black">
                <div>
                  <div className="text-xs opacity-70">Calories</div>
                  <div className="font-semibold">{dailyTotals.calories}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Carbs</div>
                  <div className="font-semibold">{dailyTotals.carbs}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Protein</div>
                  <div className="font-semibold">{dailyTotals.protein}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Fiber</div>
                  <div className="font-semibold">{dailyTotals.fiber}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary actions */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={attemptClose}
            className="flex-1 flex justify-center items-center py-2 rounded-xl border border-gray-400 bg-white shadow-xl hover:bg-gray-50"
          >
            <span className="text-black text-lg font-semibold tracking-wider">
              Cancel
            </span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex-1 flex justify-center items-center py-2 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
          >
            <span className="text-white text-lg font-semibold tracking-wider">
              Save
            </span>
          </button>
        </div>

        {/* Save / Exit choice sheet (like DayPopover) */}
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
                    handleSave(); // save then close
                  }}
                  className="py-2 rounded-xl border border-gray-400 bg-[#372d66ff] hover:bg-[#3c365bff] text-white font-semibold"
                >
                  Save & exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Popover>
  );
}
