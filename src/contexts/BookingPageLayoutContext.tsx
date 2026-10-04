import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type BookingPageLayout = "both" | "calendar" | "form";

const LAYOUT_STORAGE_KEY = "booking-page-layout";

function loadBookingPageLayout(): BookingPageLayout {
  try {
    const v = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (v === "both" || v === "calendar" || v === "form") return v;
  } catch {
    /* ignore */
  }
  return "both";
}

type BookingPageLayoutContextValue = {
  pageLayout: BookingPageLayout;
  setPageLayout: (layout: BookingPageLayout) => void;
  showCalendar: boolean;
  showForm: boolean;
};

const BookingPageLayoutContext = createContext<BookingPageLayoutContextValue | null>(null);

export function BookingPageLayoutProvider({ children }: { children: React.ReactNode }) {
  const [pageLayout, setPageLayoutState] = useState<BookingPageLayout>(loadBookingPageLayout);

  useEffect(() => {
    try {
      if (localStorage.getItem(LAYOUT_STORAGE_KEY) != null) return;
      if (window.matchMedia("(max-width: 767px)").matches) {
        setPageLayoutState("form");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setPageLayout = useCallback((layout: BookingPageLayout) => {
    setPageLayoutState(layout);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    (): BookingPageLayoutContextValue => ({
      pageLayout,
      setPageLayout,
      showCalendar: pageLayout === "both" || pageLayout === "calendar",
      showForm: pageLayout === "both" || pageLayout === "form",
    }),
    [pageLayout, setPageLayout],
  );

  return (
    <BookingPageLayoutContext.Provider value={value}>{children}</BookingPageLayoutContext.Provider>
  );
}

export function useBookingPageLayout() {
  const ctx = useContext(BookingPageLayoutContext);
  if (!ctx) {
    throw new Error("useBookingPageLayout must be used within BookingPageLayoutProvider");
  }
  return ctx;
}

/** ใช้ในหน้าที่อาจไม่มี provider — ค่าเริ่มต้น */
export function useBookingPageLayoutOptional() {
  return useContext(BookingPageLayoutContext);
}
