"use client";

import { useAppShell } from "@/components/ui/AppShellContext";

export default function Topbar() {
  const {
    theme,
    setTheme,
    lang,
    setLang,
    sidebarOpen,
    setSidebarOpen,
    isMobile,
    isCompact,
    t,
  } = useAppShell();

  const nextLang = lang === "uz" ? "ru" : lang === "ru" ? "en" : "uz";

  function cycleLang() {
    setLang(nextLang);
  }

  function toggleSidebar() {
    setSidebarOpen(!sidebarOpen);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <header className="topbar">
      <div className="topbarRow">
        <div className="topbarStart">
          {isCompact && (
            <button
              type="button"
              className="mobileMenuBtn"
              onClick={toggleSidebar}
              aria-label="Open menu"
              title="Menu"
            >
              <i className={sidebarOpen ? "ri-close-line" : "ri-menu-line"} />
            </button>
          )}

          <div className="topBrand">
            <div className="leaf">🍃</div>

            <div className="brandText">
              <div className="brandTop">OBOD</div>
              <div className="brandBot">SHAHAR</div>
            </div>
          </div>

          {isMobile && (
            <div className="mobileTopActions">
              <button
                type="button"
                className="mobileIconBtn"
                onClick={cycleLang}
                aria-label="Change language"
                title={`Language: ${lang.toUpperCase()}`}
              >
                <i className="ri-global-line" />
              </button>

              <button
                type="button"
                className="mobileIconBtn"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === "dark" ? t("light") : t("dark")}
              >
                <i
                  className={theme === "dark" ? "ri-sun-line" : "ri-moon-fill"}
                />
              </button>
            </div>
          )}
        </div>

        {!isMobile && (
          <div className="topbarControls">
            <div className="topRight">
              <select
                id="langSel"
                className="miniSelect"
                title="Til"
                value={lang}
                onChange={(e) => setLang(e.target.value as "uz" | "ru" | "en")}
              >
                <option value="uz">UZ</option>
                <option value="ru">RU</option>
                <option value="en">EN</option>
              </select>

              <button
                id="themeBtn"
                className="pillBtn"
                title="Dark/Light"
                onClick={toggleTheme}
              >
                <span id="themeIcon">{theme === "dark" ? "☀️" : "🌙"}</span>
                <span className="pillTxt">
                  {theme === "dark" ? t("light") : t("dark")}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}