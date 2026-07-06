import React from "react";

import { setMainDataAttribute } from "@framework/internal/utils/getSetMainDataAttribute";

export type ColorScheme = "dark" | "light";
export type Density = "comfortable" | "spacious";

export type UserSettings = {
    colorScheme: ColorScheme;
    density: Density;
};

type UserSettingsContextValue = {
    settings: UserSettings;
    setColorScheme: (value: ColorScheme) => void;
    setDensity: (value: Density) => void;
};

const COLOR_SCHEME_KEY = "colorScheme";
const DENSITY_KEY = "density";

function resolveInitialColorScheme(): ColorScheme {
    const stored = localStorage.getItem(COLOR_SCHEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveInitialDensity(): Density {
    return localStorage.getItem(DENSITY_KEY) === "comfortable" ? "comfortable" : "spacious";
}

const UserSettingsContext = React.createContext<UserSettingsContextValue>({
    settings: { colorScheme: "light", density: "spacious" },
    setColorScheme: () => undefined,
    setDensity: () => undefined,
});

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
    const [colorScheme, setColorSchemeState] = React.useState<ColorScheme>(resolveInitialColorScheme);
    const [density, setDensityState] = React.useState<Density>(resolveInitialDensity);

    React.useLayoutEffect(() => {
        setMainDataAttribute("color-scheme", colorScheme);
    }, [colorScheme]);

    React.useLayoutEffect(() => {
        setMainDataAttribute("density", density);
    }, [density]);

    const setColorScheme = React.useCallback(function setColorScheme(value: ColorScheme) {
        localStorage.setItem(COLOR_SCHEME_KEY, value);
        setColorSchemeState(value);
    }, []);

    const setDensity = React.useCallback(function setDensity(value: Density) {
        localStorage.setItem(DENSITY_KEY, value);
        setDensityState(value);
    }, []);

    const value = React.useMemo(
        () => ({ settings: { colorScheme, density }, setColorScheme, setDensity }),
        [colorScheme, density, setColorScheme, setDensity],
    );

    return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettings(): UserSettingsContextValue {
    return React.useContext(UserSettingsContext);
}
