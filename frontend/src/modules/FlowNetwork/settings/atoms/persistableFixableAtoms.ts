import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { PersistableAtomDependenciesState } from "@framework/utils/atomUtils";
import { computeQueryDependenciesState, persistableFixableAtom } from "@framework/utils/atomUtils";
import { areEnsembleIdentsEqual } from "@framework/utils/ensembleIdentUtils";
import { fixupRegularEnsembleIdent } from "@framework/utils/ensembleUiHelpers";

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

export const selectedRealizationAtom = persistableFixableAtom<number | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const availableRealizations = get(availableRealizationsAtom);

        if (value === null) {
            return availableRealizations.length === 0;
        }
        return availableRealizations.includes(value);
    },
    fixupFunction: ({ get, value }) => {
        const availableRealizations = get(availableRealizationsAtom);
        if (value === null || value === undefined) {
            return availableRealizations[0] ?? null;
        }

        // When value is invalid number, enforce user to reselect
        return null;
    },
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
