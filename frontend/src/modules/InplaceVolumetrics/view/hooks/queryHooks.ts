import {
    Body_get_result_data_per_realization_api,
    InplaceVolumetricData_api,
    InplaceVolumetricResponseNames_api,
    InplaceVolumetricsCategoryValues_api,
} from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdentWithRealizations, PlotGroupingEnum } from "@modules/InplaceVolumetrics/typesAndEnums";
import { UseQueryResult, useQueries } from "@tanstack/react-query";

import { groupBy } from "lodash";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;
export function useInplaceDataResultsQuery(
    ensembleIdentsWithRealizations: EnsembleIdentWithRealizations[],
    tableName: string | null,
    responseName: InplaceVolumetricResponseNames_api | null,
    categoryFilters: InplaceVolumetricsCategoryValues_api[],
    groupBy: PlotGroupingEnum | undefined,
    colorBy: PlotGroupingEnum | undefined
): UseQueryResult<InplaceVolumetricData_api>[] {
    if (groupBy === PlotGroupingEnum.ENSEMBLE || groupBy === PlotGroupingEnum.None) {
        groupBy = undefined;
    }
    if (colorBy === PlotGroupingEnum.ENSEMBLE || colorBy === PlotGroupingEnum.None) {
        colorBy = undefined;
    }

    return useQueries({
        queries: (ensembleIdentsWithRealizations ?? []).map((el) =>
            createQueryForInplaceDataResults(el, tableName, responseName, categoryFilters, groupBy, colorBy)
        ),
    });
}

export function createQueryForInplaceDataResults(
    ensIdentWithReals: EnsembleIdentWithRealizations,
    tableName: string | null,
    responseName: InplaceVolumetricResponseNames_api | null,
    categoryFilters: InplaceVolumetricsCategoryValues_api[],
    groupBy: string | undefined,
    colorBy: string | undefined
) {
    const bodyCategoryFilters: Body_get_result_data_per_realization_api = {
        categorical_filter: categoryFilters ?? [],
    };

    return {
        queryKey: [
            "getInplaceDataResults",
            ensIdentWithReals.ensembleIdent.toString(),
            tableName,
            responseName,
            ensIdentWithReals.realizations,
            bodyCategoryFilters,
            groupBy,
            colorBy,
        ],
        queryFn: () =>
            apiService.inplaceVolumetrics.getResultDataPerRealization(
                ensIdentWithReals.ensembleIdent.getCaseUuid(),
                ensIdentWithReals.ensembleIdent.getEnsembleName(),
                tableName ?? "",
                responseName ?? InplaceVolumetricResponseNames_api.STOIIP_OIL,
                ensIdentWithReals.realizations ?? [],
                bodyCategoryFilters,
                groupBy,
                colorBy
            ),
        staleTime: STALE_TIME,
        cacheTime: CACHE_TIME,
        enabled: Boolean(ensIdentWithReals && tableName && responseName && categoryFilters),
    };
}
