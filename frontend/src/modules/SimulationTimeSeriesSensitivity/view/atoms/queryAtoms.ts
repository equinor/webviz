import { Frequency_api } from "@api";
import { apiService } from "@framework/ApiService";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
import {
    resamplingFrequencyAtom,
    showStatisticsAtom,
    vectorSpecificationAtom,
} from "@modules/SimulationTimeSeriesSensitivity/view/atoms/baseAtoms";

import { atomWithQuery } from "jotai-tanstack-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const vectorDataQueryAtom = atomWithQuery((get) => {
    const vectorSpecification = get(vectorSpecificationAtom);
    const resampleFrequency = get(resamplingFrequencyAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const realizations = vectorSpecification
        ? validEnsembleRealizationsFunction(vectorSpecification?.ensembleIdent)
        : null;
    const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;

    const query = {
        queryKey: [
            "getRealizationsVectorData",
            vectorSpecification?.ensembleIdent.getCaseUuid(),
            vectorSpecification?.ensembleIdent.getEnsembleName(),
            vectorSpecification?.vectorName,
            resampleFrequency,
            realizations,
            realizationsEncodedAsUintListStr,
        ],
        queryFn: () =>
            apiService.timeseries.getRealizationsVectorData(
                vectorSpecification?.ensembleIdent.getCaseUuid() ?? "",
                vectorSpecification?.ensembleIdent.getEnsembleName() ?? "",
                vectorSpecification?.vectorName ?? "",
                resampleFrequency,
                realizationsEncodedAsUintListStr
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!vectorSpecification,
    };

    return query;
});

export const statisticalVectorSensitivityDataQueryAtom = atomWithQuery((get) => {
    const vectorSpecification = get(vectorSpecificationAtom);
    const resampleFrequency = get(resamplingFrequencyAtom);
    const showStatistics = get(showStatisticsAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const fallbackStatisticsResampleFrequency = resampleFrequency ?? Frequency_api.MONTHLY;

    const realizations = vectorSpecification
        ? validEnsembleRealizationsFunction(vectorSpecification?.ensembleIdent)
        : null;
    const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;

    const query = {
        queryKey: [
            "getStatisticalVectorDataPerSensitivity",
            vectorSpecification?.ensembleIdent.getCaseUuid(),
            vectorSpecification?.ensembleIdent.getEnsembleName(),
            vectorSpecification?.vectorName,
            fallbackStatisticsResampleFrequency,
            realizationsEncodedAsUintListStr,
        ],
        queryFn: () =>
            apiService.timeseries.getStatisticalVectorDataPerSensitivity(
                vectorSpecification?.ensembleIdent.getCaseUuid() ?? "",
                vectorSpecification?.ensembleIdent.getEnsembleName() ?? "",
                vectorSpecification?.vectorName ?? "",
                fallbackStatisticsResampleFrequency,
                undefined,
                realizationsEncodedAsUintListStr
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!(showStatistics && vectorSpecification),
    };

    return query;
});

export const historicalVectorDataQueryAtom = atomWithQuery((get) => {
    const vectorSpecification = get(vectorSpecificationAtom);
    const resampleFrequency = get(resamplingFrequencyAtom);

    const query = {
        queryKey: [
            "getHistoricalVectorData",
            vectorSpecification?.ensembleIdent.getCaseUuid(),
            vectorSpecification?.ensembleIdent.getEnsembleName(),
            vectorSpecification?.vectorName,
            resampleFrequency,
        ],
        queryFn: () =>
            apiService.timeseries.getHistoricalVectorData(
                vectorSpecification?.ensembleIdent.getCaseUuid() ?? "",
                vectorSpecification?.ensembleIdent.getEnsembleName() ?? "",
                vectorSpecification?.vectorName ?? "",
                resampleFrequency
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: !!vectorSpecification,
    };

    return query;
});
