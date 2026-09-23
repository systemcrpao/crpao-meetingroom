import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDateThaiLongBE } from "@/lib/thaiDate";
import { Search, FileText, Clock, CheckCircle2, Circle, Printer, PencilLine } from "lucide-react";
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

const STEPS = [
  { key: "submitted", label: "จองผ่านระบบ", icon: FileText, description: "ส่งแบบฟอร์มจองเรียบร้อย" },
  { key: "pending",   label: "รออนุมัติ",   icon: Clock,     description: "รอเจ้าหน้าที่ตรวจสอบ" },
  { key: "approved",  label: "อนุมัติแล้ว",  icon: CheckCircle2, description: "การจองได้รับการอนุมัติ" },
];

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

  // Determine progress step index
  const getStepIndex = (status: string) => {
    if (status === "approved") return 2;
    if (status === "pending") return 1;
    return 0; // submitted
  };

  const currentStep = reservation ? getStepIndex(reservation.status) : -1;
  const pendingChange = reservation && hasPendingChangeRequest(reservation);
  const canRequestEdit =
    reservation?.status === "approved" && !pendingChange && reservation?.trackingNumber;

  return (
    <div className="min-h-[70vh] flex items-start justify-center pt-10 px-4">
      <div className="w-full max-w-lg space-y-6">
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
              {/* 3-Step Progress */}
              <div className="relative">
                <div className="flex items-start justify-between">
                  {STEPS.map((step, i) => {
                    const isCompleted = i <= currentStep;
                    const isCurrent = i === currentStep;
                    const StepIcon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center text-center flex-1 relative z-10">
                        {/* Circle */}
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                            isCompleted
                              ? isCurrent
                                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                                : "bg-primary/80 border-primary/80 text-primary-foreground"
                              : "bg-muted border-muted-foreground/30 text-muted-foreground"
                          )}
                        >
                          {isCompleted && !isCurrent ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : isCurrent ? (
                            <StepIcon className="h-5 w-5 animate-pulse" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </div>
                        {/* Label */}
                        <p
                          className={cn(
                            "text-xs font-semibold mt-2",
                            isCompleted ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {step.label}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] mt-0.5 max-w-[100px]",
                            isCompleted ? "text-foreground/70" : "text-muted-foreground/60"
                          )}
                        >
                          {step.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Connector lines */}
                <div className="absolute top-5 left-0 right-0 flex px-[16.5%]" style={{ zIndex: 0 }}>
                  <div className="flex-1 h-0.5 mx-1">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        currentStep >= 1 ? "bg-primary" : "bg-muted-foreground/20"
                      )}
                    />
                  </div>
                  <div className="flex-1 h-0.5 mx-1">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        currentStep >= 2 ? "bg-primary" : "bg-muted-foreground/20"
                      )}
                    />
                  </div>
                </div>
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
                    <p className="text-xs text-muted-foreground">ห้องประชุม</p>
                    <Badge variant="outline" className={cn("text-xs mt-0.5", roomColorClass(reservation.room, true, allRooms))}>
                      {getRoomLabel(reservation.room, allRooms)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">วันที่</p>
                    <p className="font-medium">
                      {reservation.date
                        ? formatDateThaiLongBE(reservation.date)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">เวลา</p>
                    <p className="font-medium">{reservation.startTime}–{reservation.endTime} น.</p>
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
                  ขอแก้ไขการจอง
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
