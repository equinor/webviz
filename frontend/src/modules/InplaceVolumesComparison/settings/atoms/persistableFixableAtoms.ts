import type { Getter } from "jotai";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { EnsembleSensitivities } from "@framework/EnsembleSensitivities";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import type { PersistableAtomDependenciesState } from "@framework/utils/atomUtils";
import { fixupRegularEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { FixupSelection, fixupUserSelection } from "@lib/utils/fixupUserSelection";
import {
    fixupUserSelectedIndexValues,
    getSelectionForOfferedIndexColumns,
    isSelectedIndicesWithValuesValidSubset,
} from "@modules/_shared/InplaceVolumes/indexWithValuesUtils";
import type { SensitivityCaseIdent } from "@modules/_shared/InplaceVolumes/sensitivityUtils";
import {
    hasSensitivityCase,
    pickDefaultComparisonSensitivityCase,
    pickDefaultReferenceSensitivityCase,
} from "@modules/_shared/InplaceVolumes/sensitivityUtils";

import {
    availableComparisonTableNamesAtom,
    availableIndicesWithValuesAtom,
    availableReferenceTableNamesAtom,
    availableResultNamesAtom,
    commonIndicesWithValuesAtom,
    comparisonSensitivitiesAtom,
    referenceSensitivitiesAtom,
} from "./derivedAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

function isValidSensitivityCase(
    value: SensitivityCaseIdent | null,
    sensitivities: EnsembleSensitivities | null,
): boolean {
    if (!sensitivities) {
        return value === null;
    }
    return value !== null && hasSensitivityCase(sensitivities, value);
}

function computeTableDefinitionsQueryDependenciesState({ get }: { get: Getter }): PersistableAtomDependenciesState {
    // Not derived from isLoading: that is false while a query is disabled or has no result yet, which reported "loaded"
    // and let the atoms settle on the empty definitions of that moment - depending on timing, e.g. with an empty
    // index-value selection that is invalid once the definitions arrive
    return get(tableDefinitionsQueryAtom).dependenciesState;
}

export const selectedReferenceEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    isValidFunction: ({ value, get }) => value !== null && get(EnsembleSetAtom).hasEnsemble(value),
    fixupFunction: ({ value, get }) => fixupRegularEnsembleIdent(value ?? null, get(EnsembleSetAtom)),
});

export const selectedComparisonEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    isValidFunction: ({ value, get }) => value !== null && get(EnsembleSetAtom).hasEnsemble(value),
    fixupFunction: ({ value, get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        if (value && ensembleSet.hasEnsemble(value)) {
            return value;
        }

        // Default to an ensemble other than the reference, so the pair is usable without further input.
        const referenceEnsembleIdent = get(selectedReferenceEnsembleIdentAtom).value;
        const regularEnsembles = ensembleSet.getRegularEnsembleArray();
        const distinctEnsemble = regularEnsembles.find(
            (ensemble) => !referenceEnsembleIdent || !ensemble.getIdent().equals(referenceEnsembleIdent),
        );
        return (distinctEnsemble ?? regularEnsembles[0])?.getIdent() ?? null;
    },
});

export const selectedReferenceTableNameAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => get(availableReferenceTableNamesAtom),
    isValidFunction: ({ value, precomputedValue }) => value !== null && precomputedValue.includes(value),
    fixupFunction: ({ value, precomputedValue }) => fixupUserSelection([value ?? null], precomputedValue)[0] ?? null,
});

export const selectedComparisonTableNameAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => get(availableComparisonTableNamesAtom),
    isValidFunction: ({ value, precomputedValue }) => value !== null && precomputedValue.includes(value),
    fixupFunction: ({ value, precomputedValue }) => fixupUserSelection([value ?? null], precomputedValue)[0] ?? null,
});

export const selectedReferenceSensitivityCaseAtom = persistableFixableAtom<
    SensitivityCaseIdent | null,
    EnsembleSensitivities | null
>({
    initialValue: null,
    computeDependenciesState: ({ get }) =>
        get(selectedReferenceEnsembleIdentAtom).isValidInContext ? "loaded" : "blocked",
    precomputeFunction: ({ get }) => get(referenceSensitivitiesAtom),
    isValidFunction: ({ value, precomputedValue }) => isValidSensitivityCase(value, precomputedValue),
    fixupFunction: ({ precomputedValue }) =>
        precomputedValue ? pickDefaultReferenceSensitivityCase(precomputedValue) : null,
});

export const selectedComparisonSensitivityCaseAtom = persistableFixableAtom<
    SensitivityCaseIdent | null,
    EnsembleSensitivities | null
>({
    initialValue: null,
    computeDependenciesState: ({ get }) =>
        get(selectedComparisonEnsembleIdentAtom).isValidInContext ? "loaded" : "blocked",
    precomputeFunction: ({ get }) => get(comparisonSensitivitiesAtom),
    isValidFunction: ({ value, precomputedValue }) => isValidSensitivityCase(value, precomputedValue),
    fixupFunction: ({ get, precomputedValue }) => {
        if (!precomputedValue) {
            return null;
        }
        // Within one ensemble, default to a case other than the reference so the pair is usable directly.
        const referenceEnsembleIdent = get(selectedReferenceEnsembleIdentAtom).value;
        const comparisonEnsembleIdent = get(selectedComparisonEnsembleIdentAtom).value;
        if (referenceEnsembleIdent && comparisonEnsembleIdent?.equals(referenceEnsembleIdent)) {
            return pickDefaultComparisonSensitivityCase(
                precomputedValue,
                get(selectedReferenceSensitivityCaseAtom).value,
            );
        }
        return pickDefaultReferenceSensitivityCase(precomputedValue);
    },
});

export const selectedResultNameAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => get(availableResultNamesAtom),
    isValidFunction: ({ value, precomputedValue }) => value !== null && precomputedValue.includes(value),
    fixupFunction: ({ value, precomputedValue }) => fixupUserSelection([value ?? null], precomputedValue)[0] ?? null,
});

/**
 * Index column to split the waterfall into one subplot per value. null means a single waterfall.
 * Columns whose values differ between the sources are groupable even when they are not filterable;
 * groups present on only one side are then dropped by the view.
 */
export const selectedSubplotByAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) =>
        get(commonIndicesWithValuesAtom).map((indexWithValues) => indexWithValues.indexColumn),
    isValidFunction: ({ value, precomputedValue }) => value === null || precomputedValue.includes(value),
    fixupFunction: () => null,
});

export const selectedIndicesWithValuesAtom = persistableFixableAtom<
    InplaceVolumesIndexWithValues_api[],
    InplaceVolumesIndexWithValues_api[]
>({
    initialValue: [],
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => get(availableIndicesWithValuesAtom),
    isValidFunction: ({ value, precomputedValue: availableIndicesWithValues }) => {
        // Only the offered columns are judged, and one without an entry counts as unfiltered - see
        // getSelectionForOfferedIndexColumns(). Entries for other columns (e.g. kept from previously selected tables) are
        // not used by the query either (see indicesWithValuesForQueryAtom) - they are kept, but ignored, so they apply
        // again once their columns are offered again. When no column is offered, there is nothing to select, so any
        // selection is valid.
        const offeredSelection = getSelectionForOfferedIndexColumns(value, availableIndicesWithValues);
        return isSelectedIndicesWithValuesValidSubset(offeredSelection, availableIndicesWithValues);
    },
    fixupFunction: ({ value, precomputedValue: availableIndicesWithValues }) =>
        fixupUserSelectedIndexValues(value ?? [], availableIndicesWithValues, FixupSelection.SELECT_ALL),
});
