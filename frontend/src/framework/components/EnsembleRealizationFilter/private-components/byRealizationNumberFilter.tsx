import React from "react";

import { IncludeExcludeFilter, RealizationNumberSelection } from "@framework/RealizationFilter";
import { RealizationPicker, RealizationPickerSelection } from "@framework/components/RealizationPicker";
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
    >(props.realizationNumberSelections ?? null);

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
            return;
        }
        setPrevInitialRealizationNumberSelections(props.initialRealizationNumberSelections ?? null);
        setInitialRangeTags(
            makeRealizationPickerTagsFromRealizationNumberSelections(props.initialRealizationNumberSelections)
        );
    }

    if (!isEqual(props.realizationNumberSelections, prevRealizationNumberSelections)) {
        if (!props.realizationNumberSelections) {
            setSelectedRangeTags([]);
            return;
        }
        setPrevRealizationNumberSelections(props.realizationNumberSelections ?? null);
        setSelectedRangeTags(
            makeRealizationPickerTagsFromRealizationNumberSelections(props.realizationNumberSelections)
        );
    }

    function handleIncludeExcludeFilterChange(newFilter: IncludeExcludeFilter) {
        props.onFilterChange({
            realizationNumberSelections: makeRealizationNumberSelectionsFromRealizationPickerTags(selectedRangeTags),
            includeOrExcludeFilter: newFilter,
        });
    }

    function handleRealizationPickChange(newSelection: RealizationPickerSelection) {
        const realizationNumberSelections =
            newSelection.selectedRangeTags.length === 0
                ? null
                : makeRealizationNumberSelectionsFromRealizationPickerTags(newSelection.selectedRangeTags);

        props.onFilterChange({
            realizationNumberSelections: realizationNumberSelections,
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
            <Label text="Realization numbers">
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
