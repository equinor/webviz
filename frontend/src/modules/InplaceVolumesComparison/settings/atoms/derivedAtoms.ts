import type { Getter } from "jotai";
import { atom } from "jotai";

import type { InplaceVolumesIndexWithValues_api, InplaceVolumesTableDefinition_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IndexValueCriteria, TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

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

/** The single table definition backing each side, or null while unselected or still loading. */
function getSourceTableDefinitions(get: Getter): {
    reference: InplaceVolumesTableDefinition_api | null;
    comparison: InplaceVolumesTableDefinition_api | null;
} {
    const tableDefinitions = get(tableDefinitionsQueryAtom);

    function findDefinition(
        ensembleIdent: RegularEnsembleIdent | null,
        tableName: string | null,
    ): InplaceVolumesTableDefinition_api | null {
        if (!ensembleIdent || !tableName || tableDefinitions.isLoading) {
            return null;
        }
        const forEnsemble = tableDefinitions.data.find((entry) => entry.ensembleIdent.equals(ensembleIdent));
        return forEnsemble?.tableDefinitions.find((definition) => definition.tableName === tableName) ?? null;
    }

    return {
        reference: findDefinition(
            get(selectedReferenceEnsembleIdentAtom).value,
            get(selectedReferenceTableNameAtom).value,
        ),
        comparison: findDefinition(
            get(selectedComparisonEnsembleIdentAtom).value,
            get(selectedComparisonTableNameAtom).value,
        ),
    };
}

/**
 * Accessor over exactly the two selected (ensemble, table) sources. The definitions are pre-filtered
 * per source, because passing both table names to an unfiltered accessor would also intersect the
 * two ensemble/table combinations that were not selected.
 *
 * Always constructed with ALLOW_INTERSECTION so that differing index values are reported per column
 * rather than marking the whole pair incomparable. This module resolves such columns itself, either
 * by leaving them unfiltered or by intersecting them, see `availableIndicesWithValuesAtom`.
 */
export const tableDefinitionsAccessorAtom = atom((get) => {
    const sourceTableDefinitions = getSourceTableDefinitions(get);
    const sourceSpecs = [
        { ensembleIdent: get(selectedReferenceEnsembleIdentAtom).value, definition: sourceTableDefinitions.reference },
        {
            ensembleIdent: get(selectedComparisonEnsembleIdentAtom).value,
            definition: sourceTableDefinitions.comparison,
        },
    ];

    const sourceDefinitions: TableDefinitionsPerEnsemble[] = [];
    for (const spec of sourceSpecs) {
        if (!spec.ensembleIdent || !spec.definition) {
            continue;
        }
        sourceDefinitions.push({ ensembleIdent: spec.ensembleIdent, tableDefinitions: [spec.definition] });
    }

    const allowedTableNames = Array.from(
        new Set(sourceDefinitions.map((source) => source.tableDefinitions[0].tableName)),
    );

    return new TableDefinitionsAccessor(sourceDefinitions, allowedTableNames, IndexValueCriteria.ALLOW_INTERSECTION);
});

/** Only decomposable hydrocarbon volumes are selectable as the waterfall target. */
export const availableResultNamesAtom = atom<string[]>((get) => {
    const resultNamesIntersection = get(tableDefinitionsAccessorAtom).getResultNamesIntersection();
    return WATERFALL_TARGET_RESULT_NAMES.filter((resultName) => resultNamesIntersection.includes(resultName));
});

/** FLUID is excluded: it is dictated by the selected target volume, not chosen by the user. */
export const commonIndicesWithValuesAtom = atom((get) => {
    return get(tableDefinitionsAccessorAtom)
        .getCommonIndicesWithValues()
        .filter((indexWithValues) => indexWithValues.indexColumn !== FLUID_INDEX_COLUMN);
});

export type IndexColumnDifference = {
    indexColumn: string;
    /** Set when the column is entirely absent from one of the two sources. */
    missingFrom: "reference" | "comparison" | null;
    referenceOnlyValues: string[];
    comparisonOnlyValues: string[];
};

/** Index columns the two sources do not agree on, either structurally or in their available values. */
export const indexColumnDifferencesAtom = atom<IndexColumnDifference[]>((get) => {
    const { reference, comparison } = getSourceTableDefinitions(get);
    if (!reference || !comparison) {
        return [];
    }

    const differences: IndexColumnDifference[] = [];
    const indexColumns = new Set(
        [...reference.indicesWithValues, ...comparison.indicesWithValues]
            .map((indexWithValues) => indexWithValues.indexColumn)
            .filter((indexColumn) => indexColumn !== FLUID_INDEX_COLUMN),
    );

    for (const indexColumn of indexColumns) {
        const referenceIndex = reference.indicesWithValues.find((item) => item.indexColumn === indexColumn);
        const comparisonIndex = comparison.indicesWithValues.find((item) => item.indexColumn === indexColumn);

        if (!referenceIndex || !comparisonIndex) {
            differences.push({
                indexColumn,
                missingFrom: referenceIndex ? "comparison" : "reference",
                referenceOnlyValues: [],
                comparisonOnlyValues: [],
            });
            continue;
        }

        const referenceOnlyValues = referenceIndex.values.filter((value) => !comparisonIndex.values.includes(value));
        const comparisonOnlyValues = comparisonIndex.values.filter((value) => !referenceIndex.values.includes(value));
        if (referenceOnlyValues.length > 0 || comparisonOnlyValues.length > 0) {
            differences.push({ indexColumn, missingFrom: null, referenceOnlyValues, comparisonOnlyValues });
        }
    }

    return differences;
});

/** True when the user has opted into filtering on the intersection of differing index values. */
export const isIndexValueIntersectionEnabledAtom = atom(
    (get) => get(selectedIndexValueCriteriaAtom) === IndexValueCriteria.ALLOW_INTERSECTION,
);

/** True when intersecting is enabled and actually narrows the data, i.e. the compared totals are partial. */
export const isIndexValueIntersectionActiveAtom = atom((get) => {
    if (!get(isIndexValueIntersectionEnabledAtom)) {
        return false;
    }
    // A column missing entirely from one source can never be intersected (it never enters
    // availableIndicesWithValuesAtom), so it does not make the switch narrow anything.
    return get(indexColumnDifferencesAtom).some((difference) => difference.missingFrom === null);
});

/**
 * Index columns the two sources share but do not agree on the values of, and that are therefore not
 * offered as filters. They are omitted from the query so both sides stay unfiltered on that axis and
 * the compared totals remain whole-field.
 */
export const indexColumnsLeftUnfilteredAtom = atom<string[]>((get) => {
    if (get(isIndexValueIntersectionEnabledAtom)) {
        return [];
    }
    return get(tableDefinitionsAccessorAtom).getIndexColumnsWithDifferingValues();
});

/** Index columns offered as filters, i.e. the common columns the two sources agree on the values of. */
export const availableIndicesWithValuesAtom = atom((get) => {
    const commonIndicesWithValues = get(commonIndicesWithValuesAtom);
    const indexColumnsLeftUnfiltered = get(indexColumnsLeftUnfilteredAtom);
    return commonIndicesWithValues.filter(
        (indexWithValues) => !indexColumnsLeftUnfiltered.includes(indexWithValues.indexColumn),
    );
});

/** Filters with no selected value would exclude every row, so the query is not run for them. */
export const indexColumnsWithNoSelectedValuesAtom = atom<string[]>((get) => {
    const selectedIndicesWithValues = get(selectedIndicesWithValuesAtom).value;
    return get(availableIndicesWithValuesAtom)
        .filter(
            (available) =>
                (selectedIndicesWithValues.find((selected) => selected.indexColumn === available.indexColumn)?.values
                    .length ?? 0) === 0,
        )
        .map((available) => available.indexColumn);
});

/**
 * False for a persisted/template selection that is invalid in the current context (e.g. it references
 * a REGION/ZONE value no longer available). Such a selection is passed through unfixed by
 * `persistableFixableAtom`, so it must be checked explicitly before querying with it.
 */
export const areSelectedIndicesWithValuesValidAtom = atom<boolean>((get) => {
    return get(selectedIndicesWithValuesAtom).isValidInContext;
});

/**
 * The user-selected filters plus the fluid implied by the target. STOIIP decomposes the oil zone and
 * GIIP the gas zone, so the fluid follows from the target rather than being chosen by the user.
 */
export const indicesWithValuesForQueryAtom = atom<InplaceVolumesIndexWithValues_api[]>((get) => {
    const availableIndexColumns = get(availableIndicesWithValuesAtom).map(
        (indexWithValues) => indexWithValues.indexColumn,
    );
    // Guards against a stale selection briefly re-filtering a column meant to be left unfiltered.
    const selectedIndicesWithValues = get(selectedIndicesWithValuesAtom).value.filter((indexWithValues) =>
        availableIndexColumns.includes(indexWithValues.indexColumn),
    );
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

/** False only when the two sources share no index column at all, i.e. are structurally incompatible. */
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
