"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "uz" | "ru" | "en";

type ShellCtx = {
  theme: "light" | "dark";
  setTheme: (v: "light" | "dark") => void;
  lang: Lang;
  setLang: (v: Lang) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  isMobile: boolean;
  isCompact: boolean;
  t: (key: string) => string;
};

const dict: Record<Lang, Record<string, string>> = {
  uz: {
    monitoring: "Monitoring",
    cars: "Mashinalar",
    trashbins: "Trash bins",
    drivers: "Drivers",
    dashboard: "Dashboard",
    statistics: "Statistika",
    users: "Foydalanuvchilar",
    searchRegion: "Hudud qidirish...",
    light: "Light",
    dark: "Dark",
    satellite: "Satellite",
    collapse: "Yig'ish",
    expand: "Ochish",
    logout: "Chiqish",
  },
  ru: {
    monitoring: "Мониторинг",
    cars: "Машины",
    trashbins: "Контейнеры",
    drivers: "Водители",
    dashboard: "Дашборд",
    statistics: "Статистика",
    users: "Пользователи",
    searchRegion: "Поиск района...",
    light: "Светлая",
    dark: "Тёмная",
    satellite: "Спутник",
    collapse: "Свернуть",
    expand: "Развернуть",
    logout: "Выход",
  },
  en: {
    monitoring: "Monitoring",
    cars: "Vehicles",
    trashbins: "Trash bins",
    drivers: "Drivers",
    dashboard: "Dashboard",
    statistics: "Statistics",
    users: "Users",
    searchRegion: "Search region...",
    light: "Light",
    dark: "Dark",
    satellite: "Satellite",
    collapse: "Collapse",
    expand: "Expand",
    logout: "Logout",
  },
};

const Ctx = createContext<ShellCtx | null>(null);

function readTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("ui_theme");
  return stored === "dark" ? "dark" : "light";
}

function readLang(): Lang {
  if (typeof window === "undefined") return "uz";
  const stored = localStorage.getItem("ui_lang");
  return stored === "ru" || stored === "en" ? stored : "uz";
}

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [lang, setLang] = useState<Lang>("uz");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setLang(readLang());

    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      const compact = window.innerWidth <= 980;

      setIsMobile(mobile);
      setIsCompact(compact);

      if (!compact) {
        setSidebarOpen(false);
      }
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("ui_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("ui_lang", lang);
  }, [lang]);

  const value = useMemo<ShellCtx>(
    () => ({
      theme,
      setTheme,
      lang,
      setLang,
      sidebarCollapsed,
      setSidebarCollapsed,
      sidebarOpen,
      setSidebarOpen,
      isMobile,
      isCompact,
      t: (key) => dict[lang][key] || key,
    }),
    [theme, lang, sidebarCollapsed, sidebarOpen, isMobile, isCompact]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppShell() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppShell must be used inside AppShellProvider");
  return ctx;
}