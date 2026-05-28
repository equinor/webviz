import React from "react";

import { isEqual } from "lodash";

import { RealizationPicker } from "@framework/components/RealizationPicker";
import type { RealizationNumberSelection } from "@framework/types/realizationFilterTypes";
import { IncludeExcludeFilter } from "@framework/types/realizationFilterTypes";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";

import {
    makeRealizationNumberSelectionsFromRealizationPickerTags,
    makeRealizationPickerTagsFromRealizationNumberSelections,
} from "../private-utils/realizationPickerUtils";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { RadioCompositions } from "@lib/newComponents/Radio";

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
        function handleRealizationPickChange(newRangeTags: string[]) {
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
        <div className="gap-vertical-2xs flex flex-col">
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
                />
            </FieldCompositions.Default>
            <FieldCompositions.Default label="Pick Realization Numbers">
                <RealizationPicker
                    initialRangeTags={initialRangeTags}
                    selectedRangeTags={selectedRangeTags}
                    validRealizations={props.availableRealizationNumbers}
                    debounceTimeMs={500}
                    onChange={handleRealizationPickChange}
                    disabled={props.disabled}
                />
            </FieldCompositions.Default>
        </div>
    );
};
