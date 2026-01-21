// src/app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WeekListSection from "../components/week_list_section/week_list_section.component";
import NewWeekSection from "../components/new_week_section/new_week_section.component";
import WeekSection from "../components/week_section/week_section.component";
import type { User, Week } from "@/lib/models";
import { repo } from "@/lib/repo";
import InstallA2HS from "@/components/install-a2hs/install-a2hs.component";

// keys used by repo.ts + session helpers
const LS_KEY = "caltrack.users";
const LAST_USER_KEY = "caltrack.lastUser";
const STAY_KEY = "caltrack.staySignedIn";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // existing login states
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // new user onboarding states
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [importErr, setImportErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // seed an empty default user if desired (repo ensures 'oscar' exists empty)
  useEffect(() => {
    repo.ensureSeed().then(async () => {
      // Option A: auto sign-in last user if no PIN or Stay signed in
      const last = localStorage.getItem(LAST_USER_KEY);
      if (!last) return;
      const u = await repo.getUser(last);
      if (!u) return;

      const stay = localStorage.getItem(STAY_KEY) === "1";
      if (stay) {
        setCurrentUser(u);
        return;
      }
      // convenience: prefill username if PIN required
      setUsername(u.user);
    });
  }, []);

  const weeks = currentUser?.weeks ?? [];
  const latestWeek = weeks.length ? weeks[weeks.length - 1] : null;

  // -------- Export / Import helpers --------
  const exportAll = () => {
    try {
      const raw = localStorage.getItem(LS_KEY) ?? "{}";
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `caltrack-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // no-op
    }
  };

  const onChooseImport = () => fileInputRef.current?.click();

  const importAll = async (file: File) => {
    setImportErr(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid JSON");
      }
      localStorage.setItem(LS_KEY, JSON.stringify(parsed));
      // if current user exists in new db, reload it; else log out
      if (currentUser) {
        const reloaded = await repo.getUser(currentUser.user);
        setCurrentUser(reloaded);
      }
      alert("Import complete.");
    } catch (e: any) {
      setImportErr(e?.message ?? "Import failed.");
    }
  };

  // -------- Auth: login / logout / create --------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = await repo.getUser(username.trim());
    if (!u) return setAuthError("User not found");
    if ((u.pin ?? "") !== pin.trim()) return setAuthError("Invalid PIN");
    setAuthError(null);
    setCurrentUser(u);
    localStorage.setItem(LAST_USER_KEY, u.user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsername("");
    setPin("");
    localStorage.removeItem(STAY_KEY);
    // keep STAY_KEY as user's preference; uncomment to clear:
    // localStorage.removeItem(STAY_KEY);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return setAuthError("Please enter your name.");
    const existing = await repo.getUser(name);
    if (existing) return setAuthError("That name is already taken.");
    const newUser: User = { user: name, pin: newPin.trim(), weeks: [] };
    await repo.upsertUser(newUser);
    setCurrentUser(newUser);
    setAuthError(null);
    localStorage.setItem(LAST_USER_KEY, newUser.user);
  };

  // -------- Weeks ops --------
  const addWeek = async (week: Week) => {
    if (!currentUser) return;
    const updated = await repo.addWeek(currentUser.user, week);
    if (updated) setCurrentUser(updated);
  };

  const setLatestWeek = (update: Week | ((prev: Week) => Week)) => {
    if (!currentUser || !latestWeek) return;
    repo
      .updateLatestWeek(currentUser.user, (prev) =>
        typeof update === "function"
          ? (update as (w: Week) => Week)(prev)
          : update
      )
      .then((updated) => {
        if (updated) setCurrentUser(updated);
      });
  };

  return (
    <div className="flex flex-col h-full w-full p-10">
      {/* header / nav */}
      <section className="w-full">
        <h1 className="text-white text-7xl font-semibold text-center">
          Calories Tracker
        </h1>
      </section>

      {/* Hidden file input for Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importAll(f);
          e.currentTarget.value = "";
        }}
      />

      {!currentUser ? (
        <>
          {/* Welcome / onboarding */}
          <section className="max-w-3xl w-full mx-auto mt-10 pb-10 text-white">
            <div className="rounded-xl border border-gray-600 p-5">
              <h2 className="text-3xl font-semibold mb-2">Welcome</h2>
              <p className="opacity-80">
                This app saves your data <b>only in this browser</b> (local
                storage). If the browser storage is cleared or you switch
                devices, your data will be lost. You can <b>Export</b> your data
                anytime and later <b>Import</b> it.
              </p>

              {/* Export / Import actions */}
              <div className="flex flex-wrap gap-3 mt-4">
                {/* <button
                  onClick={exportAll}
                  className="px-3 py-1 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
                >
                  <span className="text-white font-semibold">Export Data</span>
                </button>
                <button
                  onClick={onChooseImport}
                  className="px-3 py-1 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
                >
                  <span className="text-white font-semibold">Import Data</span>
                </button> */}
                {importErr && (
                  <span className="text-red-300 text-sm self-center">
                    {importErr}
                  </span>
                )}
                <InstallA2HS />
              </div>
            </div>

            {/* Existing user login */}
            <div className="rounded-xl border border-gray-600 p-5 mt-6">
              <p className="opacity-80 mb-3">
                Log in with your existing name and PIN (if you set one).
              </p>
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="user (e.g., oscar)"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-white"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="pin (if set)"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-white"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                {/* Stay signed in */}
                <label className="flex items-center gap-2 text-white opacity-90">
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      localStorage.setItem(
                        STAY_KEY,
                        e.target.checked ? "1" : "0"
                      )
                    }
                  />
                  Stay signed in
                </label>
                {authError && (
                  <p className="text-red-300 text-sm -mt-1">{authError}</p>
                )}
                <button
                  type="submit"
                  className="flex justify-center items-center py-2 w-full rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
                >
                  <span className="text-white text-lg font-semibold tracking-wider">
                    Enter
                  </span>
                </button>
              </form>
            </div>

            {/* New user create */}
            <div className="rounded-xl border border-gray-600 p-5 mt-6">
              <h3 className="text-2xl font-semibold mb-2">Start fresh</h3>
              <p className="opacity-80 mb-3">
                Enter your name to begin. PIN is optional and can be used later
                if you decide to sync or add security.
              </p>
              <form onSubmit={handleCreate} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Your name (e.g., oscar)"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-white"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="PIN (optional)"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-white"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                />
                {/* Stay signed in */}
                <label className="flex items-center gap-2 text-white opacity-90">
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      localStorage.setItem(
                        STAY_KEY,
                        e.target.checked ? "1" : "0"
                      )
                    }
                  />
                  Stay signed in
                </label>
                {authError && (
                  <p className="text-red-300 text-sm -mt-1">{authError}</p>
                )}
                <button
                  type="submit"
                  className="flex justify-center items-center py-2 w-full rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
                >
                  <span className="text-white text-lg font-semibold tracking-wider">
                    Start
                  </span>
                </button>
              </form>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* top bar */}
          <section className="flex items-center justify-between mt-6">
            <p className="text-white opacity-80">
              Hello, <span className="font-semibold">{currentUser.user}</span>
            </p>
            <div className="flex items-center gap-2">
              {/* <InstallA2HS /> */}
              <button
                onClick={exportAll}
                className="px-3 py-1 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
              >
                <span className="text-white font-semibold">Export</span>
              </button>
              <button
                onClick={onChooseImport}
                className="px-3 py-1 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
              >
                <span className="text-white font-semibold">Import</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1 rounded-xl border border-gray-400 bg-[#372d66ff] shadow-xl hover:bg-[#3c365bff]"
              >
                <span className="text-white font-semibold">Logout</span>
              </button>
            </div>
          </section>

          {/* Add week Entry button */}
          <NewWeekSection onCreateWeek={addWeek} latestWeek={latestWeek} />

          {/* Current week display (latest) */}
          {latestWeek ? (
            <WeekSection
              week={latestWeek}
              setWeek={setLatestWeek}
              savedFoods={currentUser.saved_foods ?? []}
              addSavedFood={async (food) => {
                await repo.addSavedFood(currentUser.user, food);
                const refreshed = await repo.getUser(currentUser.user);
                if (refreshed) setCurrentUser(refreshed);
              }}
              removeSavedFood={async (id) => {
                await repo.removeSavedFood(currentUser.user, id);
                const refreshed = await repo.getUser(currentUser.user);
                if (refreshed) setCurrentUser(refreshed);
              }}
            />
          ) : (
            <p className="text-white mt-4">No weeks yet — add one above.</p>
          )}

          {/* Prev week list */}
          <WeekListSection weeks={weeks} />
        </>
      )}
    </div>
  );
}
