"use client";

import { useEffect, useMemo, useState } from "react";
import Popover from "../popover/popover.component";
import type { Day, Item, Week, SavedFood } from "@/types/types";
import { useFoodLibrary } from "@/context/food-library.context";

type Props = {
  close: () => void;
  dayISO: string; // e.g. "2025-11-03"
  day: Day; // current day (for goals & existing totals)
  setWeek: React.Dispatch<React.SetStateAction<Week>>; // (unused now, but keeping signature)
};

type Draft = {
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fiber: number;
};

type SortMode = "alpha" | "used";

const USES_KEY = "caltrack.foodUses"; // { [foodId]: number }
function loadUses(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(USES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveUses(map: Record<string, number>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USES_KEY, JSON.stringify(map));
}

export default function DayPlanPopover({ close, dayISO, day }: Props) {
  const { savedFoods, addSavedFood } = useFoodLibrary();

  const [drafts, setDrafts] = useState<Draft[]>([]);

  // per-row “saved” flags to prevent double-saves
  const [savedRow, setSavedRow] = useState<Record<number, boolean>>({});

  // --- Saved foods helpers (search/sort/uses) ---
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("alpha");
  const [uses, setUses] = useState<Record<string, number>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  useEffect(() => {
    setUses(loadUses());
  }, []);

  const bumpUse = (id: string) => {
    setUses((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      saveUses(next);
      return next;
    });
  };

  const baseFoods = useMemo(() => savedFoods ?? [], [savedFoods]);

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseFoods;
    return baseFoods.filter((f) => f.name.toLowerCase().includes(q));
  }, [baseFoods, search]);

  const orderedFoods = useMemo(() => {
    const arr = filteredFoods.slice();
    if (sortMode === "alpha") {
      arr.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    } else {
      arr.sort((a, b) => {
        const ua = uses[a.id] ?? 0;
        const ub = uses[b.id] ?? 0;
        if (ub !== ua) return ub - ua;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
    }
    return arr;
  }, [filteredFoods, sortMode, uses]);

  // current actual totals (already logged)
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

  // planned totals (from drafts)
  const planned = useMemo(() => {
    return drafts.reduce(
      (acc, it) => {
        acc.calories += Number(it.calories) || 0;
        acc.carbs += Number(it.carbs) || 0;
        acc.protein += Number(it.protein) || 0;
        acc.fiber += Number(it.fiber) || 0;
        return acc;
      },
      { calories: 0, carbs: 0, protein: 0, fiber: 0 }
    );
  }, [drafts]);

  // remaining after plan
  const remaining = useMemo(() => {
    return {
      calories: Math.ceil(
        day.calories_goal - (current.calories + planned.calories)
      ),
      carbs:
        day.carbs_goal > 0
          ? Math.ceil(day.carbs_goal - (current.carbs + planned.carbs))
          : Math.max(
              0,
              Math.ceil(day.carbs_goal - (current.carbs + planned.carbs))
            ),
      protein: Math.max(
        Math.ceil(day.protein_goal - (current.protein + planned.protein)),
        0
      ),
      fiber: Math.max(
        Math.ceil(day.fiber_goal - (current.fiber + planned.fiber)),
        0
      ),
    };
  }, [day, current, planned]);

  // --- planned rows CRUD ---
  const handleChange = (index: number, field: keyof Draft, value: string) => {
    setDrafts((prev) => {
      const next = [...prev];
      const v = field === "name" ? value : Number(value || 0);
      next[index] = { ...next[index], [field]: v as any };
      return next;
    });
    // if the row was marked saved, editing it should allow saving again
    setSavedRow((prev) => ({ ...prev, [index]: false }));
  };

  const addRow = () => {
    setDrafts((prev) => [
      { name: "", calories: 0, carbs: 0, protein: 0, fiber: 0 },
      ...prev, // newest on top
    ]);
  };

  const removeRow = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
    setSavedRow((prev) => {
      const { [index]: _, ...rest } = prev;
      // shift keys above index down by 1 to keep alignment
      const fixed: Record<number, boolean> = {};
      Object.keys(rest).forEach((k) => {
        const n = Number(k);
        fixed[n > index ? n - 1 : n] = rest[n];
      });
      return fixed;
    });
  };

  const clearAll = () => {
    setDrafts([]);
    setSavedRow({});
  };

  // Save a single draft row to the library
  const saveRowToLibrary = (i: number) => {
    if (!addSavedFood) return;
    const d = drafts[i];
    const valid =
      (d.name?.trim() || "").length > 0 ||
      d.calories > 0 ||
      d.carbs > 0 ||
      d.protein > 0 ||
      d.fiber > 0;
    if (!valid) return;

    addSavedFood({
      name: d.name?.trim() || "Planned",
      calories: d.calories || 0,
      carbs: d.carbs || 0,
      protein: d.protein || 0,
      fiber: d.fiber || 0,
    });
    setSavedRow((prev) => ({ ...prev, [i]: true }));
  };

  // --- Saved food → add as planned row (no add-to-day) ---
  const addSavedAsPlanned = (f: SavedFood) => {
    // bump "uses" when picking a new one
    if (selectedTemplateId !== f.id) {
      bumpUse(f.id);
      setSelectedTemplateId(f.id);
    }
    setDrafts((prev) => [
      {
        name: f.name,
        calories: f.calories ?? 0,
        carbs: f.carbs ?? 0,
        protein: f.protein ?? 0,
        fiber: f.fiber ?? 0,
      },
      ...prev,
    ]);
  };

  const onSelectTemplate = (id: string) => {
    const found = orderedFoods.find((f) => f.id === id);
    if (found) addSavedAsPlanned(found);
  };

  return (
    <Popover closeTrigger={close}>
      <div className="p-4 overflow-y-auto max-h-[80vh] overflow-x-hidden">
        <h3 className="text-lg font-semibold">Plan Meals</h3>

        {/* Saved foods picker (search / sort / dropdown / chips) */}
        {baseFoods.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-black">
                  Search saved foods
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="type to filter…"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              <div className="sm:w-44">
                <label className="block text-sm font-medium text-black">
                  Sort
                </label>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-black"
                >
                  <option value="alpha">A → Z</option>
                  <option value="used">Most used</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-black">
                Add from library
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => onSelectTemplate(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-black"
              >
                <option value="">— Select saved food —</option>
                {orderedFoods.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} • {f.calories} Cal
                    {uses[f.id] ? ` • ${uses[f.id]}×` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-2">
              <h4 className="text-sm font-semibold text-black">
                Or tap a quick item
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {orderedFoods.map((f) => (
                  <span
                    key={f.id}
                    className={`inline-flex items-center gap-2 px-2 py-1 rounded-full border border-gray-300 bg-white cursor-pointer ${
                      selectedTemplateId === f.id ? "ring-1 ring-gray-400" : ""
                    }`}
                    onClick={() => addSavedAsPlanned(f)}
                    title={uses[f.id] ? `${uses[f.id]}× used` : ""}
                  >
                    <span className="text-xs text-black">
                      {f.name}
                      {uses[f.id] ? ` (${uses[f.id]}×)` : ""}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary strip */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-black">
          <div className="flex flex-col">
            <h6 className="font-medium">Goals</h6>
            <span>Cal: {Math.ceil(day.calories_goal)}</span>
            <span>Carbs: {Math.ceil(day.carbs_goal)}</span>
            <span>Protein: {Math.ceil(day.protein_goal)}</span>
            <span>Fiber: {Math.ceil(day.fiber_goal)}</span>
          </div>
          <div className="flex flex-col items-center">
            <h6 className="font-medium">Current</h6>
            <span>{current.calories}</span>
            <span>{current.carbs}</span>
            <span>{current.protein}</span>
            <span>{current.fiber}</span>
          </div>
          <div className="flex flex-col items-center">
            <h6 className="font-medium">Planned</h6>
            <span>{planned.calories}</span>
            <span>{planned.carbs}</span>
            <span>{planned.protein}</span>
            <span>{planned.fiber}</span>
          </div>
        </div>

        {/* Remaining after plan */}
        <div className="mt-2">
          <span className="inline-block text-xs opacity-80 border border-gray-400 rounded-full px-2 py-[2px]">
            Remaining after plan — Cal{" "}
            <b
              className={`${
                remaining.calories < 0 ? "text-red-700" : "text-black"
              }`}
            >
              {remaining.calories}
            </b>
            , Carbs{" "}
            <b
              className={`${
                remaining.carbs < 0 ? "text-red-700" : "text-black"
              }`}
            >
              {remaining.carbs}
            </b>
            , Protein <b>{remaining.protein}</b>, Fiber <b>{remaining.fiber}</b>
          </span>
        </div>

        {/* Draft list */}
        <div className="pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addRow}
              className="flex-1 flex justify-center items-center py-1 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
            >
              <span className="text-white font-semibold">Add planned item</span>
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-1 rounded-xl border border-gray-400 bg-white hover:bg-gray-50"
            >
              <span className="text-black font-semibold">Clear</span>
            </button>
          </div>

          <ul className="mt-4 space-y-3">
            {drafts.map((d, i) => {
              const validForSave =
                (d.name?.trim() || "").length > 0 ||
                d.calories > 0 ||
                d.carbs > 0 ||
                d.protein > 0 ||
                d.fiber > 0;

              return (
                <li key={i} className="border border-gray-300 rounded-lg p-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div>
                      <label className="hidden lg:block text-[11px] opacity-70">
                        Name
                      </label>
                      <input
                        type="text"
                        placeholder="Name"
                        value={d.name}
                        onChange={(e) =>
                          handleChange(i, "name", e.target.value)
                        }
                        className="mt-1 block flex-1 border border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                      <div>
                        <label className="block text-[11px] opacity-70">
                          Cal
                        </label>
                        <input
                          type="number"
                          value={d.calories}
                          onChange={(e) =>
                            handleChange(i, "calories", e.target.value)
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] opacity-70">
                          Carbs
                        </label>
                        <input
                          type="number"
                          value={d.carbs}
                          onChange={(e) =>
                            handleChange(i, "carbs", e.target.value)
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] opacity-70">
                          Protein
                        </label>
                        <input
                          type="number"
                          value={d.protein}
                          onChange={(e) =>
                            handleChange(i, "protein", e.target.value)
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] opacity-70">
                          Fiber
                        </label>
                        <input
                          type="number"
                          value={d.fiber}
                          onChange={(e) =>
                            handleChange(i, "fiber", e.target.value)
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 self-start sm:self-auto justify-between w-full lg:w-auto">
                      <button
                        type="button"
                        onClick={() => saveRowToLibrary(i)}
                        disabled={!validForSave || savedRow[i]}
                        className="px-2 py-1 rounded border border-gray-400 rounded-lg bg-white disabled:opacity-50"
                        title={
                          savedRow[i]
                            ? "Saved to library"
                            : "Save this item to your food library"
                        }
                      >
                        {savedRow[i] ? "Saved" : "Save to library"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="px-2 py-1 rounded border border-gray-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer: just close, since planner no longer writes to the day */}
        <div className="mt-4">
          <button
            onClick={close}
            className="w-full flex justify-center items-center py-2 rounded-xl border border-gray-400 bg-white shadow-xl hover:bg-gray-50"
          >
            <span className="text-black text-lg font-semibold tracking-wider">
              Close
            </span>
          </button>
        </div>
      </div>
    </Popover>
  );
}
