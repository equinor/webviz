import React from "react";

import { setMainDataAttribute } from "@framework/internal/utils/getSetMainDataAttribute";

export type ColorScheme = "dark" | "light";
export type Density = "comfortable" | "spacious";

export type UserSettings = {
    colorScheme: ColorScheme;
    density: Density;
    lastSeenChangelog: number;
    disableChangelogPopup: boolean;
};

type UserSettingsContextValue = {
    settings: UserSettings;
    setColorScheme: (value: ColorScheme) => void;
    setDensity: (value: Density) => void;
    setLastSeenChangelog: (value: number) => void;
    setDisableChangelogPopup: (value: boolean) => void;
};

const COLOR_SCHEME_KEY = "colorScheme";
const DENSITY_KEY = "density";
const CHANGELOG_LAST_SEEN_KEY = "lastSeenChangelog";
const CHANGELOG_DISABLE_POPUP_KEY = "disableChangelogPopup";

function resolveInitialColorScheme(): ColorScheme {
    const stored = localStorage.getItem(COLOR_SCHEME_KEY);

    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveInitialDensity(): Density {
    return localStorage.getItem(DENSITY_KEY) === "comfortable" ? "comfortable" : "spacious";
}

function resolveInitialLastSeenChangelog(): number {
    const stored = localStorage.getItem(CHANGELOG_LAST_SEEN_KEY);
    if (stored) return Number(stored);
    return 0;
}

function resolveInitialDisableChangelogPopup(): boolean {
    const stored = localStorage.getItem(CHANGELOG_DISABLE_POPUP_KEY);
    if (stored === "true") return true;
    return false;
}

const UserSettingsContext = React.createContext<UserSettingsContextValue>({
    settings: {
        colorScheme: "light",
        density: "spacious",
        lastSeenChangelog: 0,
        disableChangelogPopup: false,
    },
    setColorScheme: () => undefined,
    setDensity: () => undefined,
    setLastSeenChangelog: () => undefined,
    setDisableChangelogPopup: () => undefined,
});

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
    const [colorScheme, setColorScheme] = useStoredState(COLOR_SCHEME_KEY, resolveInitialColorScheme);
    const [density, setDensity] = useStoredState(DENSITY_KEY, resolveInitialDensity);
    const [lastSeenChangelog, setLastSeenChangelog] = useStoredState(
        CHANGELOG_LAST_SEEN_KEY,
        resolveInitialLastSeenChangelog,
    );
    const [disableChangelogPopup, setDisableChangelogPopup] = useStoredState(
        CHANGELOG_DISABLE_POPUP_KEY,
        resolveInitialDisableChangelogPopup,
    );

    React.useLayoutEffect(() => {
        setMainDataAttribute("color-scheme", colorScheme);
    }, [colorScheme]);

    React.useLayoutEffect(() => {
        setMainDataAttribute("density", density);
    }, [density]);

    const value = React.useMemo<UserSettingsContextValue>(
        () => ({
            settings: { colorScheme, density, disableChangelogPopup, lastSeenChangelog },
            setColorScheme,
            setDensity,
            setDisableChangelogPopup,
            setLastSeenChangelog,
        }),
        [
            colorScheme,
            density,
            disableChangelogPopup,
            lastSeenChangelog,
            setColorScheme,
            setDensity,
            setDisableChangelogPopup,
            setLastSeenChangelog,
        ],
    );

    return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

function useStoredState<TValue>(key: string, resolveInitialValue: () => TValue): [TValue, (newValue: TValue) => void] {
    const [storedValueState, setStoredValueState] = React.useState<TValue>(resolveInitialValue);

    const setStoredValue = React.useCallback(
        function setStoredValue(value: TValue) {
            localStorage.setItem(key, String(value));
            setStoredValueState(value);
        },
        [key],
    );

    return [storedValueState, setStoredValue];
}

export function useUserSettings(): UserSettingsContextValue {
    return React.useContext(UserSettingsContext);
}
