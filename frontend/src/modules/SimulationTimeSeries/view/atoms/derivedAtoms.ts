import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleRealizationFilterFunctionAtom, EnsembleSetAtom } from "@framework/GlobalAtoms";
import { VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";

import { atom } from "jotai";

import {
    interfaceColorByParameterAtom,
    parameterIdentAtom,
    selectedEnsemblesAtom,
    userSelectedActiveTimestampUtcMsAtom,
    vectorSpecificationsAtom,
    visualizationModeAtom,
} from "./baseAtoms";
import {
    historicalVectorDataQueriesAtom,
    vectorDataQueriesAtom,
    vectorObservationsQueriesAtom,
    vectorStatisticsQueriesAtom,
} from "./queryAtoms";

import { createLoadedVectorSpecificationAndDataArray } from "../utils/vectorSpecificationsAndQueriesUtils";

export const validEnsembleRealizationsFunctionAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    let validEnsembleRealizationsFunction = get(EnsembleRealizationFilterFunctionAtom);

    if (validEnsembleRealizationsFunction === null) {
        validEnsembleRealizationsFunction = (ensembleIdent: EnsembleIdent) => {
            return ensembleSet.findEnsemble(ensembleIdent)?.getRealizations() ?? [];
        };
    }

    return validEnsembleRealizationsFunction;
});

export const queryIsFetchingAtom = atom((get) => {
    const vectorDataQueries = get(vectorDataQueriesAtom);
    const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);
    const historicalVectorDataQueries = get(historicalVectorDataQueriesAtom);
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

export const realizationsQueryHasErrorAtom = atom((get) => {
    const vectorDataQueries = get(vectorDataQueriesAtom);

    return vectorDataQueries.some((query) => query.isError);
});

export const statisticsQueryHasErrorAtom = atom((get) => {
    const vectorStatisticsQueries = get(vectorStatisticsQueriesAtom);

    return vectorStatisticsQueries.some((query) => query.isError);
});

export const historicalDataQueryHasErrorAtom = atom((get) => {
    const historicalVectorDataQueries = get(historicalVectorDataQueriesAtom);

    return historicalVectorDataQueries.some((query) => query.isError);
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

export const loadedVectorSpecificationsAndHistoricalDataAtom = atom((get) => {
    const historicalVectorDataQueries = get(historicalVectorDataQueriesAtom);
    const vectorSpecifications = get(vectorSpecificationsAtom);

    return createLoadedVectorSpecificationAndDataArray(vectorSpecifications, historicalVectorDataQueries);
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

export const colorByParameterAtom = atom<boolean>((get) => {
    const colorRealizationsByParameter = get(interfaceColorByParameterAtom);
    const visualizationMode = get(visualizationModeAtom);
    const parameterIdent = get(parameterIdentAtom);
    const selectedEnsembles = get(selectedEnsemblesAtom);

    return (
        colorRealizationsByParameter &&
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS &&
        parameterIdent !== null &&
        selectedEnsembles.some((ensemble) => ensemble.getParameters().hasParameter(parameterIdent))
    );
});
