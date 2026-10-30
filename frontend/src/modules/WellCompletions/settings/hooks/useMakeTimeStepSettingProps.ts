import React from "react";

import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import {
    selectedCompletionDateIndexAtom,
    selectedCompletionDateIndexRangeAtom,
} from "../atoms/persistableFixableAtoms";

type TimeStepSelectionState<TValue> = {
    value: TValue;
    isLoading: boolean;
    depsHaveError: boolean;
};

type UseMakeTimeStepSettingPropsParams = {
    isSingleTimeStepMode: boolean;
    sortedCompletionDates: string[] | null | undefined;
    selectedCompletionDateIndex: TimeStepSelectionState<number | null>;
    selectedCompletionDateIndexRange: TimeStepSelectionState<[number, number] | null>;
};

export function useMakeTimeStepSliderSettingProps(params: UseMakeTimeStepSettingPropsParams): {
    sliderValue: number | [number, number] | undefined;
    settingWrapper: {
        label: string;
        annotations: any;
        loadingOverlay: boolean;
        errorOverlay: string | undefined;
    };
} {
    const {
        isSingleTimeStepMode,
        sortedCompletionDates,
        selectedCompletionDateIndex,
        selectedCompletionDateIndexRange,
    } = params;

    const selectedCompletionDateIndexAnnotations = useMakePersistableFixableAtomAnnotations(
        selectedCompletionDateIndexAtom,
    );
    const selectedCompletionDateIndexRangeAnnotations = useMakePersistableFixableAtomAnnotations(
        selectedCompletionDateIndexRangeAtom,
    );

    return React.useMemo(() => {
        let label = isSingleTimeStepMode ? "Time Step" : "Time Steps";
        // A retained index can be out of range - the field's annotations flag it, the label just leaves the date out
        if (sortedCompletionDates) {
            if (isSingleTimeStepMode && selectedCompletionDateIndex.value !== null) {
                const date = sortedCompletionDates[selectedCompletionDateIndex.value];
                if (date !== undefined) {
                    label = `Time Step: (${date})`;
                }
            }

            if (!isSingleTimeStepMode && selectedCompletionDateIndexRange.value !== null) {
                const startDate = sortedCompletionDates[selectedCompletionDateIndexRange.value[0]];
                const endDate = sortedCompletionDates[selectedCompletionDateIndexRange.value[1]];
                if (startDate !== undefined && endDate !== undefined) {
                    label = `Time Steps: (${startDate}, ${endDate})`;
                }
            }
        }

        return {
            sliderValue: isSingleTimeStepMode
                ? (selectedCompletionDateIndex.value ?? undefined)
                : (selectedCompletionDateIndexRange.value ?? undefined),
            settingWrapper: {
                label,
                annotations: isSingleTimeStepMode
                    ? selectedCompletionDateIndexAnnotations
                    : selectedCompletionDateIndexRangeAnnotations,
                loadingOverlay: isSingleTimeStepMode
                    ? selectedCompletionDateIndex.isLoading
                    : selectedCompletionDateIndexRange.isLoading,
                errorOverlay: (
                    isSingleTimeStepMode
                        ? selectedCompletionDateIndex.depsHaveError
                        : selectedCompletionDateIndexRange.depsHaveError
                )
                    ? "Error loading time steps"
                    : undefined,
            },
        };
    }, [
        isSingleTimeStepMode,
        sortedCompletionDates,
        selectedCompletionDateIndex.value,
        selectedCompletionDateIndex.isLoading,
        selectedCompletionDateIndex.depsHaveError,
        selectedCompletionDateIndexRange.value,
        selectedCompletionDateIndexRange.isLoading,
        selectedCompletionDateIndexRange.depsHaveError,
        selectedCompletionDateIndexAnnotations,
        selectedCompletionDateIndexRangeAnnotations,
    ]);
}
