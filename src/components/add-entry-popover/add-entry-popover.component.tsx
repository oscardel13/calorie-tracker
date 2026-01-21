"use client";

import { useEffect, useMemo, useState } from "react";
import Popover from "../popover/popover.component";
import type { Item, Week, SavedFood } from "@/types/types";
import { useFoodLibrary } from "@/context/food-library.context";

type Props = {
  close: () => void;
  dayISO: string;
  setWeek: React.Dispatch<React.SetStateAction<Week>>;
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

export default function AddEntryPopover({ close, dayISO, setWeek }: Props) {
  const { savedFoods, addSavedFood, removeSavedFood } = useFoodLibrary();

  const [form, setForm] = useState<Item>({
    date: dayISO,
    name: "",
    calories: 0,
    carbs: 0,
    protein: 0,
    fiber: 0,
  });
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // NEW: search + sorting + usage counts
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("alpha");
  const [uses, setUses] = useState<Record<string, number>>({});

  useEffect(() => {
    setUses(loadUses());
  }, []);

  const canSubmit = form.name?.trim() && (form.calories ?? 0) >= 0;

  // helper: bump a template's use count and persist
  const bumpUse = (id: string) => {
    setUses((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      saveUses(next);
      return next;
    });
  };

  // normalize list: filter + order
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
      // Most used: sort by use count desc, then alpha
      arr.sort((a, b) => {
        const ua = uses[a.id] ?? 0;
        const ub = uses[b.id] ?? 0;
        if (ub !== ua) return ub - ua;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
    }
    return arr;
  }, [filteredFoods, sortMode, uses]);

  const handleChange = (field: keyof Item, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        typeof value === "string" && field !== "name"
          ? Number(value || 0)
          : value,
    }));
  };

  const applyTemplate = (t: SavedFood) => {
    // Only bump use count if switching to a new template
    if (selectedTemplateId !== t.id) {
      bumpUse(t.id);
    }

    setSelectedTemplateId(t.id);

    setForm({
      date: dayISO,
      name: t.name,
      calories: t.calories,
      carbs: t.carbs ?? 0,
      protein: t.protein ?? 0,
      fiber: t.fiber ?? 0,
    });
  };

  const onSelectTemplate = (id: string) => {
    const found = orderedFoods.find((f) => f.id === id);
    if (found) applyTemplate(found);
  };

  const handleAdd = () => {
    // add entry to the top of the day
    setWeek((prev) => {
      const idx = prev.days.findIndex((d) => d.date === dayISO);
      if (idx === -1) return prev;
      const days = [...prev.days];
      const newItems = [{ ...form, date: dayISO }, ...days[idx].items];
      days[idx] = { ...days[idx], items: newItems };
      return { ...prev, days };
    });

    // optionally save template
    if (saveAsTemplate && addSavedFood) {
      addSavedFood({
        name: form.name?.trim() || "Untitled",
        calories: form.calories ?? 0,
        carbs: form.carbs ?? 0,
        protein: form.protein ?? 0,
        fiber: form.fiber ?? 0,
      });
    }

    close();
  };

  const confirmRemove = (id: string, name: string) => {
    const ok = window.confirm(`Remove “${name}” from your saved foods?`);
    if (!ok) return;
    if (removeSavedFood) {
      removeSavedFood(id);
    }
    // clear selection if deleted
    if (selectedTemplateId === id) setSelectedTemplateId("");
    // also drop stale count locally
    setUses((prev) => {
      const { [id]: _, ...rest } = prev;
      saveUses(rest);
      return rest;
    });
  };

  return (
    <Popover closeTrigger={close}>
      <div className="p-4 overflow-y-auto overflow-x-hidden">
        <h3 className="text-lg font-semibold">Add Entry</h3>

        {/* Search + Sort row */}
        {baseFoods.length > 0 && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
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
        )}

        {/* Dropdown to prefill */}
        {orderedFoods.length > 0 && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-black">
              Choose from library
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
        )}

        {/* Quick chips */}
        {orderedFoods.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-semibold text-black">
              Or tap a quick item
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {orderedFoods.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-gray-300 bg-white cursor-pointer"
                  onClick={() => applyTemplate(f)}
                  title={uses[f.id] ? `${uses[f.id]}× used` : ""}
                >
                  <span className="text-xs text-black">
                    {f.name}
                    {uses[f.id] ? ` (${uses[f.id]}×)` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmRemove(f.id, f.name);
                    }}
                    className="text-black text-xs leading-none"
                    aria-label={`Remove ${f.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Manual form */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-black">Name</label>
          <input
            type="text"
            value={form.name ?? ""}
            onChange={(e) => handleChange("name", e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium text-black">
              Calories
            </label>
            <input
              type="number"
              value={form.calories ?? 0}
              onChange={(e) => handleChange("calories", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black">
              Carbs
            </label>
            <input
              type="number"
              value={form.carbs ?? 0}
              onChange={(e) => handleChange("carbs", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black">
              Protein
            </label>
            <input
              type="number"
              value={form.protein ?? 0}
              onChange={(e) => handleChange("protein", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black">
              Fiber
            </label>
            <input
              type="number"
              value={form.fiber ?? 0}
              onChange={(e) => handleChange("fiber", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>

        {/* Save to library */}
        <label className="mt-3 flex items-center gap-2 text-black">
          <input
            type="checkbox"
            checked={saveAsTemplate}
            onChange={(e) => setSaveAsTemplate(e.target.checked)}
          />
          Save to food library
        </label>

        <div className="mt-4 flex gap-2">
          <button
            onClick={close}
            className="flex-1 flex justify-center items-center py-2 rounded-xl border border-gray-400 bg-white shadow-xl hover:bg-gray-50"
          >
            <span className="text-black text-lg font-semibold tracking-wider">
              Cancel
            </span>
          </button>
          <button
            disabled={!canSubmit}
            onClick={handleAdd}
            className="flex-1 flex justify-center items-center py-2 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff] disabled:opacity-50"
          >
            <span className="text-white text-lg font-semibold tracking-wider">
              Add Entry
            </span>
          </button>
        </div>
      </div>
    </Popover>
  );
}
