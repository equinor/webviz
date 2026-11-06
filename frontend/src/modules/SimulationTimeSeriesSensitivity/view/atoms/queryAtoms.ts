import type { UseQueryResult } from "@tanstack/react-query";
import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";

import {
    Frequency_api,
    type VectorRealizationData_api,
    type VectorStatisticSensitivityData_api,
    getHistoricalVectorDataOptions,
    getRealizationsVectorData,
    getRealizationsVectorDataQueryKey,
    getStatisticalVectorDataPerSensitivity,
    getStatisticalVectorDataPerSensitivityQueryKey,
    getQueryResultWarnings,
    unwrapQueryResultWarnings,
    withWarnings,
} from "@api";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
import {
    resamplingFrequencyAtom,
    showHistoricalAtom,
    showStatisticsAtom,
    vectorSpecificationAtom,
} from "@modules/SimulationTimeSeriesSensitivity/view/atoms/baseAtoms";

const vectorDataWithWarningsQueryAtom = atomWithQuery((get) => {
    const vectorSpecification = get(vectorSpecificationAtom);
    const resampleFrequency = get(resamplingFrequencyAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const realizations = vectorSpecification
        ? validEnsembleRealizationsFunction(vectorSpecification?.ensembleIdent)
        : null;
    const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;

    const queryOptions = withWarnings(getRealizationsVectorData, getRealizationsVectorDataQueryKey, {
        query: {
            case_uuid: vectorSpecification?.ensembleIdent.getCaseUuid() ?? "",
            ensemble_name: vectorSpecification?.ensembleIdent.getEnsembleName() ?? "",
            vector_name: vectorSpecification?.vectorName ?? "",
            resampling_frequency: resampleFrequency,
            realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
            ...makeCacheBustingQueryParam(vectorSpecification?.ensembleIdent ?? null),
        },
    });
    return { ...queryOptions, enabled: !!vectorSpecification };
});

const statisticalVectorSensitivityDataWithWarningsQueryAtom = atomWithQuery((get) => {
    const vectorSpecification = get(vectorSpecificationAtom);
    const resampleFrequency = get(resamplingFrequencyAtom);
    const showStatistics = get(showStatisticsAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const fallbackStatisticsResampleFrequency = resampleFrequency ?? Frequency_api.MONTHLY;

    const realizations = vectorSpecification
        ? validEnsembleRealizationsFunction(vectorSpecification?.ensembleIdent)
        : null;
    const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;

    const queryOptions = withWarnings(
        getStatisticalVectorDataPerSensitivity,
        getStatisticalVectorDataPerSensitivityQueryKey,
        {
            query: {
                case_uuid: vectorSpecification?.ensembleIdent.getCaseUuid() ?? "",
                ensemble_name: vectorSpecification?.ensembleIdent.getEnsembleName() ?? "",
                vector_name: vectorSpecification?.vectorName ?? "",
                resampling_frequency: fallbackStatisticsResampleFrequency,
                statistic_functions: undefined,
                realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
                ...makeCacheBustingQueryParam(vectorSpecification?.ensembleIdent ?? null),
            },
        },
    );
    return { ...queryOptions, enabled: !!(showStatistics && vectorSpecification) };
});

// Unwrap the data to keep the query result shape unchanged for consumers
export const vectorDataQueryAtom = atom((get) => {
    const query = get(vectorDataWithWarningsQueryAtom);
    return unwrapQueryResultWarnings(query) as UseQueryResult<VectorRealizationData_api[]>;
});

export const statisticalVectorSensitivityDataQueryAtom = atom((get) => {
    const query = get(statisticalVectorSensitivityDataWithWarningsQueryAtom);
    return unwrapQueryResultWarnings(query) as UseQueryResult<VectorStatisticSensitivityData_api[]>;
});

export const vectorDataWarningsAtom = atom((get) => [
    ...getQueryResultWarnings(get(vectorDataWithWarningsQueryAtom)),
    ...getQueryResultWarnings(get(statisticalVectorSensitivityDataWithWarningsQueryAtom)),
]);

export const historicalVectorDataQueryAtom = atomWithQuery((get) => {
    const vectorSpecification = get(vectorSpecificationAtom);
    const showHistorical = get(showHistoricalAtom);
    const resampleFrequency = get(resamplingFrequencyAtom);

    const queryOptions = getHistoricalVectorDataOptions({
        query: {
            case_uuid: vectorSpecification?.ensembleIdent.getCaseUuid() ?? "",
            ensemble_name: vectorSpecification?.ensembleIdent.getEnsembleName() ?? "",
            non_historical_vector_name: vectorSpecification?.vectorName ?? "",
            resampling_frequency: resampleFrequency,
            ...makeCacheBustingQueryParam(vectorSpecification?.ensembleIdent ?? null),
        },
    });

    return { ...queryOptions, enabled: !!(showHistorical && vectorSpecification) };
});
