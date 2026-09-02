import React from "react";

import { setMainDataAttribute } from "@framework/internal/utils/getSetMainDataAttribute";

export type ColorScheme = "dark" | "light";
export type Density = "comfortable" | "spacious";

export type UserSettings = {
    colorScheme: ColorScheme;
    density: Density;
    lastSeenChangelogHash: string | null;
    disableChangelogPopup: boolean;
};

type UserSettingsContextValue = {
    settings: UserSettings;
    setColorScheme: (value: ColorScheme) => void;
    setDensity: (value: Density) => void;
    setLastSeenChangelogHash: (value: string) => void;
    setDisableChangelogPopup: (value: boolean) => void;
};

const COLOR_SCHEME_KEY = "colorScheme";
const DENSITY_KEY = "density";
const CHANGELOG_LAST_SEEN_HASH_KEY = "lastSeenChangelogHash";
const CHANGELOG_DISABLE_POPUP_KEY = "disableChangelogPopup";

function resolveInitialColorScheme(): ColorScheme {
    const stored = localStorage.getItem(COLOR_SCHEME_KEY);

    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveInitialDensity(): Density {
    return localStorage.getItem(DENSITY_KEY) === "comfortable" ? "comfortable" : "spacious";
}

function resolveInitialLastSeenChangelogHash(): string | null {
    return localStorage.getItem(CHANGELOG_LAST_SEEN_HASH_KEY);
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
        lastSeenChangelogHash: null,
        disableChangelogPopup: false,
    },
    setColorScheme: () => undefined,
    setDensity: () => undefined,
    setLastSeenChangelogHash: () => undefined,
    setDisableChangelogPopup: () => undefined,
});

export function UserSettingsProvider({ children }: { children: React.ReactNode }) {
    const [colorScheme, setColorScheme] = useStoredState(COLOR_SCHEME_KEY, resolveInitialColorScheme);
    const [density, setDensity] = useStoredState(DENSITY_KEY, resolveInitialDensity);
    const [lastSeenChangelogHash, setLastSeenChangelogHash] = useStoredState(
        CHANGELOG_LAST_SEEN_HASH_KEY,
        resolveInitialLastSeenChangelogHash,
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
            settings: { colorScheme, density, disableChangelogPopup, lastSeenChangelogHash },
            setColorScheme,
            setDensity,
            setDisableChangelogPopup,
            setLastSeenChangelogHash,
        }),
        [
            colorScheme,
            density,
            disableChangelogPopup,
            lastSeenChangelogHash,
            setColorScheme,
            setDensity,
            setDisableChangelogPopup,
            setLastSeenChangelogHash,
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
