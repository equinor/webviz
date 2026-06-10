import React from "react";

import { isEqual } from "lodash";

import { RealizationPicker } from "@framework/components/RealizationPicker";
import type { RealizationNumberLimits } from "@framework/components/RealizationPicker/_utils";
import { PickedRealizationCounter } from "@framework/components/RealizationPicker/pickedRealizationCounter";
import type { RealizationNumberSelection } from "@framework/types/realizationFilterTypes";
import { IncludeExcludeFilter } from "@framework/types/realizationFilterTypes";
import { missingNumbers } from "@framework/utils/numberUtils";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { RadioCompositions } from "@lib/newComponents/Radio/compositions";

import {
    makeRealizationNumberSelectionsFromRealizationPickerTags,
    makeRealizationPickerTagsFromRealizationNumberSelections,
} from "../private-utils/realizationPickerUtils";

export interface ByRealizationNumberFilterSelection {
    realizationNumberSelections: RealizationNumberSelection[] | null;
    includeOrExcludeFilter: IncludeExcludeFilter;
}

export type ByRealizationNumberFilterProps = {
    disabled: boolean;
    initialRealizationNumberSelections?: readonly RealizationNumberSelection[] | null;
    realizationNumberSelections: readonly RealizationNumberSelection[] | null;
    availableRealizationNumbers: readonly number[];
    selectedIncludeOrExcludeFilter: IncludeExcludeFilter;
    onFilterChange: (selection: ByRealizationNumberFilterSelection) => void;
};

export const ByRealizationNumberFilter: React.FC<ByRealizationNumberFilterProps> = (props) => {
    const { onFilterChange } = props;

    const [prevInitialRealizationNumberSelections, setPrevInitialRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(props.initialRealizationNumberSelections ?? null);
    const [prevRealizationNumberSelections, setPrevRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(props.realizationNumberSelections);

    const [initialRangeTags, setInitialRangeTags] = React.useState<string[]>(
        props.initialRealizationNumberSelections
            ? makeRealizationPickerTagsFromRealizationNumberSelections(props.initialRealizationNumberSelections)
            : [],
    );
    const [selectedRangeTags, setSelectedRangeTags] = React.useState<string[]>(
        props.realizationNumberSelections
            ? makeRealizationPickerTagsFromRealizationNumberSelections(props.realizationNumberSelections)
            : [],
    );

    const realizationNumberLimits = React.useMemo<RealizationNumberLimits>(() => {
        const validRealizations = props.availableRealizationNumbers ?? [];
        return {
            min: Math.min(...validRealizations),
            max: Math.max(...validRealizations),
            invalid: missingNumbers(validRealizations),
        };
    }, [props.availableRealizationNumbers]);

    if (!isEqual(props.initialRealizationNumberSelections, prevInitialRealizationNumberSelections)) {
        if (!props.initialRealizationNumberSelections) {
            setInitialRangeTags([]);
            setPrevInitialRealizationNumberSelections(null);
        } else {
            setInitialRangeTags(
                makeRealizationPickerTagsFromRealizationNumberSelections(props.initialRealizationNumberSelections),
            );
            setPrevInitialRealizationNumberSelections(props.initialRealizationNumberSelections);
        }
    }

    if (!isEqual(props.realizationNumberSelections, prevRealizationNumberSelections)) {
        if (!props.realizationNumberSelections) {
            setSelectedRangeTags([]);
        } else {
            setSelectedRangeTags(
                makeRealizationPickerTagsFromRealizationNumberSelections(props.realizationNumberSelections),
            );
        }
        setPrevRealizationNumberSelections(props.realizationNumberSelections);
    }

    const handleIncludeExcludeFilterChange = React.useCallback(
        function handleIncludeExcludeFilterChange(newFilter: IncludeExcludeFilter) {
            // Make selections from tags to ensure consistency with user interface
            const newRealizationNumberSelections =
                selectedRangeTags.length === 0
                    ? null
                    : makeRealizationNumberSelectionsFromRealizationPickerTags(selectedRangeTags);

            onFilterChange({
                realizationNumberSelections: newRealizationNumberSelections,
                includeOrExcludeFilter: newFilter,
            });
        },
        [onFilterChange, selectedRangeTags],
    );

    const handleRealizationPickChange = React.useCallback(
        function handleRealizationPickChange(newRangeTags: readonly string[]) {
            const newRealizationNumberSelections =
                newRangeTags.length === 0
                    ? null
                    : makeRealizationNumberSelectionsFromRealizationPickerTags(newRangeTags);

            onFilterChange({
                realizationNumberSelections: newRealizationNumberSelections,
                includeOrExcludeFilter: props.selectedIncludeOrExcludeFilter,
            });
        },
        [onFilterChange, props.selectedIncludeOrExcludeFilter],
    );

    return (
        <div className="gap-y-2xs flex flex-col">
            <FieldCompositions.Default label="Filtering Option">
                <RadioCompositions.GroupWithLabels
                    value={props.selectedIncludeOrExcludeFilter}
                    options={[
                        {
                            value: IncludeExcludeFilter.INCLUDE_FILTER,
                            label: "Include",
                        },
                        {
                            value: IncludeExcludeFilter.EXCLUDE_FILTER,
                            label: "Exclude",
                        },
                    ]}
                    onValueChange={(value) => handleIncludeExcludeFilterChange(value)}
                    disabled={props.disabled}
                    layout="horizontal"
                    size="small"
                />
            </FieldCompositions.Default>
            <FieldCompositions.Default label="Pick Realization Numbers">
                <div className="w-full">
                    <RealizationPicker
                        initialRangeValues={initialRangeTags}
                        rangeValues={selectedRangeTags}
                        realizationNumberLimits={realizationNumberLimits}
                        debounceTimeMs={500}
                        onChange={handleRealizationPickChange}
                        disabled={props.disabled}
                    />
                    <PickedRealizationCounter
                        rangeValues={selectedRangeTags}
                        realizationNumberLimits={realizationNumberLimits}
                    />
                </div>
            </FieldCompositions.Default>
        </div>
    );
};
