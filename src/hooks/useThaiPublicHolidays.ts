import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  buildHolidayDateMap,
  fetchThaiPublicHolidaysForYears,
  type ThaiPublicHoliday,
} from "@/lib/thaiPublicHolidays";

export function useThaiPublicHolidays(years: number[]) {
  const yearKey = useMemo(
    () => [...new Set(years)].sort((a, b) => a - b).join(","),
    [years],
  );

  const [holidays, setHolidays] = useState<ThaiPublicHoliday[]>([]);
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

  const byDate = useMemo(() => buildHolidayDateMap(holidays), [holidays]);

  const getHolidaysForDay = useCallback(
    (day: Date): ThaiPublicHoliday[] => byDate.get(format(day, "yyyy-MM-dd")) ?? [],
    [byDate],
  );

  return { getHolidaysForDay, loading, error, holidays };
}
