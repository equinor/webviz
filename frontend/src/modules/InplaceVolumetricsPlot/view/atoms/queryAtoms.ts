import { InplaceVolumetricResultName_api } from "@api";
import { atomWithQueries } from "@framework/utils/atomUtils";
import { useGetAggregatedPerRealizationTableDataQueries } from "@modules/_shared/InplaceVolumetrics/queryHooks";

import {
    areSelectedTablesComparableAtom,
    areTableDefinitionSelectionsValidAtom,
    resultName2Atom,
    resultNameAtom,
} from "./baseAtoms";
import {
    doAccumulateFluidZonesAtom,
    ensembleIdentsWithRealizationsAtom,
    fluidZonesAtom,
    groupByIdentifiersAtom,
    identifiersValuesAtom,
    tableNamesAtom,
} from "./derivedAtoms";

export const aggregatedTableDataQueriesAtom = atomWithQueries((get) => {
    const resultName = get(resultNameAtom);
    const resultName2 = get(resultName2Atom);
    const resultNames: InplaceVolumetricResultName_api[] = [];
    if (resultName !== null) {
        resultNames.push(resultName);
    }
    if (resultName2 !== null) {
        resultNames.push(resultName2);
    }

    const doAccumulateFluidZones = get(doAccumulateFluidZonesAtom);
    const groupByIdentifiers = get(groupByIdentifiersAtom);
    const tableNames = get(tableNamesAtom);
    const fluidZones = get(fluidZonesAtom);
    const identifiersValues = get(identifiersValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);
    const areSelectedTablesComparable = get(areSelectedTablesComparableAtom);
    const areTableDefinitionSelectionsValid = get(areTableDefinitionSelectionsValidAtom);

    const enableQueries = areSelectedTablesComparable && areTableDefinitionSelectionsValid;

    return useGetAggregatedPerRealizationTableDataQueries(
        ensembleIdentsWithRealizations,
        tableNames,
        resultNames,
        fluidZones,
        groupByIdentifiers,
        doAccumulateFluidZones,
        identifiersValues,
        enableQueries
    );
});
