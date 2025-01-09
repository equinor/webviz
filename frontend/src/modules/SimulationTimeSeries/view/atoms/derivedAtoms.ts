import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { isEnsembleIdentOfType } from "@framework/utils/ensembleIdentUtils";

import { atom } from "jotai";

import { userSelectedActiveTimestampUtcMsAtom, vectorSpecificationsAtom } from "./baseAtoms";
import {
    regularEnsembleHistoricalVectorDataQueriesAtom,
    vectorDataQueriesAtom,
    vectorObservationsQueriesAtom,
    vectorStatisticsQueriesAtom,
} from "./queryAtoms";

import { createLoadedVectorSpecificationAndDataArray } from "../utils/vectorSpecificationsAndQueriesUtils";

export const queryIsFetchingAtom = atom((get) => {
    const vectorDataQueries = get(vectorDataQueriesAtom);
    const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);
    const historicalVectorDataQueries = get(regularEnsembleHistoricalVectorDataQueriesAtom);
    const vectorObservationsQueries = get(vectorObservationsQueriesAtom);

    const vectorDataIsFetching = vectorDataQueries.some((query) => query.isFetching);
    const vectorStatisticsIsFetching = vectorStatisticsQueries.some((query) => query.isFetching);
    const historicalVectorDataIsFetching = historicalVectorDataQueries.some((query) => query.isFetching);
    const vectorObservationsIsFetching = vectorObservationsQueries.isFetching;

    const isFetching =
        vectorDataIsFetching ||
        vectorStatisticsIsFetching ||
        historicalVectorDataIsFetching ||
        vectorObservationsIsFetching;

    return isFetching;
});

export const regularEnsembleVectorSpecificationsAtom = atom((get) => {
    const vectorSpecifications = get(vectorSpecificationsAtom);

    return vectorSpecifications.filter((elm) => isEnsembleIdentOfType(elm.ensembleIdent, RegularEnsembleIdent));
});

export const realizationsQueryHasErrorAtom = atom((get) => {
    const vectorDataQueries = get(vectorDataQueriesAtom);

    return vectorDataQueries.some((query) => query.isError);
});

export const statisticsQueryHasErrorAtom = atom((get) => {
    const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);

    return vectorStatisticsQueries.some((query) => query.isError);
});

export const historicalDataQueryHasErrorAtom = atom((get) => {
    const historicalVectorDataQueries = get(regularEnsembleHistoricalVectorDataQueriesAtom);

    return historicalVectorDataQueries.some((elm) => elm.isError);
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

export const loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom = atom((get) => {
    const regularEnsembleVectorSpecifications = get(regularEnsembleVectorSpecificationsAtom);
    const regularEnsembleHistoricalVectorDataQueries = get(regularEnsembleHistoricalVectorDataQueriesAtom);

    return createLoadedVectorSpecificationAndDataArray(
        regularEnsembleVectorSpecifications,
        regularEnsembleHistoricalVectorDataQueries
    );
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
        const firstTimeStamp =
            loadedVectorSpecificationsAndRealizationData.at(0)?.data.at(0)?.timestamps_utc_ms[0] ?? null;
        return firstTimeStamp;
    }

    return userSelectedActiveTimestampUtcMs;
});
