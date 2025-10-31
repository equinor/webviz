import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { areEnsembleIdentsEqual } from "@framework/utils/ensembleIdentUtils";
import { fixupRegularEnsembleIdent } from "@framework/utils/ensembleUiHelpers";

import {
    availableDateTimesAtom,
    availableRealizationsAtom,
    edgeMetadataListAtom,
    nodeMetadataListAtom,
} from "./derivedAtoms";

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

export const selectedDateTimeAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const availableDateTimes = get(availableDateTimesAtom);

        if (!value) {
            return availableDateTimes.length === 0;
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
    isValidFunction: ({ get, value }) => {
        const availableEdgesMetadataList = get(edgeMetadataListAtom);
        const availableEdgeKeys = availableEdgesMetadataList.map((item) => item.key);

        if (!value) {
            return availableEdgeKeys.length === 0;
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
    isValidFunction: ({ get, value }) => {
        const availableNodesMetadataList = get(nodeMetadataListAtom);
        const availableNodeKeys = availableNodesMetadataList.map((item) => item.key);

        if (!value) {
            return availableNodeKeys.length === 0;
        }
        return availableNodeKeys.includes(value);
    },
    fixupFunction: ({ get }) => {
        const availableNodesMetadataList = get(nodeMetadataListAtom);
        const availableNodeKeys = availableNodesMetadataList.map((item) => item.key);
        return availableNodeKeys[0] ?? null;
    },
});
