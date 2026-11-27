import { atom } from "jotai";

import {
    makeDashboardPersistableFixableAtoms,
    makeDashboardSettingAtoms,
} from "@framework/DashboardSettings/adapters/jotai";
import { REALIZATION_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/realization";
import { TIME_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/time";

import { availableTimestampsUtcMsAtom, validRealizationNumbersAtom } from "./derivedAtoms";
import { selectedTimestampUtcMsAtom } from "./persistableFixableAtoms";

/**
 * The timestamp to use: the dashboard setting's time while that is active, otherwise the module's own
 * selection. Contributes the timestamps available for the selected well to the dashboard setting.
 *
 * Read `effectiveTimestampUtcMsAtom` - but persist `selectedTimestampUtcMsAtom`, the module's own selection,
 * which is used again once it is no longer controlled by the dashboard setting.
 */
export const { valueAtom: effectiveTimestampUtcMsAtom, isDashboardControlledAtom: isTimestampDashboardControlledAtom } =
    makeDashboardPersistableFixableAtoms(selectedTimestampUtcMsAtom, {
        definition: TIME_DASHBOARD_SETTING,
        // No timestamps available means no opinion, rather than "no timestamps available"
        getConstraints: (get) => {
            const availableTimestamps = get(availableTimestampsUtcMsAtom);
            return availableTimestamps.length > 0 ? availableTimestamps : null;
        },
    });

/**
 * The realization to highlight in the plot: the dashboard setting's realization while that is active,
 * none otherwise - the module has no realization selection of its own. Contributes the valid realizations
 * of the selected ensembles to the dashboard setting.
 */
export const { valueAtom: highlightedRealizationAtom, isDashboardControlledAtom: isRealizationDashboardControlledAtom } =
    makeDashboardSettingAtoms(atom<number | null>(null), {
        definition: REALIZATION_DASHBOARD_SETTING,
        // No valid realizations means no opinion, rather than "no realizations"
        getConstraints: (get) => {
            const realizations = get(validRealizationNumbersAtom);
            return realizations.length > 0 ? realizations : null;
        },
        mapDashboardValue: (dashboardRealization) => dashboardRealization,
    });
