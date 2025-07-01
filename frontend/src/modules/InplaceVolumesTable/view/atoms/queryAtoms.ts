import { atomWithQueries } from "@framework/utils/atomUtils";
import {
    useGetAggregatedPerRealizationTableDataQueries,
    useGetAggregatedStatisticalTableDataQueries,
} from "@modules/_shared/InplaceVolumes/queryHooks";
import { TableType } from "@modules/_shared/InplaceVolumes/types";

import { groupByIndicesAtom, areTableDefinitionSelectionsValidAtom, resultNamesAtom, tableTypeAtom } from "./baseAtoms";
import {
    areSelectedTablesComparableAtom,
    ensembleIdentsWithRealizationsAtom,
    indicesWithValuesAtom,
    tableNamesAtom,
} from "./derivedAtoms";

export const perRealizationTableDataResultsAtom = atomWithQueries((get) => {
    const resultNames = get(resultNamesAtom);
    const tableType = get(tableTypeAtom);

    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

    const enableQueries =
        tableType === TableType.PER_REALIZATION && areSelectedTablesComparable && areTableDefinitionSelectionsValid;

    return useGetAggregatedPerRealizationTableDataQueries(
        ensembleIdentsWithRealizations,
        tableNames,
        resultNames,
        groupByIndices,
        indicesWithValues,
        enableQueries,
    );
});

export const statisticalTableDataResultsAtom = atomWithQueries((get) => {
    const resultNames = get(resultNamesAtom);
    const tableType = get(tableTypeAtom);

    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

    const enableQueries =
        tableType === TableType.STATISTICAL && areSelectedTablesComparable && areTableDefinitionSelectionsValid;

    return useGetAggregatedStatisticalTableDataQueries(
        ensembleIdentsWithRealizations,
        tableNames,
        resultNames,
        groupByIndices,
        indicesWithValues,
        enableQueries,
    );
});
