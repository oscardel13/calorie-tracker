// src/lib/repo.ts
import type { User, Week, SavedFood } from "./models";

const KEY = "caltrack.users";

function load(): Record<string, User> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

function save(data: Record<string, User>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

const ensureArray = <T>(val: T[] | undefined): T[] =>
  Array.isArray(val) ? val : [];

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const repo = {
  // No-op: do not auto-create any users
  async ensureSeed(): Promise<void> {
    return;
  },

  async getUser(user: string): Promise<User | null> {
    const db = load();
    return db[user] ?? null;
  },

  async upsertUser(u: User): Promise<void> {
    const db = load();
    db[u.user] = u;
    save(db);
  },

  async addWeek(user: string, week: Week): Promise<User | null> {
    const db = load();
    const u = db[user];
    if (!u) return null;
    u.weeks = [...u.weeks, week];
    save(db);
    return u;
  },

  async updateLatestWeek(
    user: string,
    updater: (prev: Week) => Week
  ): Promise<User | null> {
    const db = load();
    const u = db[user];
    if (!u || u.weeks.length === 0) return null;
    const i = u.weeks.length - 1;
    u.weeks[i] = updater(u.weeks[i]);
    save(db);
    return u;
  },

  // --------------- Saved Foods ---------------
  async listSavedFoods(user: string): Promise<SavedFood[]> {
    const db = load();
    const u = db[user];
    if (!u) return [];
    return ensureArray(u.saved_foods);
  },

  async addSavedFood(
    user: string,
    food: Omit<SavedFood, "id">
  ): Promise<SavedFood[] | null> {
    const db = load();
    const u = db[user];
    if (!u) return null;
    const arr = ensureArray(u.saved_foods);
    const newRec: SavedFood = { id: genId(), ...food };
    u.saved_foods = [newRec, ...arr];
    save(db);
    return u.saved_foods;
  },

  async updateSavedFood(
    user: string,
    food: SavedFood
  ): Promise<SavedFood[] | null> {
    const db = load();
    const u = db[user];
    if (!u) return null;
    const arr = ensureArray(u.saved_foods);
    const idx = arr.findIndex((f) => f.id === food.id);
    if (idx === -1) return arr;
    arr[idx] = food;
    u.saved_foods = [...arr];
    save(db);
    return u.saved_foods;
  },

  async removeSavedFood(user: string, id: string): Promise<SavedFood[] | null> {
    const db = load();
    const u = db[user];
    if (!u) return null;
    u.saved_foods = ensureArray(u.saved_foods).filter((f) => f.id !== id);
    save(db);
    return u.saved_foods;
  },
};
