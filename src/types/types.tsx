export type SavedFood = {
  id: string; // uuid or timestamp-based id
  name: string;
  calories: number;
  carbs?: number;
  protein?: number;
  fiber?: number;
};

export type Item = {
  date: string; // ISO yyyy-mm-dd
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
  start: string; // ISO yyyy-mm-dd
  end: string;
  week_name: string;
  calories_goal: number;
  carbs_goal: number;
  protein_goal: number;
  fiber_goal: number;
  days: Day[];
};

export type User = {
  user: string;
  pin?: string;
  weeks: Week[];
  saved_foods?: SavedFood[]; // 👈 new
};
