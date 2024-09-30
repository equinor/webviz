import React from "react";

import { IncludeExcludeFilter, RealizationFilter, RealizationNumberSelection } from "@framework/RealizationFilter";
import { RealizationPicker, RealizationPickerSelection } from "@framework/components/RealizationPicker";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";

import { isEqual } from "lodash";

import {
    makeRealizationNumberSelectionsFromRealizationPickerTags,
    makeRealizationPickerTagsFromRealizationNumberSelections,
} from "../private-utils/conversionUtils";

// TODO: Consider removing usage of ByRealizationNumberFilterHandles and lift the states to the parent component
export interface ByRealizationNumberFilterHandles {
    saveChanges: () => void;
    discardChanges: () => void;
}

export type ByRealizationNumberFilterProps = {
    realizationFilter: RealizationFilter;
    disabled: boolean;
    onEditedChange: (isEdited: boolean) => void;
    onSaveReady?: (saveFunc: () => void) => void;
};

// TODO:
// - Consider to simplify component to not use the realizationFilter, but get props.realizationFilter.getRealizationNumberSelections()
//   and props.realizationFilter.getRealizationNumberSelections() as props directly instead. Provide the currently active realization values?

// Forward ref to provide saveChanges function to parent component
export const ByRealizationNumberFilter = React.forwardRef<
    ByRealizationNumberFilterHandles,
    ByRealizationNumberFilterProps
>((props: ByRealizationNumberFilterProps, ref) => {
    const initialRangeTags = React.useMemo<string[]>(
        () =>
            makeRealizationPickerTagsFromRealizationNumberSelections(
                props.realizationFilter.getRealizationNumberSelections()
            ),
        [props.realizationFilter]
    );
    const [selectedRangeTags, setSelectedRangeTags] = React.useState<string[]>(
        makeRealizationPickerTagsFromRealizationNumberSelections(
            props.realizationFilter.getRealizationNumberSelections()
        )
    );
    const [selectedIncludeOrExcludeFilter, setSelectedIncludeOrExcludeFilter] = React.useState<IncludeExcludeFilter>(
        props.realizationFilter.getIncludeOrExcludeFilter()
    );
    const [realizationNumberSelections, setRealizationNumberSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(props.realizationFilter.getRealizationNumberSelections());

    const [prevHasUnsavedChanges, setPrevHasUnsavedChanges] = React.useState(false);

    const hasUnsavedChanges =
        !isEqual(realizationNumberSelections, props.realizationFilter.getRealizationNumberSelections()) ||
        selectedIncludeOrExcludeFilter !== props.realizationFilter.getIncludeOrExcludeFilter();

    if (hasUnsavedChanges !== prevHasUnsavedChanges) {
        setPrevHasUnsavedChanges(hasUnsavedChanges);
        props.onEditedChange(hasUnsavedChanges);
    }

    function handleRealizationPickChange(newSelection: RealizationPickerSelection) {
        const realizationNumberSelection =
            newSelection.selectedRangeTags.length === 0
                ? null
                : makeRealizationNumberSelectionsFromRealizationPickerTags(newSelection.selectedRangeTags);

        setSelectedRangeTags(newSelection.selectedRangeTags);
        setRealizationNumberSelections(realizationNumberSelection);
    }

    // Provide saveChanges and discardChanges functions to parent component
    React.useImperativeHandle(ref, () => ({
        saveChanges() {
            props.realizationFilter.setRealizationNumberSelections(realizationNumberSelections);
            props.realizationFilter.setIncludeOrExcludeFilter(selectedIncludeOrExcludeFilter);
        },
        discardChanges() {
            const realizationNumberSelection = props.realizationFilter.getRealizationNumberSelections();
            setRealizationNumberSelections(realizationNumberSelection);
            setSelectedIncludeOrExcludeFilter(props.realizationFilter.getIncludeOrExcludeFilter());
            setSelectedRangeTags(makeRealizationPickerTagsFromRealizationNumberSelections(realizationNumberSelection));
        },
    }));

    return (
        <div className="flex flex-col gap-2">
            <Label text="Filtering Option">
                <RadioGroup
                    value={selectedIncludeOrExcludeFilter}
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
                    onChange={(_, value: string | number) =>
                        setSelectedIncludeOrExcludeFilter(value as IncludeExcludeFilter)
                    }
                    disabled={props.disabled}
                />
            </Label>
            <Label text="Realization numbers">
                <RealizationPicker
                    initialRangeTags={initialRangeTags} // Note: This is the initial value, not the current value
                    selectedRangeTags={selectedRangeTags}
                    validRealizations={props.realizationFilter.getAvailableEnsembleRealizations()}
                    debounceTimeMs={500}
                    onChange={handleRealizationPickChange}
                    disabled={props.disabled}
                />
            </Label>
        </div>
    );
});

export default ByRealizationNumberFilter;
ByRealizationNumberFilter.displayName = "ByRealizationNumberFilter";
