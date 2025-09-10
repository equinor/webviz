import type { PlotData } from "@webviz/well-completions-plot";
import { atom } from "jotai";

import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { DataLoadingStatus, TimeAggregationMode } from "@modules/WellCompletions/typesAndEnums";
import { WellCompletionsDataAccessor } from "@modules/WellCompletions/utils/wellCompletionsDataAccessor";

import {
    selectedStratigraphyColorSetAtom,
    wellExclusionTextAtom,
    wellSearchTextAtom,
    isZeroCompletionsHiddenAtom,
    sortWellsByAtom,
    wellSortDirectionAtom,
    timeAggregationModeAtom,
} from "./baseAtoms";
import {
    selectedCompletionDateIndexAtom,
    selectedCompletionDateIndexRangeAtom,
    selectedEnsembleIdentAtom,
} from "./persistableFixableAtoms";
import { wellCompletionsQueryAtom } from "./queryAtoms";

export const availableRealizationsAtom = atom<number[]>((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const validRealizationNumbers = selectedEnsembleIdent
        ? [...validEnsembleRealizationsFunction(selectedEnsembleIdent)]
        : [];
    return validRealizationNumbers;
});

export const isQueryFetchingAtom = atom<boolean>((get) => {
    const wellCompletionsQuery = get(wellCompletionsQueryAtom);

    return wellCompletionsQuery.isFetching;
});

export const isQueryErrorAtom = atom<boolean>((get) => {
    const wellCompletionsQuery = get(wellCompletionsQueryAtom);

    return wellCompletionsQuery.isError;
});

export const dataLoadingStatusAtom = atom<DataLoadingStatus>((get) => {
    const isQueryFetching = get(isQueryFetchingAtom);
    const isQueryError = get(isQueryErrorAtom);

    if (isQueryFetching) {
        return DataLoadingStatus.LOADING;
    } else if (isQueryError) {
        return DataLoadingStatus.ERROR;
    }
    return DataLoadingStatus.IDLE;
});

export const wellCompletionsDataAccessorAtom = atom<WellCompletionsDataAccessor | null>((get) => {
    const wellCompletionsQuery = get(wellCompletionsQueryAtom);
    const selectedStratigraphyColorSet = get(selectedStratigraphyColorSetAtom);

    if (!wellCompletionsQuery.data || !selectedStratigraphyColorSet) {
        return null;
    }

    return new WellCompletionsDataAccessor(wellCompletionsQuery.data, selectedStratigraphyColorSet);
});

export const sortedCompletionDatesAtom = atom<string[] | null>((get) => {
    const wellCompletionsDataAccessor = get(wellCompletionsDataAccessorAtom);
    if (!wellCompletionsDataAccessor) {
        return null;
    }
    return wellCompletionsDataAccessor.getSortedCompletionDates();
});

export const plotDataAtom = atom<PlotData | null>((get) => {
    const wellCompletionsDataAccessor = get(wellCompletionsDataAccessorAtom);

    const wellExclusionText = get(wellExclusionTextAtom);
    const wellSearchText = get(wellSearchTextAtom);
    const isZeroCompletionsHidden = get(isZeroCompletionsHiddenAtom);
    const timeAggregationMode = get(timeAggregationModeAtom);
    const sortWellsBy = get(sortWellsByAtom);
    const wellSortDirection = get(wellSortDirectionAtom);

    const selectedCompletionDateIndex = get(selectedCompletionDateIndexAtom).value;
    const selectedCompletionDateIndexRange = get(selectedCompletionDateIndexRangeAtom).value;

    if (!wellCompletionsDataAccessor) {
        return null;
    }

    const completionDateIndexSelection =
        timeAggregationMode === TimeAggregationMode.NONE
            ? selectedCompletionDateIndex
            : selectedCompletionDateIndexRange;
    if (completionDateIndexSelection === null) {
        return null;
    }

    wellCompletionsDataAccessor.setWellExclusionText(wellExclusionText);
    wellCompletionsDataAccessor.setWellSearchText(wellSearchText);
    wellCompletionsDataAccessor.setHideZeroCompletions(isZeroCompletionsHidden);
    wellCompletionsDataAccessor.setSortWellsBy(sortWellsBy);
    wellCompletionsDataAccessor.setSortDirection(wellSortDirection);

    return wellCompletionsDataAccessor.createPlotData(completionDateIndexSelection, timeAggregationMode);
});
