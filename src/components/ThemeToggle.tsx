import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-hidden />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? "โหมดสว่าง" : "โหมดมืด"}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isDark ? "โหมดสว่าง" : "โหมดมืด"}
      </TooltipContent>
    </Tooltip>
  );
}
