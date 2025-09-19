import { atom } from "jotai";

import { createLoadedVectorSpecificationAndDataArray } from "../utils/vectorSpecificationsAndQueriesUtils";

import { userSelectedActiveTimestampUtcMsAtom, vectorSpecificationsAtom } from "./baseAtoms";
import {
    regularEnsembleHistoricalVectorDataQueriesAtom,
    vectorDataQueriesAtom,
    vectorObservationsQueriesAtom,
    vectorStatisticsQueriesAtom,
} from "./queryAtoms";

export const queryIsFetchingAtom = atom((get) => {
    const vectorDataQueries = get(vectorDataQueriesAtom);
    const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);
    const historicalVectorDataQueries = get(regularEnsembleHistoricalVectorDataQueriesAtom);
    const vectorObservationsQueries = get(vectorObservationsQueriesAtom);

    const vectorDataIsFetching = vectorDataQueries.some((query) => query.isFetching);
    const vectorStatisticsIsFetching = vectorStatisticsQueries.some((query) => query.isFetching);
    const historicalVectorDataIsFetching = historicalVectorDataQueries.isFetching;
    const vectorObservationsIsFetching = vectorObservationsQueries.isFetching;

    const isFetching =
        vectorDataIsFetching ||
        vectorStatisticsIsFetching ||
        historicalVectorDataIsFetching ||
        vectorObservationsIsFetching;

    return isFetching;
});

export const realizationsQueryHasErrorAtom = atom((get) => {
    const vectorDataQueries = get(vectorDataQueriesAtom);

    return vectorDataQueries.some((query) => query.isError);
});

export const statisticsQueryHasErrorAtom = atom((get) => {
    const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);

    return vectorStatisticsQueries.some((query) => query.isError);
});

export const loadedVectorSpecificationsAndRealizationDataAtom = atom((get) => {
    const vectorDataQueries = get(vectorDataQueriesAtom);
    const vectorSpecifications = get(vectorSpecificationsAtom);

    return createLoadedVectorSpecificationAndDataArray(vectorSpecifications, vectorDataQueries);
});

export const loadedVectorSpecificationsAndStatisticsDataAtom = atom((get) => {
    const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);
    const vectorSpecifications = get(vectorSpecificationsAtom);

    return createLoadedVectorSpecificationAndDataArray(vectorSpecifications, vectorStatisticsQueries);
});

export const loadedVectorSpecificationsAndObservationDataAtom = atom((get) => {
    const vectorObservationsQueries = get(vectorObservationsQueriesAtom);

    // The observations data queries is combined result, where data array only contains fetched data
    const loadedVectorSpecificationsAndObservationData = Array.from(
        vectorObservationsQueries.ensembleVectorObservationDataMap.values(),
    ).flatMap((ensemble) => ensemble.vectorsObservationData);

    return loadedVectorSpecificationsAndObservationData;
});

export const loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom = atom((get) => {
    const regularEnsembleHistoricalVectorDataQueries = get(regularEnsembleHistoricalVectorDataQueriesAtom);

    // Historical data queries is combined result, where data array only contains fetched data
    return regularEnsembleHistoricalVectorDataQueries.vectorsWithHistoricalData;
});

export const activeTimestampUtcMsAtom = atom<number | null>((get) => {
    const loadedVectorSpecificationsAndRealizationData = get(loadedVectorSpecificationsAndRealizationDataAtom);
    const isQueryFetching = get(queryIsFetchingAtom);
    const userSelectedActiveTimestampUtcMs = get(userSelectedActiveTimestampUtcMsAtom);

    if (
        !isQueryFetching &&
        userSelectedActiveTimestampUtcMs === null &&
        loadedVectorSpecificationsAndRealizationData.length > 0
    ) {
        const lastTimeStamp =
            loadedVectorSpecificationsAndRealizationData.at(0)?.data.at(0)?.timestampsUtcMs.at(-1) ?? null;
        return lastTimeStamp;
    }

    return userSelectedActiveTimestampUtcMs;
});
