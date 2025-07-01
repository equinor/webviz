import { atomWithQueries } from "@framework/utils/atomUtils";
import { useGetAggregatedPerRealizationTableDataQueries } from "@modules/_shared/InplaceVolumes/queryHooks";

import { areTableDefinitionSelectionsValidAtom, secondResultNameAtom, firstResultNameAtom } from "./baseAtoms";
import {
    areSelectedTablesComparableAtom,
    ensembleIdentsWithRealizationsAtom,
    groupByIndicesAtom,
    indicesWithValuesAtom,
    tableNamesAtom,
} from "./derivedAtoms";

export const aggregatedTableDataQueriesAtom = atomWithQueries((get) => {
    const firstResultName = get(firstResultNameAtom);
    const secondResultName = get(secondResultNameAtom);
    const resultNames: string[] = [];
    if (firstResultName !== null) {
        resultNames.push(firstResultName);
    }
    if (secondResultName !== null) {
        resultNames.push(secondResultName);
    }

    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

    const enableQueries = areSelectedTablesComparable && areTableDefinitionSelectionsValid;

    return useGetAggregatedPerRealizationTableDataQueries(
        ensembleIdentsWithRealizations,
        tableNames,
        resultNames,
        groupByIndices,
        indicesWithValues,
        enableQueries,
    );
});
