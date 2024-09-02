import { atomWithQueries } from "@framework/utils/atomUtils";
import {
    useGetAggregatedPerRealizationTableDataQueries,
    useGetAggregatedStatisticalTableDataQueries,
} from "@modules/_shared/InplaceVolumetrics/queryHooks";
import { TableType } from "@modules/_shared/InplaceVolumetrics/types";

import {
    accumulateFluidZonesAtom,
    ensembleIdentsWithRealizationsAtom,
    fluidZonesAtom,
    groupByIdentifiersAtom,
    identifiersValuesAtom,
    resultNamesAtom,
    tableNamesAtom,
    tableTypeAtom,
} from "./derivedAtoms";

export const perRealizationTableDataResultsAtom = atomWithQueries((get) => {
    const resultNames = get(resultNamesAtom);
    const tableType = get(tableTypeAtom);

    const accumulateFluidZones = get(accumulateFluidZonesAtom);
    const groupByIdentifiers = get(groupByIdentifiersAtom);
    const tableNames = get(tableNamesAtom);
    const fluidZones = get(fluidZonesAtom);
    const identifiersValues = get(identifiersValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);

    const enableQueries = tableType === TableType.PER_REALIZATION;

    return useGetAggregatedPerRealizationTableDataQueries(
        ensembleIdentsWithRealizations,
        tableNames,
        resultNames,
        fluidZones,
        groupByIdentifiers,
        accumulateFluidZones,
        identifiersValues,
        enableQueries
    );
});

export const statisticalTableDataResultsAtom = atomWithQueries((get) => {
    const resultNames = get(resultNamesAtom);
    const tableType = get(tableTypeAtom);

    const accumulateFluidZones = get(accumulateFluidZonesAtom);
    const groupByIdentifiers = get(groupByIdentifiersAtom);
    const tableNames = get(tableNamesAtom);
    const fluidZones = get(fluidZonesAtom);
    const identifiersValues = get(identifiersValuesAtom);
    const ensembleIdentsWithRealizations = get(ensembleIdentsWithRealizationsAtom);

    const enableQueries = tableType === TableType.STATISTICAL;

    return useGetAggregatedStatisticalTableDataQueries(
        ensembleIdentsWithRealizations,
        tableNames,
        resultNames,
        fluidZones,
        groupByIdentifiers,
        accumulateFluidZones,
        identifiersValues,
        enableQueries
    );
});