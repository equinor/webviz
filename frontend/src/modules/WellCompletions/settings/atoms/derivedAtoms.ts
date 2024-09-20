import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom, ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { DataLoadingStatus, TimeAggregationSelection } from "@modules/WellCompletions/typesAndEnums";
import { WellCompletionsDataAccessorNEW } from "@modules/WellCompletions/utils/wellCompletionsDataAccessorNEW";
import { PlotData } from "@webviz/well-completions-plot";

import { atom } from "jotai";

import {
    selectedStratigraphyColorSetAtom,
    syncedEnsembleIdentsAtom,
    userSearchWellTextAtom,
    userSelectedCompletionDateIndexAtom,
    userSelectedCompletionDateIndexRangeAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedHideZeroCompletionsAtom,
    userSelectedRealizationNumberAtom,
    userSelectedSortWellsByAtom,
    userSelectedTimeAggregationAtom,
} from "./baseAtoms";
import { wellCompletionsQueryAtom } from "./queryAtoms";

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>((get) => {
    const syncedEnsembleIdents = get(syncedEnsembleIdentsAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);
    const ensembleSet = get(EnsembleSetAtom);

    if (syncedEnsembleIdents && syncedEnsembleIdents.length > 0) {
        return syncedEnsembleIdents[0];
    }
    if (userSelectedEnsembleIdent === null || !ensembleSet.hasEnsemble(userSelectedEnsembleIdent)) {
        return ensembleSet.getEnsembleArr()[0]?.getIdent() || null;
    }
    return userSelectedEnsembleIdent;
});

export const selectedRealizationNumberAtom = atom<number | null>((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);
    const userSelectedRealizationNumber = get(userSelectedRealizationNumberAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const validRealizationNumbers = selectedEnsembleIdent
        ? [...validEnsembleRealizationsFunction(selectedEnsembleIdent)]
        : [];

    if (validRealizationNumbers.length === 0) {
        return null;
    }

    if (userSelectedRealizationNumber === null || !validRealizationNumbers.includes(userSelectedRealizationNumber)) {
        return validRealizationNumbers[0];
    }

    return userSelectedRealizationNumber;
});

export const dataLoadingStatusAtom = atom<DataLoadingStatus>((get) => {
    const wellCompletionsQuery = get(wellCompletionsQueryAtom);
    if (wellCompletionsQuery.isFetching) {
        return DataLoadingStatus.LOADING;
    } else if (wellCompletionsQuery.isError) {
        return DataLoadingStatus.ERROR;
    }
    return DataLoadingStatus.IDLE;
});

export const wellCompletionsDataAccessorAtom = atom<WellCompletionsDataAccessorNEW | null>((get) => {
    const wellCompletionsQuery = get(wellCompletionsQueryAtom);
    const selectedStratigraphyColorSet = get(selectedStratigraphyColorSetAtom);

    // NOTE: Old code did not create new instance of WellCompletionsDataAccessorNEW when loading data, only clearing content
    // When new data was retrieved, the instance parsed new data. This is not the case here.
    if (!wellCompletionsQuery.data || !selectedStratigraphyColorSet) {
        return null;
    }

    return new WellCompletionsDataAccessorNEW(wellCompletionsQuery.data, selectedStratigraphyColorSet);
});

export const sortedCompletionDatesAtom = atom<string[] | null>((get) => {
    const wellCompletionsDataAccessor = get(wellCompletionsDataAccessorAtom);
    if (!wellCompletionsDataAccessor) {
        return null;
    }
    return wellCompletionsDataAccessor.getSortedCompletionDates();
});

export const selectedCompletionDateIndexAtom = atom<number | null>((get) => {
    const userSelectedCompletionDateIndex = get(userSelectedCompletionDateIndexAtom);
    const userSelectedCompletionDateIndexRange = get(userSelectedCompletionDateIndexRangeAtom);
    const userSelectedTimeAggregation = get(userSelectedTimeAggregationAtom);
    const sortedCompletionDates = get(sortedCompletionDatesAtom);

    if (!sortedCompletionDates) {
        return null;
    }

    if (userSelectedTimeAggregation === TimeAggregationSelection.NONE) {
        if (userSelectedCompletionDateIndex >= sortedCompletionDates.length) {
            return sortedCompletionDates.length - 1;
        }
        return userSelectedCompletionDateIndex;
    }

    // Update index to match first index in range
    const firstRangeIndex = userSelectedCompletionDateIndexRange[0];
    const newTimeStepIndex = firstRangeIndex < sortedCompletionDates.length ? firstRangeIndex : 0;
    return newTimeStepIndex;
});

export const selectedCompletionDateIndexRangeAtom = atom<[number, number] | null>((get) => {
    const userSelectedCompletionDateIndexRange = get(userSelectedCompletionDateIndexRangeAtom);
    const userSelectedTimeAggregation = get(userSelectedTimeAggregationAtom);
    const sortedCompletionDates = get(sortedCompletionDatesAtom);

    if (!sortedCompletionDates) {
        return null;
    }

    if (userSelectedTimeAggregation === TimeAggregationSelection.NONE) {
        return [0, sortedCompletionDates.length - 1];
    }

    let startIndex = userSelectedCompletionDateIndexRange[0];
    let endIndex = userSelectedCompletionDateIndexRange[1];
    if (startIndex >= sortedCompletionDates.length) {
        startIndex = sortedCompletionDates.length - 1;
    }
    if (endIndex >= sortedCompletionDates.length) {
        endIndex = sortedCompletionDates.length - 1;
    }
    return [startIndex, endIndex];
});

export const plotDataAtom = atom<PlotData | null>((get) => {
    const wellCompletionsDataAccessor = get(wellCompletionsDataAccessorAtom);

    const userSearchWellText = get(userSearchWellTextAtom);
    const userSelectedHideZeroCompletions = get(userSelectedHideZeroCompletionsAtom);
    const userSelectedTimeAggregation = get(userSelectedTimeAggregationAtom);
    const userSelectedSortWellsBy = get(userSelectedSortWellsByAtom);

    const selectedCompletionDateIndex = get(selectedCompletionDateIndexAtom);
    const selectedCompletionDateIndexRange = get(selectedCompletionDateIndexRangeAtom);

    if (!wellCompletionsDataAccessor) {
        return null;
    }

    const completionDateIndexSelection =
        userSelectedTimeAggregation === TimeAggregationSelection.NONE
            ? selectedCompletionDateIndex
            : selectedCompletionDateIndexRange;
    if (completionDateIndexSelection === null) {
        return null;
    }

    wellCompletionsDataAccessor.setSearchWellText(userSearchWellText);
    wellCompletionsDataAccessor.setHideZeroCompletions(userSelectedHideZeroCompletions);

    return wellCompletionsDataAccessor.createPlotData(
        completionDateIndexSelection,
        userSelectedTimeAggregation,
        userSelectedSortWellsBy
    );
});
