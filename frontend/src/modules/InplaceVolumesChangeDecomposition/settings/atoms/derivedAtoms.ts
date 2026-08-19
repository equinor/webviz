import { atom } from "jotai";

import type { InplaceVolumesIndexWithValues_api, InplaceVolumesTableDefinition_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

import {
    FLUID_INDEX_COLUMN,
    getRequiredFluidForWaterfallTarget,
    getWaterfallFactorSpec,
    isWaterfallTargetResultName,
    WATERFALL_TARGET_RESULT_NAMES,
} from "../../view/utils/computeVolumeChangeDecomposition";

import { selectedIndexValueCriteriaAtom } from "./baseAtoms";
import {
    selectedComparisonEnsembleIdentAtom,
    selectedComparisonTableNameAtom,
    selectedIndicesWithValuesAtom,
    selectedReferenceEnsembleIdentAtom,
    selectedReferenceTableNameAtom,
    selectedResultNameAtom,
} from "./persistableFixableAtoms";
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

/** Table names are per ensemble, not intersected, since the two sides may use different tables. */
export const availableReferenceTableNamesAtom = atom((get) =>
    makeAvailableTableNames(get(tableDefinitionsQueryAtom).data, get(selectedReferenceEnsembleIdentAtom).value),
);

export const availableComparisonTableNamesAtom = atom((get) =>
    makeAvailableTableNames(get(tableDefinitionsQueryAtom).data, get(selectedComparisonEnsembleIdentAtom).value),
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
            ensembleIdent: get(selectedReferenceEnsembleIdentAtom).value,
            tableName: get(selectedReferenceTableNameAtom).value,
        },
        {
            ensembleIdent: get(selectedComparisonEnsembleIdentAtom).value,
            tableName: get(selectedComparisonTableNameAtom).value,
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
export const availableResultNamesAtom = atom<string[]>((get) => {
    const resultNamesIntersection = get(tableDefinitionsAccessorAtom).getResultNamesIntersection();
    return WATERFALL_TARGET_RESULT_NAMES.filter((resultName) => resultNamesIntersection.includes(resultName));
});

/** FLUID is excluded: it is dictated by the selected target volume, not chosen by the user. */
export const availableIndicesWithValuesAtom = atom((get) => {
    return get(tableDefinitionsAccessorAtom)
        .getCommonIndicesWithValues()
        .filter((indexWithValues) => indexWithValues.indexColumn !== FLUID_INDEX_COLUMN);
});

/**
 * The user-selected filters plus the fluid implied by the target. STOIIP decomposes the oil zone and
 * GIIP the gas zone, so the fluid follows from the target rather than being chosen by the user.
 */
export const indicesWithValuesForQueryAtom = atom<InplaceVolumesIndexWithValues_api[]>((get) => {
    const selectedIndicesWithValues = get(selectedIndicesWithValuesAtom).value;
    const selectedResultName = get(selectedResultNameAtom).value;

    if (!isWaterfallTargetResultName(selectedResultName)) {
        return selectedIndicesWithValues;
    }

    return [
        ...selectedIndicesWithValues,
        { indexColumn: FLUID_INDEX_COLUMN, values: [getRequiredFluidForWaterfallTarget(selectedResultName)] },
    ];
});

/**
 * Factor decomposition spec for the selected target, or null when the target is not decomposable or
 * a required volume column is unavailable. Passed to the view through the interface so settings and
 * view cannot disagree on whether the waterfall is computable.
 */
export const waterfallFactorSpecAtom = atom((get) => {
    const selectedResultName = get(selectedResultNameAtom).value;
    const resultNamesIntersection = get(tableDefinitionsAccessorAtom).getResultNamesIntersection();
    return getWaterfallFactorSpec(selectedResultName, resultNamesIntersection);
});

export const areSelectedTablesComparableAtom = atom((get) => {
    return get(tableDefinitionsAccessorAtom).getAreTablesComparable();
});

/** True when the two selected sources are both complete and not the same ensemble/table pair. */
export const areSourcesDistinctAtom = atom((get) => {
    const referenceEnsembleIdent = get(selectedReferenceEnsembleIdentAtom).value;
    const comparisonEnsembleIdent = get(selectedComparisonEnsembleIdentAtom).value;
    const referenceTableName = get(selectedReferenceTableNameAtom).value;
    const comparisonTableName = get(selectedComparisonTableNameAtom).value;

    if (!referenceEnsembleIdent || !comparisonEnsembleIdent || !referenceTableName || !comparisonTableName) {
        return false;
    }

    const isSameEnsemble = referenceEnsembleIdent.equals(comparisonEnsembleIdent);
    return !(isSameEnsemble && referenceTableName === comparisonTableName);
});

/** True when both sides use the same ensemble, i.e. the comparison is purely between table sources. */
export const isSingleEnsembleComparisonAtom = atom((get) => {
    const referenceEnsembleIdent = get(selectedReferenceEnsembleIdentAtom).value;
    const comparisonEnsembleIdent = get(selectedComparisonEnsembleIdentAtom).value;
    return Boolean(
        referenceEnsembleIdent && comparisonEnsembleIdent && referenceEnsembleIdent.equals(comparisonEnsembleIdent),
    );
});

/** True when the two sides use different table sources. */
export const isCrossTableComparisonAtom = atom((get) => {
    const referenceTableName = get(selectedReferenceTableNameAtom).value;
    const comparisonTableName = get(selectedComparisonTableNameAtom).value;
    return Boolean(referenceTableName && comparisonTableName && referenceTableName !== comparisonTableName);
});
