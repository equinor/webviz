import { atomWithQueries } from "@framework/utils/atomUtils";
import { useGetAggregatedPerRealizationTableDataQueries } from "@modules/_shared/InplaceVolumes/queryHooks";

import { areTableDefinitionSelectionsValidAtom, resultName2Atom, resultNameAtom } from "./baseAtoms";
import {
    areSelectedTablesComparableAtom,
    doAccumulateFluidsAtom,
    ensembleIdentsWithRealizationsAtom,
    fluidsAtom,
    groupByIndicesAtom,
    indicesWithValuesAtom,
    tableNamesAtom,
} from "./derivedAtoms";

export const aggregatedTableDataQueriesAtom = atomWithQueries((get) => {
    const resultName = get(resultNameAtom);
    const resultName2 = get(resultName2Atom);
    const resultNames: string[] = [];
    if (resultName !== null) {
        resultNames.push(resultName);
    }
    if (resultName2 !== null) {
        resultNames.push(resultName2);
    }

    const doAccumulateFluids = get(doAccumulateFluidsAtom);
    const groupByIndices = get(groupByIndicesAtom);
    const tableNames = get(tableNamesAtom);
    const fluids = get(fluidsAtom);
    const indicesWithValues = get(indicesWithValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

    const enableQueries = areSelectedTablesComparable && areTableDefinitionSelectionsValid;

    return useGetAggregatedPerRealizationTableDataQueries(
        ensembleIdentsWithRealizations,
        tableNames,
        resultNames,
        fluids,
        groupByIndices,
        doAccumulateFluids,
        indicesWithValues,
        enableQueries,
    );
});
