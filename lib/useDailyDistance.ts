"use client";

import { useEffect, useState } from "react";

type DailyResult = {
  dailyKm: number;
  startMileage: number | null;
};

export function useDailyDistance(unitId: number | null, mileage: number | null): DailyResult {
  const [dailyKm, setDailyKm] = useState(0);
  const [startMileage, setStartMileage] = useState<number | null>(null);

  useEffect(() => {
    if (!unitId || mileage == null) return;

    const today = new Date().toISOString().slice(0, 10);
    const key = `daily_start_${unitId}_${today}`;

    let stored = localStorage.getItem(key);

    if (!stored) {
      localStorage.setItem(key, String(mileage));
      stored = String(mileage);
    }

    const start = Number(stored);
    setStartMileage(start);

    const diff = mileage - start;
    setDailyKm(diff > 0 ? Number(diff.toFixed(2)) : 0);
  }, [unitId, mileage]);

  return { dailyKm, startMileage };
}