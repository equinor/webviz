import { atom } from "jotai";

import type { InplaceVolumesIndexWithValues_api, InplaceVolumesTableDefinition_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

import {
    getWaterfallFactorSpec,
    WATERFALL_TARGET_RESULT_NAMES,
} from "../../view/utils/computeVolumeChangeDecomposition";

import {
    selectedIndexValueCriteriaAtom,
    userSelectedComparisonEnsembleIdentAtom,
    userSelectedComparisonTableNameAtom,
    userSelectedIndicesWithValuesAtom,
    userSelectedReferenceEnsembleIdentAtom,
    userSelectedReferenceTableNameAtom,
    userSelectedResultNameAtom,
    userSelectedSubplotByAtom,
} from "./baseAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

type TableDefinitionsPerEnsemble = {
    ensembleIdent: RegularEnsembleIdent;
    tableDefinitions: InplaceVolumesTableDefinition_api[];
};

function makeAvailableTableNames(
    tableDefinitionsData: TableDefinitionsPerEnsemble[],
    ensembleIdent: RegularEnsembleIdent | null,
): string[] {
    if (!ensembleIdent) {
        return [];
    }
    const forEnsemble = tableDefinitionsData.find((entry) => entry.ensembleIdent.equals(ensembleIdent));
    return Array.from(new Set(forEnsemble?.tableDefinitions.map((definition) => definition.tableName) ?? []));
}

function clampToAvailable(userSelected: string | null, available: string[]): string | null {
    if (userSelected && available.includes(userSelected)) {
        return userSelected;
    }
    return available[0] ?? null;
}

/** Table names are per ensemble, not intersected, since the two sides may use different tables. */
export const availableReferenceTableNamesAtom = atom((get) =>
    makeAvailableTableNames(get(tableDefinitionsQueryAtom).data, get(userSelectedReferenceEnsembleIdentAtom)),
);

export const availableComparisonTableNamesAtom = atom((get) =>
    makeAvailableTableNames(get(tableDefinitionsQueryAtom).data, get(userSelectedComparisonEnsembleIdentAtom)),
);

export const selectedReferenceTableNameAtom = atom((get) =>
    clampToAvailable(get(userSelectedReferenceTableNameAtom), get(availableReferenceTableNamesAtom)),
);

export const selectedComparisonTableNameAtom = atom((get) =>
    clampToAvailable(get(userSelectedComparisonTableNameAtom), get(availableComparisonTableNamesAtom)),
);

/**
 * Accessor over exactly the two selected (ensemble, table) sources. The definitions are pre-filtered
 * per source, because passing both table names to an unfiltered accessor would also intersect the
 * two ensemble/table combinations that were not selected.
 */
export const tableDefinitionsAccessorAtom = atom((get) => {
    const tableDefinitions = get(tableDefinitionsQueryAtom);
    const selectedIndexValueCriteria = get(selectedIndexValueCriteriaAtom);

    const sourceSpecs = [
        {
            ensembleIdent: get(userSelectedReferenceEnsembleIdentAtom),
            tableName: get(selectedReferenceTableNameAtom),
        },
        {
            ensembleIdent: get(userSelectedComparisonEnsembleIdentAtom),
            tableName: get(selectedComparisonTableNameAtom),
        },
    ];

    const definitionsPerSource: TableDefinitionsPerEnsemble[] = [];
    for (const spec of sourceSpecs) {
        const ensembleIdent = spec.ensembleIdent;
        if (!ensembleIdent || !spec.tableName || tableDefinitions.isLoading) {
            continue;
        }
        const forEnsemble = tableDefinitions.data.find((entry) => entry.ensembleIdent.equals(ensembleIdent));
        definitionsPerSource.push({
            ensembleIdent,
            tableDefinitions: (forEnsemble?.tableDefinitions ?? []).filter(
                (definition) => definition.tableName === spec.tableName,
            ),
        });
    }

    const tableNamesFilter = Array.from(
        new Set(sourceSpecs.map((spec) => spec.tableName).filter((name): name is string => name !== null)),
    );

    return new TableDefinitionsAccessor(definitionsPerSource, tableNamesFilter, selectedIndexValueCriteria);
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

/** True when the two selected sources are both complete and not the same ensemble/table pair. */
export const areSourcesDistinctAtom = atom((get) => {
    const referenceEnsembleIdent = get(userSelectedReferenceEnsembleIdentAtom);
    const comparisonEnsembleIdent = get(userSelectedComparisonEnsembleIdentAtom);
    const referenceTableName = get(selectedReferenceTableNameAtom);
    const comparisonTableName = get(selectedComparisonTableNameAtom);

    if (!referenceEnsembleIdent || !comparisonEnsembleIdent || !referenceTableName || !comparisonTableName) {
        return false;
    }

    const isSameEnsemble = referenceEnsembleIdent.equals(comparisonEnsembleIdent);
    return !(isSameEnsemble && referenceTableName === comparisonTableName);
});

/** True when both sides use the same ensemble, i.e. the comparison is purely between table sources. */
export const isSingleEnsembleComparisonAtom = atom((get) => {
    const referenceEnsembleIdent = get(userSelectedReferenceEnsembleIdentAtom);
    const comparisonEnsembleIdent = get(userSelectedComparisonEnsembleIdentAtom);
    return Boolean(
        referenceEnsembleIdent && comparisonEnsembleIdent && referenceEnsembleIdent.equals(comparisonEnsembleIdent),
    );
});

/** True when the two sides use different table sources. */
export const isCrossTableComparisonAtom = atom((get) => {
    const referenceTableName = get(selectedReferenceTableNameAtom);
    const comparisonTableName = get(selectedComparisonTableNameAtom);
    return Boolean(referenceTableName && comparisonTableName && referenceTableName !== comparisonTableName);
});
