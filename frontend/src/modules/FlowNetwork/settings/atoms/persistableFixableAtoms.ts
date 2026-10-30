import { makeElevatedPersistableFixableAtoms } from "@framework/ElevatedSettings/adapters/jotai";
import { REALIZATION_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/realization";
import { TIME_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/time";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { PersistableAtomDependenciesState } from "@framework/utils/atomUtils";
import { computeQueryDependenciesState, persistableFixableAtom } from "@framework/utils/atomUtils";
import { areEnsembleIdentsEqual } from "@framework/utils/ensembleIdentUtils";
import { fixupRegularEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { isoStringToTimestampUtcMs } from "@framework/utils/timestampUtils";

import {
    availableDateTimesAtom,
    availableRealizationsAtom,
    availableTreeTypesAtom,
    edgeMetadataListAtom,
    nodeMetadataListAtom,
} from "./derivedAtoms";
import { realizationFlowNetworkQueryAtom } from "./queryAtoms";

export const selectedEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    areEqualFunction: areEnsembleIdentsEqual,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return value !== null && ensembleSet.hasEnsemble(value);
    },
    fixupFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);

        return fixupRegularEnsembleIdent(value ?? null, ensembleSet);
    },
});

function isRealizationValid(realization: number | null, availableRealizations: number[]): boolean {
    if (realization === null) {
        return availableRealizations.length === 0;
    }
    return availableRealizations.includes(realization);
}

export const selectedRealizationAtom = persistableFixableAtom<number | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => isRealizationValid(value, get(availableRealizationsAtom)),
    fixupFunction: ({ get, value }) => {
        const availableRealizations = get(availableRealizationsAtom);
        if (value === null || value === undefined) {
            return availableRealizations[0] ?? null;
        }

        // When value is invalid number, enforce user to reselect
        return null;
    },
});

/**
 * `effectiveRealizationAtom` is the realization in effect: the dashboard's elevated realization while that
 * is active (see `isRealizationElevatedAtom`), otherwise the module's own selection. It contributes the
 * realizations of the selected ensemble to the elevated setting.
 *
 * Read `effectiveRealizationAtom` - but persist `selectedRealizationAtom`, the module's own selection,
 * which is used again once the realization is no longer elevated.
 */
export const { valueAtom: effectiveRealizationAtom, isElevatedAtom: isRealizationElevatedAtom } =
    makeElevatedPersistableFixableAtoms(selectedRealizationAtom, {
        definition: REALIZATION_ELEVATED_SETTING,
        // No ensemble selected yet means no opinion, rather than "no realizations available"
        getConstraints: (get) => (get(selectedEnsembleIdentAtom).value ? get(availableRealizationsAtom) : null),
    });

export const selectedTreeTypeAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    computeDependenciesState: computeFlowNetworkQueryResultDependenciesState,
    isValidFunction: ({ get, value }) => {
        const availableTreeTypes = get(availableTreeTypesAtom);

        if (!value) {
            return availableTreeTypes.length === 0;
        }
        return availableTreeTypes.includes(value);
    },
    fixupFunction: ({ get }) => {
        const availableTreeTypes = get(availableTreeTypesAtom);
        return availableTreeTypes[0] ?? null;
    },
});

export const selectedDateTimeAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    computeDependenciesState: computeTreeTypeDataDependenciesState,
    isValidFunction: ({ get, value }) => {
        const availableDateTimes = get(availableDateTimesAtom);

        // With nothing to select, the (then disabled) control couldn't repair a kept value - so nothing is invalid
        if (availableDateTimes.length === 0) {
            return true;
        }
        if (!value) {
            return false;
        }
        return availableDateTimes.includes(value);
    },
    fixupFunction: ({ get }) => {
        const availableDateTimes = get(availableDateTimesAtom);
        return availableDateTimes[0] ?? null;
    },
});

function findDateTimeForTimestamp(timestampUtcMs: number | null, availableDateTimes: string[]): string | null {
    if (timestampUtcMs === null) {
        return null;
    }
    return availableDateTimes.find((dateTime) => isoStringToTimestampUtcMs(dateTime) === timestampUtcMs) ?? null;
}

/**
 * `effectiveDateTimeAtom` is the time step in effect: the flow network's date matching the dashboard's
 * elevated time while that is active (see `isDateTimeElevatedAtom`), otherwise the module's own selection.
 * It contributes the flow network's dates to the elevated setting.
 *
 * Read `effectiveDateTimeAtom` - but persist `selectedDateTimeAtom`, the module's own selection.
 */
export const { valueAtom: effectiveDateTimeAtom, isElevatedAtom: isDateTimeElevatedAtom } =
    makeElevatedPersistableFixableAtoms(selectedDateTimeAtom, {
        definition: TIME_ELEVATED_SETTING,
        // A flow network without time steps means no opinion, rather than "no time steps available"
        getConstraints: (get) => {
            const availableDateTimes = get(availableDateTimesAtom);
            return availableDateTimes.length > 0 ? availableDateTimes.map(isoStringToTimestampUtcMs) : null;
        },
        mapElevatedValue: (elevatedTime, get) => findDateTimeForTimestamp(elevatedTime, get(availableDateTimesAtom)),
    });

export const selectedEdgeKeyAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    computeDependenciesState: computeTreeTypeDataDependenciesState,
    isValidFunction: ({ get, value }) => {
        const availableEdgesMetadataList = get(edgeMetadataListAtom);
        const availableEdgeKeys = availableEdgesMetadataList.map((item) => item.key);

        // With nothing to select (e.g. only "Other" node types), the disabled control couldn't repair a kept value
        if (availableEdgeKeys.length === 0) {
            return true;
        }
        if (!value) {
            return false;
        }
        return availableEdgeKeys.includes(value);
    },
    fixupFunction: ({ get }) => {
        const availableEdgesMetadataList = get(edgeMetadataListAtom);
        const availableEdgeKeys = availableEdgesMetadataList.map((item) => item.key);
        return availableEdgeKeys[0] ?? null;
    },
});

export const selectedNodeKeyAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    computeDependenciesState: computeTreeTypeDataDependenciesState,
    isValidFunction: ({ get, value }) => {
        const availableNodesMetadataList = get(nodeMetadataListAtom);
        const availableNodeKeys = availableNodesMetadataList.map((item) => item.key);

        // With nothing to select, the disabled control couldn't repair a kept value
        if (availableNodeKeys.length === 0) {
            return true;
        }
        if (!value) {
            return false;
        }
        return availableNodeKeys.includes(value);
    },
    fixupFunction: ({ get }) => {
        const availableNodesMetadataList = get(nodeMetadataListAtom);
        const availableNodeKeys = availableNodesMetadataList.map((item) => item.key);
        return availableNodeKeys[0] ?? null;
    },
});

// Utility function to compute dependencies state from flowNetworkQueryResultAtom
function computeFlowNetworkQueryResultDependenciesState({
    get,
}: {
    get: (atom: any) => any;
}): PersistableAtomDependenciesState {
    return computeQueryDependenciesState(get(realizationFlowNetworkQueryAtom));
}

// The time steps, edges and nodes belong to the selected tree type. While it is invalid, there is no data to check them
// against - so they wait (and don't settle on the empty lists) until a valid tree type is selected.
function computeTreeTypeDataDependenciesState({ get }: { get: (atom: any) => any }): PersistableAtomDependenciesState {
    const flowNetworkQueryResultDependenciesState = computeFlowNetworkQueryResultDependenciesState({ get });
    if (flowNetworkQueryResultDependenciesState !== "loaded") {
        return flowNetworkQueryResultDependenciesState;
    }
    return get(selectedTreeTypeAtom).isValidInContext ? "loaded" : "blocked";
}
