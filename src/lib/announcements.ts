export const ANNOUNCEMENTS_COLLECTION = "announcements";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  authorEmail?: string;
  authorName?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export function announcementUpdatedKey(row: Announcement): string {
  const ts = row.updatedAt as { toMillis?: () => number } | undefined;
  if (ts && typeof ts.toMillis === "function") {
    return String(ts.toMillis());
  }
  return String(row.id);
}

const DISMISS_STORAGE_KEY = "dismissedPublicAnnouncement";

export function loadDismissedAnnouncementKey(): string | null {
  try {
    return localStorage.getItem(DISMISS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveDismissedAnnouncementKey(key: string): void {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, key);
  } catch {
    /* ignore */
  }
}

export function announcementSortTime(row: Announcement): number {
  const ts = row.updatedAt as { toMillis?: () => number } | undefined;
  if (ts?.toMillis) return ts.toMillis();
  const c = row.createdAt as { toMillis?: () => number } | undefined;
  if (c?.toMillis) return c.toMillis();
  return 0;
}

export function sortAnnouncementsNewestFirst(rows: Announcement[]): Announcement[] {
  return [...rows].sort((a, b) => announcementSortTime(b) - announcementSortTime(a));
}

export function pickActiveAnnouncementForPublic(rows: Announcement[]): Announcement | null {
  const active = rows.filter((r) => r.isActive && r.title?.trim());
  if (active.length === 0) return null;
  return sortAnnouncementsNewestFirst(active)[0];
}

export function shouldShowPublicAnnouncement(row: Announcement | null): boolean {
  if (!row) return false;
  const dismissKey = loadDismissedAnnouncementKey();
  const currentKey = `${row.id}:${announcementUpdatedKey(row)}`;
  return dismissKey !== currentKey;
}
