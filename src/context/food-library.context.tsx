"use client";
import { createContext, useContext } from "react";
import type { SavedFood } from "@/types/types";

type Ctx = {
  savedFoods: SavedFood[];
  addSavedFood: (f: Omit<SavedFood, "id">) => Promise<void> | void;
  removeSavedFood: (id: string) => Promise<void> | void;
};

const FoodLibraryContext = createContext<Ctx | null>(null);

export function useFoodLibrary() {
  const ctx = useContext(FoodLibraryContext);
  if (!ctx)
    throw new Error("useFoodLibrary must be used within FoodLibraryProvider");
  return ctx;
}

export function FoodLibraryProvider({
  value,
  children,
}: {
  value: Ctx;
  children: React.ReactNode;
}) {
  return (
    <FoodLibraryContext.Provider value={value}>
      {children}
    </FoodLibraryContext.Provider>
  );
}
