import React from "react";

import { RealizationPicker, RealizationPickerSelection } from "@framework/components/RealizationPicker";
import { IncludeExcludeFilter, RealizationNumberSelection } from "@framework/types/realizationFilterTypes";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";

import { isEqual } from "lodash";

import {
    makeRealizationNumberSelectionsFromRealizationPickerTags,
    makeRealizationPickerTagsFromRealizationNumberSelections,
} from "../private-utils/conversionUtils";

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
    const [prevInitialRealizationNumberSelections, setPrevInitialRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(props.initialRealizationNumberSelections ?? null);
    const [prevRealizationNumberSelections, setPrevRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(props.realizationNumberSelections);

    const [initialRangeTags, setInitialRangeTags] = React.useState<string[]>(
        props.initialRealizationNumberSelections
            ? makeRealizationPickerTagsFromRealizationNumberSelections(props.initialRealizationNumberSelections)
            : []
    );
    const [selectedRangeTags, setSelectedRangeTags] = React.useState<string[]>(
        props.realizationNumberSelections
            ? makeRealizationPickerTagsFromRealizationNumberSelections(props.realizationNumberSelections)
            : []
    );

    if (!isEqual(props.initialRealizationNumberSelections, prevInitialRealizationNumberSelections)) {
        if (!props.initialRealizationNumberSelections) {
            setInitialRangeTags([]);
            setPrevInitialRealizationNumberSelections(null);
        } else {
            setInitialRangeTags(
                makeRealizationPickerTagsFromRealizationNumberSelections(props.initialRealizationNumberSelections)
            );
            setPrevInitialRealizationNumberSelections(props.initialRealizationNumberSelections);
        }
    }

    if (!isEqual(props.realizationNumberSelections, prevRealizationNumberSelections)) {
        if (!props.realizationNumberSelections) {
            setSelectedRangeTags([]);
        } else {
            setSelectedRangeTags(
                makeRealizationPickerTagsFromRealizationNumberSelections(props.realizationNumberSelections)
            );
        }
        setPrevRealizationNumberSelections(props.realizationNumberSelections);
    }

    function handleIncludeExcludeFilterChange(newFilter: IncludeExcludeFilter) {
        // Make selections from tags to ensure consistency with user interface
        const newRealizationNumberSelections =
            selectedRangeTags.length === 0
                ? null
                : makeRealizationNumberSelectionsFromRealizationPickerTags(selectedRangeTags);

        props.onFilterChange({
            realizationNumberSelections: newRealizationNumberSelections,
            includeOrExcludeFilter: newFilter,
        });
    }

    function handleRealizationPickChange(newSelection: RealizationPickerSelection) {
        const newRealizationNumberSelections =
            newSelection.selectedRangeTags.length === 0
                ? null
                : makeRealizationNumberSelectionsFromRealizationPickerTags(newSelection.selectedRangeTags);

        props.onFilterChange({
            realizationNumberSelections: newRealizationNumberSelections,
            includeOrExcludeFilter: props.selectedIncludeOrExcludeFilter,
        });
    }

    return (
        <div className="flex flex-col gap-2">
            <Label text="Filtering Option">
                <RadioGroup
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
                    onChange={(_, value) => handleIncludeExcludeFilterChange(value)}
                    disabled={props.disabled}
                />
            </Label>
            <Label text="Pick Realization Numbers">
                <RealizationPicker
                    initialRangeTags={initialRangeTags}
                    selectedRangeTags={selectedRangeTags}
                    validRealizations={props.availableRealizationNumbers}
                    debounceTimeMs={500}
                    onChange={handleRealizationPickChange}
                    disabled={props.disabled}
                />
            </Label>
        </div>
    );
};
