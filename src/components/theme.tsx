import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Theme = "light" | "dark";
const STORAGE_KEY = "radiocom-theme";

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

/**
 * Applied on the client only. The server renders the light default, which is
 * also what the stylesheet ships, so there is no flash for light-mode users;
 * dark-mode users get one paint before `useEffect` stamps the class.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t(theme === "dark" ? "shell.themeToLight" : "shell.themeToDark")}
      title={t(theme === "dark" ? "shell.themeToLight" : "shell.themeToDark")}
      className="grid h-8 w-8 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
