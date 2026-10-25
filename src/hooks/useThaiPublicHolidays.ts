import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  buildHolidayDateMap,
  fetchThaiPublicHolidaysForYears,
  type ThaiPublicHoliday,
} from "@/lib/thaiPublicHolidays";
import {
  CUSTOM_HOLIDAYS_COLLECTION,
  customHolidayToPublic,
  type CustomHoliday,
} from "@/lib/customHolidays";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export function useThaiPublicHolidays(years: number[]) {
  const yearKey = useMemo(
    () => [...new Set(years)].sort((a, b) => a - b).join(","),
    [years],
  );

  const [holidays, setHolidays] = useState<ThaiPublicHoliday[]>([]);
  const [customRows, setCustomRows] = useState<CustomHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const parsed = yearKey
      ? yearKey.split(",").map((y) => parseInt(y, 10))
      : [new Date().getFullYear()];
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchThaiPublicHolidaysForYears(parsed)
      .then((list) => {
        if (!cancelled) setHolidays(list);
      })
      .catch(() => {
        if (!cancelled) {
          setHolidays([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [yearKey]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, CUSTOM_HOLIDAYS_COLLECTION),
      (snap) => {
        setCustomRows(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomHoliday),
        );
      },
      () => setCustomRows([]),
    );
    return () => unsub();
  }, []);

  const mergedHolidays = useMemo(() => {
    const parsed = yearKey
      ? yearKey.split(",").map((y) => parseInt(y, 10))
      : [new Date().getFullYear()];
    const yearSet = new Set(parsed);
    const custom = customRows
      .filter((row) => {
        if (!row.date) return false;
        const y = parseInt(row.date.slice(0, 4), 10);
        return yearSet.has(y);
      })
      .map(customHolidayToPublic);
    return [...holidays, ...custom];
  }, [holidays, customRows, yearKey]);

  const byDate = useMemo(() => buildHolidayDateMap(mergedHolidays), [mergedHolidays]);

  const getHolidaysForDay = useCallback(
    (day: Date): ThaiPublicHoliday[] => byDate.get(format(day, "yyyy-MM-dd")) ?? [],
    [byDate],
  );

  return { getHolidaysForDay, loading, error, holidays: mergedHolidays };
}
