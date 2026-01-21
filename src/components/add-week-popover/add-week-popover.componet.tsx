"use client";

import { useEffect, useMemo, useState } from "react";
import Popover from "../popover/popover.component";
import { buildWeek } from "@/utils/week.utils";
import type { Week as AddWeekData, Week, Day } from "@/types/types";
import { parseLocalISO, addDaysLocal, toLocalISO } from "@/lib/date";

type Mode = "weekly" | "daily";

type AddWeekFormState = {
  weekName: string;
  startDate: string; // "YYYY-MM-DD"
  caloriesGoal: string; // weekly total (weekly mode)
  carbsGoal: string;
  proteinGoal: string;
  fiberGoal: string;
};

type DayGoalInputs = Array<{
  calories: string;
  carbs: string;
  protein: string;
  fiber: string;
}>;

export default function AddWeekPopover({
  close,
  onSubmit,
  lastWeek,
}: {
  close: () => void;
  onSubmit?: (data: AddWeekData) => void;
  lastWeek?: Week | null;
}) {
  const [mode, setMode] = useState<Mode>("weekly");
  const [form, setForm] = useState<AddWeekFormState>({
    weekName: "",
    startDate: "",
    caloriesGoal: "",
    carbsGoal: "",
    proteinGoal: "",
    fiberGoal: "",
  });

  const [dayGoals, setDayGoals] = useState<DayGoalInputs>(
    Array.from({ length: 7 }, () => ({
      calories: "",
      carbs: "",
      protein: "",
      fiber: "",
    }))
  );

  // Auto-name week when start date selected (only if name is empty)
  useEffect(() => {
    if (!form.startDate || form.weekName.trim()) return;
    const s = parseLocalISO(form.startDate);
    const e = addDaysLocal(s, 6);
    const sTxt = s.toLocaleString("en-US", { month: "short", day: "numeric" });
    const eTxt = e.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    setForm((prev) => ({ ...prev, weekName: `Week • ${sTxt}–${eTxt}` }));
  }, [form.startDate, form.weekName]);

  // Real dates for the 7 days (based on selected start date)
  const dayDates: Date[] = useMemo(() => {
    if (!form.startDate) return [];
    const s = parseLocalISO(form.startDate);
    return Array.from({ length: 7 }).map((_, i) => addDaysLocal(s, i));
  }, [form.startDate]);

  // Computed weekly totals from the daily grid (for the summary)
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

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

  const parseNum = (v: string) => (v === "" ? 0 : Number(v));

  const isSubmitDisabled =
    !form.weekName.trim() ||
    !form.startDate ||
    (mode === "weekly" && !form.caloriesGoal);

  // Repeat last week: now under Start Date; auto-fills daily goals + weekly totals + next start date
  const handleRepeatLastWeek = () => {
    if (!lastWeek) return;

    // next start = day after lastWeek.end
    const lastEnd = parseLocalISO(lastWeek.end);
    const nextStart = addDaysLocal(lastEnd, 1);

    // Prefill daily grid
    const dg: DayGoalInputs = Array.from({ length: 7 }).map((_, i) => {
      const d = lastWeek.days[i];
      return {
        calories: String(Math.round(d?.calories_goal ?? 0)),
        carbs: String(Math.round(d?.carbs_goal ?? 0)),
        protein: String(Math.round(d?.protein_goal ?? 0)),
        fiber: String(Math.round(d?.fiber_goal ?? 0)),
      };
    });

    // Prefill weekly totals based on lastWeek totals
    setForm((prev) => ({
      ...prev,
      // weekName: lastWeek.week_name || prev.weekName,
      startDate: toLocalISO(nextStart),
      caloriesGoal: String(Math.round(lastWeek.calories_goal ?? 0)),
      carbsGoal: String(Math.round(lastWeek.carbs_goal ?? 0)),
      proteinGoal: String(Math.round(lastWeek.protein_goal ?? 0)),
      fiberGoal: String(Math.round(lastWeek.fiber_goal ?? 0)),
    }));

    setDayGoals(dg);
    setMode("daily"); // edit per-day by default after repeating
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "weekly") {
      const calories = Number(form.caloriesGoal);
      if (Number.isNaN(calories)) return;

      const carbs = parseNum(form.carbsGoal);
      const protein = parseNum(form.proteinGoal);
      const fiber = parseNum(form.fiberGoal);

      // Use builder: spreads weekly totals evenly per day
      const week = buildWeek({
        weekName: form.weekName.trim(),
        startISO: form.startDate,
        caloriesGoal: calories,
        carbsGoal: carbs,
        proteinGoal: protein,
        fiberGoal: fiber,
      });

      onSubmit?.(week);
      close();
      return;
    }

    // DAILY MODE: build exact per-day goals
    const start = parseLocalISO(form.startDate);
    const days: Day[] = Array.from({ length: 7 }).map((_, i) => {
      const dt = addDaysLocal(start, i);
      const iso = toLocalISO(dt);
      const g = dayGoals[i];
      return {
        date: iso,
        calories_goal: parseNum(g.calories),
        carbs_goal: parseNum(g.carbs),
        protein_goal: parseNum(g.protein),
        fiber_goal: parseNum(g.fiber),
        items: [],
      };
    });

    const end = addDaysLocal(start, 6);
    const week: AddWeekData = {
      week_name: form.weekName.trim(),
      start: toLocalISO(start),
      end: toLocalISO(end),
      calories_goal: dailyTotals.calories,
      carbs_goal: dailyTotals.carbs,
      protein_goal: dailyTotals.protein,
      fiber_goal: dailyTotals.fiber,
      days,
    };

    onSubmit?.(week);
    close();
  };

  return (
    <Popover closeTrigger={close}>
      <form
        onSubmit={handleSubmit}
        className="p-4 overflow-y-auto overflow-x-hidden max-h-[80vh]"
      >
        <h3 className="text-lg font-semibold">Add Week</h3>

        {/* Week Name */}
        <div className="mt-4">
          <label
            htmlFor="weekName"
            className="block text-sm font-medium text-black"
          >
            Week Name
          </label>
          <input
            id="weekName"
            name="weekName"
            type="text"
            value={form.weekName}
            onChange={handleChange}
            placeholder="e.g., Week • Nov 3–9, 2025"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>

        {/* Start Date */}
        <div className="mt-4">
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-black"
          >
            Start Date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p"
            required
          />
          {/* Repeat last week UNDER start date */}
          <div className="mt-3">
            <button
              type="button"
              onClick={handleRepeatLastWeek}
              disabled={!lastWeek}
              className="w-full flex justify-center items-center py-2 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff] disabled:opacity-50 disabled:cursor-not-allowed"
              title={lastWeek ? "Prefill from last week" : "No previous week"}
            >
              <span className="text-white text-lg font-semibold tracking-wider">
                Repeat last week
              </span>
            </button>
          </div>
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
            To check how many calories you should consume, use this{" "}
            <a
              className="font-semibold"
              href="https://www.calculator.net/calorie-calculator.html"
            >
              Calorie Calculator
            </a>
          </p>
          <p className="text-xs opacity-70 mt-1 text-black">
            {mode === "weekly"
              ? "Enter one weekly total; per-day goals will be spread evenly."
              : "Enter goals for each day; weekly totals are summed below."}
          </p>
        </div>

        {/* Weekly totals inputs */}
        {mode === "weekly" && (
          <>
            <div className="mt-4">
              <label
                htmlFor="caloriesGoal"
                className="block text-sm font-medium text-black"
              >
                Calories (weekly total)
              </label>
              <input
                id="caloriesGoal"
                name="caloriesGoal"
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                value={form.caloriesGoal}
                onChange={handleChange}
                placeholder="e.g., 12000"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                required
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="carbsGoal"
                className="block text-sm font-medium text-black"
              >
                Carbs (g, weekly total)
              </label>
              <input
                id="carbsGoal"
                name="carbsGoal"
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                value={form.carbsGoal}
                onChange={handleChange}
                placeholder="optional"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="proteinGoal"
                className="block text-sm font-medium text-black"
              >
                Protein (g, weekly total)
              </label>
              <input
                id="proteinGoal"
                name="proteinGoal"
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                value={form.proteinGoal}
                onChange={handleChange}
                placeholder="optional"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="fiberGoal"
                className="block text-sm font-medium text-black"
              >
                Fiber (g, weekly total)
              </label>
              <input
                id="fiberGoal"
                name="fiberGoal"
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                value={form.fiberGoal}
                onChange={handleChange}
                placeholder="optional"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
          </>
        )}

        {/* Daily goals grid */}
        {mode === "daily" && (
          <div className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 7 }).map((_, i) => {
                const dateObj = dayDates[i];
                const weekdayShort = dateObj
                  ? dateObj.toLocaleDateString("en-US", { weekday: "short" })
                  : ""; // Mon/Tue... based on startDate
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
                          inputMode="numeric"
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
                          inputMode="numeric"
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
                          inputMode="numeric"
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
                          inputMode="numeric"
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

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="flex-1 flex justify-center items-center py-2 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-white text-lg font-semibold tracking-wider">
              Add Week
            </span>
          </button>
        </div>
      </form>
    </Popover>
  );
}
