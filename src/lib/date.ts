// src/lib/date.ts
export function parseLocalISO(value: string | Date): Date {
  if (value instanceof Date) {
    // Already a Date → just return NEW Date copy (local)
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  // Otherwise treat as "YYYY-MM-DD"
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDaysLocal(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
