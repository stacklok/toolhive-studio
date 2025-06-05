import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

export const ThemeProviderContext =
  createContext<ThemeProviderState>(initialState);

export const isValidTheme = (value: string | null): value is Theme => {
  const validThemes = ["dark", "light", "system"];
  return value !== null && validThemes.includes(value);
};
