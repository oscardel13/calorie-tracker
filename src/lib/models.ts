// src/lib/models.ts
export type SavedFood = {
  id: string; // uuid or timestamp-based id
  name: string;
  calories: number;
  carbs?: number;
  protein?: number;
  fiber?: number;
};

export type Item = {
  date: string;
  name?: string;
  calories: number;
  carbs?: number;
  fiber?: number;
  protein?: number;
};

export type Day = {
  date: string; // ISO yyyy-mm-dd
  calories_goal: number;
  carbs_goal: number;
  protein_goal: number;
  fiber_goal: number;
  items: Item[];
};

export type Week = {
  _id?: string; // for Mongo (optional on client)
  start: string;
  end: string;
  week_name: string;
  calories_goal: number;
  carbs_goal: number;
  protein_goal: number;
  fiber_goal: number;
  days: Day[];
};

export type User = {
  _id?: string; // for Mongo
  user: string; // "oscar"
  pin: string; // "1234"
  weeks: Week[];
  saved_foods?: SavedFood[]; // 👈 new
};
