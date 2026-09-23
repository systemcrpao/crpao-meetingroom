import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDateThaiLongBE } from "@/lib/thaiDate";
import { Search, FileText, Clock, CheckCircle2, Circle, Printer, PencilLine, Ban } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { hasPendingChangeRequest } from "@/lib/reservationChangeRequest";
import { cn } from "@/lib/utils";
import { resolveRoom, roomColorClass, getRoomLabel } from "@/lib/mockData";
import { useMeetingRooms } from "@/contexts/MeetingRoomsContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { generateReservationPDF } from "@/lib/pdfGenerator";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type TrackingStep = {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

const BASE_STEPS: TrackingStep[] = [
  { key: "submitted", label: "จองผ่านระบบ", icon: FileText, description: "ส่งแบบฟอร์มจองเรียบร้อย" },
  { key: "pending", label: "รออนุมัติ", icon: Clock, description: "รอเจ้าหน้าที่ตรวจสอบ" },
  { key: "approved", label: "อนุมัติแล้ว", icon: CheckCircle2, description: "การจองได้รับการอนุมัติ" },
];

function buildTrackingSteps(reservation: {
  changeRequest?: { type?: string };
} | null, pendingChange: boolean): TrackingStep[] {
  const steps = [...BASE_STEPS];
  if (!reservation || !pendingChange) return steps;

  if (reservation.changeRequest?.type === "cancel") {
    steps.push({
      key: "change_cancel",
      label: "รออนุมัติยกเลิก",
      icon: Ban,
      description: "รอเจ้าหน้าที่อนุมัติการยกเลิก",
    });
  } else {
    steps.push({
      key: "change_edit",
      label: "รออนุมัติแก้ไข",
      icon: PencilLine,
      description: "รอเจ้าหน้าที่อนุมัติการแก้ไข",
    });
  }
  return steps;
}

function getTrackingStepIndex(
  status: string,
  pendingChange: boolean,
  stepCount: number,
): number {
  if (pendingChange) return stepCount - 1;
  if (status === "approved") return 2;
  if (status === "pending") return 1;
  return 0;
}

export default function TrackingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeRooms, allRooms } = useMeetingRooms();
  const [trackingCode, setTrackingCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [reservation, setReservation] = useState<any | null>(null);
  const [error, setError] = useState("");

  const runSearch = async (codeInput: string) => {
    const code = codeInput.trim().toUpperCase();
    if (!code) {
      setError("กรุณากรอกหมายเลขติดตาม");
      return;
    }
    setError("");
    setIsSearching(true);
    setSearched(false);

    try {
      const snap = await getDocs(
        query(collection(db, "reservations"), where("trackingNumber", "==", code))
      );
      if (snap.empty) {
        setReservation(null);
      } else {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const withChange = docs.find((d) => hasPendingChangeRequest(d));
        setReservation(withChange ?? docs[0]);
      }
      setSearched(true);
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => runSearch(trackingCode);

  useEffect(() => {
    const fromUrl = searchParams.get("code");
    if (fromUrl) {
      const c = fromUrl.trim().toUpperCase();
      setTrackingCode(c);
      runSearch(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const pendingChange = !!(reservation && hasPendingChangeRequest(reservation));
  const trackingSteps = useMemo(
    () => buildTrackingSteps(reservation, pendingChange),
    [reservation, pendingChange],
  );
  const currentStep = reservation
    ? getTrackingStepIndex(reservation.status, pendingChange, trackingSteps.length)
    : -1;

  const canRequestEdit =
    !!reservation?.trackingNumber &&
    !pendingChange &&
    (reservation.status === "approved" || reservation.status === "pending");

  const displayRoom =
    pendingChange && reservation?.changeRequest?.type === "edit" && reservation.changeRequest.room
      ? reservation.changeRequest.room
      : reservation?.room;
  const displayDate =
    pendingChange && reservation?.changeRequest?.type === "edit" && reservation.changeRequest.date
      ? reservation.changeRequest.date
      : reservation?.date;
  const displayStart =
    pendingChange && reservation?.changeRequest?.type === "edit" && reservation.changeRequest.startTime
      ? reservation.changeRequest.startTime
      : reservation?.startTime;
  const displayEnd =
    pendingChange && reservation?.changeRequest?.type === "edit" && reservation.changeRequest.endTime
      ? reservation.changeRequest.endTime
      : reservation?.endTime;

  return (
    <div className="min-h-[70vh] flex items-start justify-center pt-10 px-4">
      <div className={cn("w-full space-y-6", trackingSteps.length > 3 ? "max-w-2xl" : "max-w-lg")}>
        {/* Search Card */}
        <Card className="shadow-md">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">ติดตามสถานะการจอง</CardTitle>
            <CardDescription>กรอกหมายเลขติดตามที่ได้รับหลังจากจองห้องประชุม</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="เช่น A3X7K"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="text-center text-lg font-mono tracking-[0.3em] uppercase"
                maxLength={5}
              />
              <Button onClick={handleSearch} disabled={isSearching} className="gap-1.5 px-5">
                <Search className="h-4 w-4" />
                {isSearching ? "กำลังค้นหา..." : "ค้นหา"}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </CardContent>
        </Card>

        {/* Results */}
        {searched && !reservation && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-destructive font-medium">ไม่พบรายการจอง</p>
              <p className="text-xs text-muted-foreground mt-1">
                ตรวจสอบหมายเลขติดตามอีกครั้ง หรือหมายเลขนี้อาจถูกลบออกจากระบบแล้ว
              </p>
            </CardContent>
          </Card>
        )}

        {searched && reservation && (
          <Card className="shadow-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-100">หมายเลขติดตาม</p>
                  <p className="text-2xl font-bold font-mono tracking-[0.2em]">{reservation.trackingNumber}</p>
                </div>
                <Badge
                  className={cn(
                    "text-xs px-2.5 py-1",
                    pendingChange
                      ? "bg-sky-500/20 text-sky-100 border-sky-400/40"
                      : reservation.status === "approved"
                        ? "bg-green-500/20 text-green-100 border-green-400/40"
                        : "bg-amber-500/20 text-amber-100 border-amber-400/40"
                  )}
                  variant="outline"
                >
                  {pendingChange
                    ? reservation.changeRequest?.type === "cancel"
                      ? "รออนุมัติยกเลิก"
                      : "รออนุมัติแก้ไข"
                    : reservation.status === "approved"
                      ? "อนุมัติแล้ว"
                      : "รออนุมัติ"}
                </Badge>
              </div>
            </div>

            <CardContent className="p-5 space-y-5">
              {/* Progress steps */}
              <div className="relative">
                <div className="flex items-start justify-between gap-1">
                  {trackingSteps.map((step, i) => {
                    const fullyDone =
                      !pendingChange && reservation.status === "approved" && i < BASE_STEPS.length;
                    const isCompleted = fullyDone || i < currentStep;
                    const isCurrent = !fullyDone && i === currentStep;
                    const StepIcon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center text-center flex-1 relative z-10 min-w-0">
                        <div
                          className={cn(
                            "w-10 h-10 shrink-0 rounded-full flex items-center justify-center border-2 transition-all",
                            isCurrent
                              ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                              : isCompleted
                                ? "bg-primary/80 border-primary/80 text-primary-foreground"
                                : "bg-muted border-muted-foreground/30 text-muted-foreground",
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : isCurrent ? (
                            <StepIcon className="h-5 w-5 animate-pulse" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-[11px] sm:text-xs font-semibold mt-2 leading-tight",
                            isCurrent || isCompleted ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {step.label}
                        </p>
                        <p
                          className={cn(
                            "text-[9px] sm:text-[10px] mt-0.5 max-w-[88px] sm:max-w-[100px] leading-snug",
                            isCurrent || isCompleted ? "text-foreground/70" : "text-muted-foreground/60",
                          )}
                        >
                          {step.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {trackingSteps.length > 1 && (
                  <div
                    className="absolute top-5 left-0 right-0 grid items-center px-[10%]"
                    style={{
                      zIndex: 0,
                      gridTemplateColumns: `repeat(${trackingSteps.length - 1}, 1fr)`,
                    }}
                  >
                    {trackingSteps.slice(0, -1).map((_, i) => (
                      <div key={i} className="h-0.5 px-2">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            currentStep > i ? "bg-primary" : "bg-muted-foreground/20",
                          )}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Reservation Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">รายละเอียดการจอง</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">เรื่อง</p>
                    <p className="font-medium">{reservation.topic}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      ห้องประชุม
                      {pendingChange && reservation.changeRequest?.type === "edit" && (
                        <span className="text-sky-600"> (ที่ขอแก้ไข)</span>
                      )}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn("text-xs mt-0.5", roomColorClass(displayRoom, true, allRooms))}
                    >
                      {getRoomLabel(displayRoom, allRooms)}
                    </Badge>
                    {pendingChange &&
                      reservation.changeRequest?.type === "edit" &&
                      reservation.changeRequest.room &&
                      reservation.changeRequest.room !== reservation.room && (
                        <p className="text-[10px] text-muted-foreground mt-1 line-through">
                          เดิม: {getRoomLabel(reservation.room, allRooms)}
                        </p>
                      )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      วันที่
                      {pendingChange && reservation.changeRequest?.type === "edit" && (
                        <span className="text-sky-600"> (ที่ขอแก้ไข)</span>
                      )}
                    </p>
                    <p className="font-medium">
                      {displayDate ? formatDateThaiLongBE(displayDate) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">เวลา</p>
                    <p className="font-medium">
                      {displayStart}–{displayEnd} น.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">หน่วยงาน</p>
                    <p className="font-medium text-xs">{reservation.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ผู้จอง</p>
                    <p className="font-medium">{reservation.bookerName}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Print Button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => generateReservationPDF(reservation, activeRooms)}
              >
                <Printer className="h-4 w-4" />
                พิมพ์แบบฟอร์มจองห้องประชุม
              </Button>

              {canRequestEdit && (
                <Button
                  variant="secondary"
                  className="w-full gap-2"
                  onClick={() => navigate(`/tracking/${reservation.trackingNumber}/edit`)}
                >
                  <PencilLine className="h-4 w-4" />
                  {reservation.status === "pending" ? "แก้ไขการจอง" : "ขอแก้ไขการจอง"}
                </Button>
              )}

              {pendingChange && (
                <p className="text-xs text-center text-muted-foreground">
                  มีคำขอ{reservation.changeRequest?.type === "cancel" ? "ยกเลิก" : "แก้ไข"}รอเจ้าหน้าที่อนุมัติ
                  {reservation.changeRequest?.type === "edit" && (
                    <>
                      {" "}
                      (ขอเปลี่ยนเป็น{" "}
                      {reservation.changeRequest.room &&
                      reservation.changeRequest.room !== reservation.room
                        ? `${getRoomLabel(reservation.changeRequest.room, allRooms)} · `
                        : ""}
                      {reservation.changeRequest.date
                        ? formatDateThaiLongBE(reservation.changeRequest.date)
                        : formatDateThaiLongBE(reservation.date)}{" "}
                      {reservation.changeRequest.startTime ?? reservation.startTime}–
                      {reservation.changeRequest.endTime ?? reservation.endTime} น.)
                    </>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
