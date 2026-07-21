export type Theme = "light" | "dark";
export const THEME_KEY = "personal_os.theme";

/** Áp theme lên <html> (thêm/bỏ class 'dark'). */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

/** Script chạy TRƯỚC paint để tránh nhấp nháy (đặt inline trong layout). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;
