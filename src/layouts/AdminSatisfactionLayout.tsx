import { Outlet } from "react-router-dom";
import { SatisfactionSubNav } from "@/components/admin/SatisfactionSubNav";

export default function AdminSatisfactionLayout() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">สรุปความพึงพอใจ</h1>
        <p className="text-sm text-muted-foreground mt-1">
          แบบประเมิน 5 ข้อ 3 ด้าน — สำหรับ Super Admin เสนอผู้บริหาร
        </p>
      </div>
      <SatisfactionSubNav />
      <Outlet />
    </div>
  );
}
