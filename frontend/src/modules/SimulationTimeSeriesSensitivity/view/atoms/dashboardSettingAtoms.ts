import { atom } from "jotai";

import {
    makeDashboardPersistableFixableAtoms,
    makeDashboardSettingAtoms,
} from "@framework/DashboardSettings/adapters/jotai";
import { REALIZATION_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/realization";
import { TIME_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/time";

import { queryIsFetchingAtom } from "./derivedAtoms";
import { activeTimestampUtcMsAtom } from "./persistableFixableAtoms";
import { vectorDataQueryAtom } from "./queryAtoms";

/**
 * The realization to highlight in the plot: the dashboard setting's realization while that is active,
 * none otherwise. Contributes the realizations of the loaded realization data to the dashboard setting.
 */
export const { valueAtom: highlightedRealizationAtom } = makeDashboardSettingAtoms(atom<number | null>(null), {
    definition: REALIZATION_DASHBOARD_SETTING,
    // No realization data loaded means no opinion, rather than "no realizations"
    getConstraints: (get) => {
        const data = get(vectorDataQueryAtom).data;
        if (!data || data.length === 0) {
            return null;
        }
        return Array.from(new Set(data.map((vec) => vec.realization))).sort((a, b) => a - b);
    },
    isLoading: (get) => get(queryIsFetchingAtom),
    mapDashboardValue: (dashboardRealization) => dashboardRealization,
});

/**
 * The timestamp of the time marker: the dashboard setting's time while that is active, otherwise the
 * module's own (clicked) timestamp. Read-only - persist `activeTimestampUtcMsAtom`.
 */
export const { valueAtom: effectiveTimestampUtcMsAtom } = makeDashboardPersistableFixableAtoms(
    activeTimestampUtcMsAtom,
    { definition: TIME_DASHBOARD_SETTING },
);
