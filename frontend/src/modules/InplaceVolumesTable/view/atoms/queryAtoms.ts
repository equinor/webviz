import { atomWithQueries } from "@framework/utils/atomUtils";
import {
    useGetAggregatedPerRealizationTableDataQueries,
    useGetAggregatedStatisticalTableDataQueries,
} from "@modules/_shared/InplaceVolumes/queryHooks";
import { TableType } from "@modules/_shared/InplaceVolumes/types";

import { areTableDefinitionSelectionsValidAtom, resultNamesAtom, tableTypeAtom } from "./baseAtoms";
import {
    accumulateFluidsAtom,
    areSelectedTablesComparableAtom,
    ensembleIdentsWithRealizationsAtom,
    fluidsAtom,
    groupByIndicesAtom,
    indicesWithValuesAtom,
    tableNamesAtom,
} from "./derivedAtoms";

export const perRealizationTableDataResultsAtom = atomWithQueries((get) => {
    const resultNames = get(resultNamesAtom);
    const tableType = get(tableTypeAtom);

    const accumulateFluids = get(accumulateFluidsAtom);
    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const fluids = get(fluidsAtom);
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
        fluids,
        groupByIndices,
        accumulateFluids,
        indicesWithValues,
        enableQueries,
    );
});

export const statisticalTableDataResultsAtom = atomWithQueries((get) => {
    const resultNames = get(resultNamesAtom);
    const tableType = get(tableTypeAtom);

    const accumulateFluids = get(accumulateFluidsAtom);
    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const fluids = get(fluidsAtom);
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
        fluids,
        groupByIndices,
        accumulateFluids,
        indicesWithValues,
        enableQueries,
    );
});
