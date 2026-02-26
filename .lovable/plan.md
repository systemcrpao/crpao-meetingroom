

# Meeting Room Reservation System — Implementation Plan

## Overview
A professional, government-style meeting room booking system with Thai language UI, sidebar navigation, and two core pages. All data is mock/local state — no backend integration.

---

## Design & Theme
- **Color palette**: Official blues, whites, and grays — professional and formal
- **Typography**: Clean, modern with proper Thai text support
- **Layout**: Sidebar navigation (using Shadcn Sidebar) + main content area
- **Fully responsive**: Mobile-friendly with collapsible sidebar

---

## Sidebar Navigation
- App logo/title: "ระบบจองห้องประชุม" (Meeting Room Reservation System)
- Two nav items:
  - 📝 **จองห้องประชุม** (Reserve Room) — links to reservation form
  - 📊 **แดชบอร์ดผู้ดูแล** (Admin Dashboard) — links to admin page

---

## Page 1: Reservation Form (จองห้องประชุม)

A card-based form with all 7 fields as specified:

1. **Department** — Select dropdown with 4 Thai department options
2. **Topic/Project Name** — Text input
3. **Date** — Shadcn date picker
4. **Start Time & End Time** — Time select dropdowns (30-min intervals)
5. **Room Selection** — Select dropdown with 5 rooms and capacity info
6. **Equipment** — Checkbox group with 5 equipment options
7. **Booker Name** — Text input
8. **Submit button** — "บันทึกและพิมพ์แบบฟอร์ม" — shows success toast and logs data to console

---

## Page 2: Admin Dashboard (แดชบอร์ดผู้ดูแล)

### Section A: Pending Approvals Table
- Data table with 3 mock pending reservation requests
- Columns: Department, Topic, Room, Date/Time, Booker, Status, Actions
- **Approve** and **Reject** buttons per row (update local state, show toast)

### Section B: Calendar / Timeline View
- Weekly/daily calendar grid showing approved bookings as color-coded blocks
- Color coding by room:
  - 🟢 Green — ธรรมปัญญา
  - 🔵 Blue — ธรรมรับอรุณ
  - 🟣 Purple — ยอแสงธรรม
  - 🟠 Orange — นครธรรม
  - 🔴 Red — รุ่งอรุณ
- **Room filter dropdown** at the top to filter the calendar view
- Visual timeline blocks showing time ranges and booking details

---

## Mock Data
- 5-6 pre-populated reservations across different rooms and dates
- 3 pending approval requests for the admin table
- All managed via React state (easily replaceable with Firebase later)

