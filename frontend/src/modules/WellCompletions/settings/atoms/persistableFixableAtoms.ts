import type { Getter } from "jotai";

import { makeDashboardPersistableFixableAtoms } from "@framework/DashboardSettings/adapters/jotai";
import { REALIZATION_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/realization";
import { TIME_DASHBOARD_SETTING } from "@framework/DashboardSettings/definitions/time";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { PersistableAtomDependenciesState } from "@framework/utils/atomUtils";
import { computeQueryDependenciesState, persistableFixableAtom } from "@framework/utils/atomUtils";
import { isoStringToTimestampUtcMs } from "@framework/utils/timestampUtils";

import { isTimeAggregationEnabledAtom } from "./baseAtoms";
import { availableRealizationsAtom, sortedCompletionDatesAtom, wellCompletionsDataAccessorAtom } from "./derivedAtoms";
import { wellCompletionsQueryAtom } from "./queryAtoms";

// Synced ensembles are written straight into this atom by the settings' sync handler, so validity
// only needs to check against the ensemble set.
export const selectedEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);

        return value !== null && ensembleSet.hasEnsemble(value);
    },
    fixupFunction: ({ get }) => {
        const ensembleSet = get(EnsembleSetAtom);

        return ensembleSet.getRegularEnsembleArray()[0]?.getIdent() || null;
    },
});

export const selectedRealizationAtom = persistableFixableAtom<number | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const availableRealizations = get(availableRealizationsAtom);

        if (value === null) {
            return availableRealizations.length === 0;
        }
        return availableRealizations.includes(value);
    },
    fixupFunction: ({ get }) => {
        const availableRealizations = get(availableRealizationsAtom);
        return availableRealizations[0] ?? null;
    },
});

/**
 * `effectiveRealizationAtom` is the realization in effect: the dashboard setting's realization while that
 * is active (see `isRealizationDashboardControlledAtom`), otherwise the module's own selection. It contributes the
 * realizations of the selected ensemble to the dashboard setting.
 *
 * Read `effectiveRealizationAtom` - but persist `selectedRealizationAtom`, the module's own selection.
 */
export const { valueAtom: effectiveRealizationAtom, isDashboardControlledAtom: isRealizationDashboardControlledAtom } =
    makeDashboardPersistableFixableAtoms(selectedRealizationAtom, {
        definition: REALIZATION_DASHBOARD_SETTING,
        // No ensemble selected yet means no opinion, rather than "no realizations available"
        getConstraints: (get) => (get(selectedEnsembleIdentAtom).value ? get(availableRealizationsAtom) : null),
    });

export const selectedCompletionDateIndexAtom = persistableFixableAtom<number | null>({
    initialValue: null,
    computeDependenciesState: computeWellCompletionsDependenciesState,
    isValidFunction: ({ get, value }) => {
        const sortedCompletionDates = get(sortedCompletionDatesAtom);

        if (!sortedCompletionDates) {
            return value === null;
        }

        return value !== null && value >= 0 && value < sortedCompletionDates.length;
    },
    fixupFunction: ({ get }) => {
        const sortedCompletionDates = get(sortedCompletionDatesAtom);

        if (!sortedCompletionDates || sortedCompletionDates.length === 0) {
            return null;
        }

        if (sortedCompletionDates.length === 0) {
            return 0;
        }
        return sortedCompletionDates.length - 1;
    },
});

/**
 * `effectiveCompletionDateIndexAtom` is the time step index in effect: the index of the dashboard setting's time
 * while that is active (see `isCompletionDateIndexDashboardControlledAtom`), otherwise the module's own selection. It
 * contributes the completion dates to the dashboard setting.
 *
 * Read `effectiveCompletionDateIndexAtom` - but persist `selectedCompletionDateIndexAtom`, the module's own selection.
 * The dashboard time is only applicable to a single time step, i.e. when no time aggregation is used.
 */
export const {
    valueAtom: effectiveCompletionDateIndexAtom,
    isDashboardControlledAtom: isCompletionDateIndexDashboardControlledAtom,
} = makeDashboardPersistableFixableAtoms(selectedCompletionDateIndexAtom, {
    definition: TIME_DASHBOARD_SETTING,
    // Without completion dates, or when aggregating, there is no opinion rather than "no time steps available"
    getConstraints: (get) => {
        if (get(isTimeAggregationEnabledAtom)) {
            return null;
        }
        const sortedCompletionDates = get(sortedCompletionDatesAtom);
        return sortedCompletionDates && sortedCompletionDates.length > 0
            ? sortedCompletionDates.map(isoStringToTimestampUtcMs)
            : null;
    },
    mapDashboardValue: (dashboardTime, get) => {
        const index = (get(sortedCompletionDatesAtom) ?? []).findIndex(
            (date) => isoStringToTimestampUtcMs(date) === dashboardTime,
        );
        return index >= 0 ? index : null;
    },
});

export const selectedCompletionDateIndexRangeAtom = persistableFixableAtom<[number, number] | null>({
    initialValue: null,
    computeDependenciesState: computeWellCompletionsDependenciesState,
    isValidFunction: ({ get, value }) => {
        const sortedCompletionDates = get(sortedCompletionDatesAtom);

        if (!sortedCompletionDates) {
            return value === null;
        }
        if (!value) {
            return sortedCompletionDates.length === 0;
        }

        const [startIndex, endIndex] = value;
        if (startIndex > endIndex) {
            return false;
        }
        if (startIndex >= sortedCompletionDates.length || startIndex < 0) {
            return false;
        }
        if (endIndex >= sortedCompletionDates.length || endIndex < 0) {
            return false;
        }
        return true;
    },
    fixupFunction: ({ get, value }) => {
        const sortedCompletionDates = get(sortedCompletionDatesAtom);

        if (!sortedCompletionDates || sortedCompletionDates.length === 0) {
            return null;
        }

        if (!value) {
            return [0, sortedCompletionDates.length - 1];
        }

        // Ensure valid range: start <= end, and within bounds
        const startIndex = Math.min(value[0], value[1]);
        const endIndex = Math.max(value[0], value[1]);
        const limitedStartIndex = Math.min(Math.max(0, startIndex), sortedCompletionDates.length - 1);
        const limitedEndIndex = Math.min(Math.max(0, endIndex), sortedCompletionDates.length - 1);
        return [limitedStartIndex, limitedEndIndex];
    },
});

// A disabled query is "blocked" whatever it has cached, so a stale error doesn't surface for an invalid selection
function computeWellCompletionsDependenciesState({ get }: { get: Getter }): PersistableAtomDependenciesState {
    const queryDependenciesState = computeQueryDependenciesState(get(wellCompletionsQueryAtom));
    if (queryDependenciesState !== "loaded") {
        return queryDependenciesState;
    }
    return get(wellCompletionsDataAccessorAtom) ? "loaded" : "error";
}
