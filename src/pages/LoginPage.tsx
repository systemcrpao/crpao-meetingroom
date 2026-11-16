import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ORG_NAME = "องค์การบริหารส่วนจังหวัดเชียงราย";
const SYSTEM_NAME = "ระบบจองห้องประชุม";
const DEVELOPER_LINE =
  "พัฒนาโดย กลุ่มงานส่งเสริมและพัฒนาเทคโนโลยีสารสนเทศ สำนักปลัดองค์การบริหารส่วนจังหวัด";

const logoUrl = `${import.meta.env.BASE_URL}booking-card-logo.png`;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const denied = (location.state as { adminDenied?: boolean } | null)?.adminDenied;
    if (denied) {
      setError(
        "บัญชีนี้เข้าสู่ระบบได้ แต่ยังไม่มีสิทธิ์เข้าแผงผู้ดูแล — ติดต่อ Super Admin ให้เพิ่มอีเมลในเมนูกำหนดสิทธิ์",
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/admin");
    } catch {
      setError("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#e4e9ef] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/80 bg-white px-8 py-9 shadow-[0_8px_30px_rgba(15,45,85,0.12)]">
        <div className="flex flex-col items-center text-center">
          <img
            src={logoUrl}
            alt={`ตราสัญลักษณ์ ${ORG_NAME}`}
            className="h-24 w-24 object-contain"
            width={96}
            height={96}
          />
          <h1 className="mt-4 text-xl sm:text-2xl font-bold text-[#1a4d73] tracking-tight">
            {SYSTEM_NAME}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{ORG_NAME}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-[#3d5a73]">
              ชื่อผู้ใช้งาน (Username)
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="กรอกชื่อผู้ใช้งาน"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-11 bg-slate-100/90 border-slate-200 focus-visible:ring-[#1a4d73]/30"
            />
            <p className="text-xs text-slate-500">
              ผู้ดูแลระบบใช้อีเมลที่ได้รับสิทธิ์จาก Super Admin
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-[#3d5a73]">
              รหัสผ่าน (Password)
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-slate-100/90 border-slate-200 pr-10 focus-visible:ring-[#1a4d73]/30"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 gap-2 bg-[#1a4d73] hover:bg-[#153d5c] text-white shadow-sm"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <Button
          asChild
          variant="outline"
          className="mt-3 w-full h-10 gap-2 border-slate-200 bg-slate-50/80 text-[#1a4d73] hover:bg-slate-100"
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            กลับหน้าจองห้องประชุม
          </Link>
        </Button>
      </div>

      <p className="mt-8 max-w-lg text-center text-xs leading-relaxed text-slate-600 px-2">
        {DEVELOPER_LINE}
      </p>
    </div>
  );
}