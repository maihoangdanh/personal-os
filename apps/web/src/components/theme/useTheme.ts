"use client";

import * as React from "react";
import { applyTheme, THEME_KEY, type Theme } from "@/lib/theme";

/** Quản lý theme light/dark: đọc localStorage, toggle class 'dark', persist. */
export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      window.localStorage.getItem(THEME_KEY)) as Theme | null;
    const initial: Theme =
      stored === "dark" || document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    setTheme(initial);
  }, []);

  const toggle = React.useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
