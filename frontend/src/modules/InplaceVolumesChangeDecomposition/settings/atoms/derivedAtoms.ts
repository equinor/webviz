import { atom } from "jotai";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

import {
    getWaterfallFactorSpec,
    WATERFALL_TARGET_RESULT_NAMES,
} from "../../view/utils/computeVolumeChangeDecomposition";

import {
    selectedIndexValueCriteriaAtom,
    userSelectedComparisonEnsembleIdentAtom,
    userSelectedIndicesWithValuesAtom,
    userSelectedReferenceEnsembleIdentAtom,
    userSelectedResultNameAtom,
    userSelectedSubplotByAtom,
    userSelectedTableNameAtom,
} from "./baseAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

export const selectedTableNameAtom = atom((get) => {
    const userSelectedTableName = get(userSelectedTableNameAtom);
    const availableTableNames = get(availableTableNamesAtom);

    if (userSelectedTableName && availableTableNames.includes(userSelectedTableName)) {
        return userSelectedTableName;
    }
    return availableTableNames[0] ?? null;
});

export const tableDefinitionsAccessorAtom = atom((get) => {
    const tableDefinitions = get(tableDefinitionsQueryAtom);
    const selectedTableName = get(selectedTableNameAtom);
    const selectedIndexValueCriteria = get(selectedIndexValueCriteriaAtom);

    return new TableDefinitionsAccessor(
        tableDefinitions.isLoading ? [] : tableDefinitions.data,
        selectedTableName ? [selectedTableName] : [],
        selectedIndexValueCriteria,
    );
});

/** Table names available across both selected ensembles. Derived without the table-name filter. */
export const availableTableNamesAtom = atom((get) => {
    const tableDefinitions = get(tableDefinitionsQueryAtom);
    const selectedIndexValueCriteria = get(selectedIndexValueCriteriaAtom);

    const unfilteredAccessor = new TableDefinitionsAccessor(
        tableDefinitions.isLoading ? [] : tableDefinitions.data,
        [],
        selectedIndexValueCriteria,
    );
    return unfilteredAccessor.getTableNamesIntersection();
});

/** Only decomposable hydrocarbon volumes are selectable as the waterfall target. */
export const availableResultNamesAtom = atom((get) => {
    const resultNamesIntersection = get(tableDefinitionsAccessorAtom).getResultNamesIntersection();
    return WATERFALL_TARGET_RESULT_NAMES.filter((resultName) => resultNamesIntersection.includes(resultName));
});

export const selectedResultNameAtom = atom<string | null>((get) => {
    const userSelectedResultName = get(userSelectedResultNameAtom);
    const availableResultNames: string[] = get(availableResultNamesAtom);

    if (userSelectedResultName && availableResultNames.includes(userSelectedResultName)) {
        return userSelectedResultName;
    }
    return availableResultNames[0] ?? null;
});

export const availableIndicesWithValuesAtom = atom((get) => {
    return get(tableDefinitionsAccessorAtom).getCommonIndicesWithValues();
});

export const selectedIndicesWithValuesAtom = atom((get) => {
    const userSelectedIndicesWithValues = get(userSelectedIndicesWithValuesAtom);
    const availableIndicesWithValues = get(availableIndicesWithValuesAtom);

    const selectedIndicesWithValues: InplaceVolumesIndexWithValues_api[] = [];
    for (const availableIndexWithValues of availableIndicesWithValues) {
        const userSelected = userSelectedIndicesWithValues.find(
            (index) => index.indexColumn === availableIndexWithValues.indexColumn,
        );
        const values = (userSelected?.values ?? availableIndexWithValues.values).filter((value) =>
            availableIndexWithValues.values.includes(value),
        );
        selectedIndicesWithValues.push({
            indexColumn: availableIndexWithValues.indexColumn,
            values: values.length > 0 ? values : availableIndexWithValues.values,
        });
    }
    return selectedIndicesWithValues;
});

export const selectedSubplotByAtom = atom((get) => {
    const userSelectedSubplotBy = get(userSelectedSubplotByAtom);
    const availableIndicesWithValues = get(availableIndicesWithValuesAtom);

    const isAvailable = availableIndicesWithValues.some((index) => index.indexColumn === userSelectedSubplotBy);
    return isAvailable ? userSelectedSubplotBy : null;
});

/**
 * Factor decomposition spec for the selected target, or null when the target is not decomposable or
 * a required factor result is unavailable. Computed once here and passed to the view, so settings
 * and view can never disagree on whether the waterfall is computable.
 */
export const waterfallFactorSpecAtom = atom((get) => {
    const selectedResultName = get(selectedResultNameAtom);
    const resultNamesIntersection = get(tableDefinitionsAccessorAtom).getResultNamesIntersection();
    return getWaterfallFactorSpec(selectedResultName, resultNamesIntersection);
});

export const areSelectedTablesComparableAtom = atom((get) => {
    return get(tableDefinitionsAccessorAtom).getAreTablesComparable();
});

export const isEnsemblePairValidAtom = atom((get) => {
    const referenceEnsembleIdent = get(userSelectedReferenceEnsembleIdentAtom);
    const comparisonEnsembleIdent = get(userSelectedComparisonEnsembleIdentAtom);

    return (
        referenceEnsembleIdent !== null &&
        comparisonEnsembleIdent !== null &&
        !referenceEnsembleIdent.equals(comparisonEnsembleIdent)
    );
});
