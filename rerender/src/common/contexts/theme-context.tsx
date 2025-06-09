import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: async () => {},
};

export const ThemeProviderContext =
  createContext<ThemeProviderState>(initialState);
