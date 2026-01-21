// src/components/new_week_section/new_week_section.component.tsx
"use client";

import { useState } from "react";
import type { Week } from "@/lib/models";
import { buildWeek } from "@/lib/week";
import AddWeekPopover from "../add-week-popover/add-week-popover.componet";

export default function NewWeekSection({
  onCreateWeek,
  latestWeek,
}: {
  onCreateWeek: (week: Week) => void;
  latestWeek: Week | null;
}) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((p) => !p);

  return (
    <section className="my-6">
      <button
        onClick={toggle}
        className="flex justify-center items-center w-full py-2 px-4 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
      >
        <span className="text-white text-lg font-semibold tracking-wider">
          Add Week
        </span>
      </button>

      {open && (
        <AddWeekPopover
          close={toggle}
          onSubmit={(week) => {
            onCreateWeek(week);
          }}
          lastWeek={latestWeek}
        />
      )}
    </section>
  );
}
