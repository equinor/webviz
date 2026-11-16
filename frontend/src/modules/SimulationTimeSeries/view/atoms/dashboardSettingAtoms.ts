import { atom } from "jotai";

import {
    makeDashboardPersistableFixableAtoms,
    makeDashboardSettingAtoms,
} from "@framework/DashboardSettings/adapters/jotai";
import { REALIZATION_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/realization";
import { TIME_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/time";

import { loadedVectorSpecificationsAndRealizationDataAtom, queryIsFetchingAtom } from "./derivedAtoms";
import { activeTimestampUtcMsAtom } from "./persistableFixableAtoms";

/**
 * The realization to highlight in the plot: the dashboard setting's realization while that is active,
 * none otherwise - the module has no realization selection of its own. Contributes the realizations of
 * the loaded realization data to the dashboard setting.
 */
export const { valueAtom: highlightedRealizationAtom } = makeDashboardSettingAtoms(atom<number | null>(null), {
    definition: REALIZATION_DASHBOARD_SETTING,
    // No realization data loaded (e.g. statistics only) means no opinion, rather than "no realizations"
    getConstraints: (get) => {
        const realizations = new Set<number>();
        for (const vectorSpecificationAndData of get(loadedVectorSpecificationsAndRealizationDataAtom)) {
            for (const realizationData of vectorSpecificationAndData.data) {
                realizations.add(realizationData.realization);
            }
        }

        return realizations.size > 0 ? Array.from(realizations).sort((a, b) => a - b) : null;
    },
    isLoading: (get) => get(queryIsFetchingAtom),
    mapDashboardValue: (dashboardRealization) => dashboardRealization,
});

/**
 * The timestamp of the time annotation: the dashboard setting's time while that is active, otherwise the
 * module's own (clicked) timestamp. Read-only - the module doesn't contribute time options, as raw time
 * series would flood the dashboard time with every sample date. Persist `activeTimestampUtcMsAtom`.
 */
export const { valueAtom: effectiveActiveTimestampUtcMsAtom } = makeDashboardPersistableFixableAtoms(
    activeTimestampUtcMsAtom,
    { definition: TIME_DASHBOARD_SETTING },
);
