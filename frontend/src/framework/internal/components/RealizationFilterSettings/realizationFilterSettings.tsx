import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import {
    RealizationFilter,
    RealizationFilterType,
    RealizationFilterTypeStringMapping,
    RealizationFilteringOption,
    RealizationFilteringOptionStringMapping,
    RealizationIndexSelectionType,
} from "@framework/RealizationFilter";
import { Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { RealizationPicker, RealizationPickerSelection } from "@framework/components/RealizationPicker";
import { Button } from "@lib/components/Button";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Check, Close, FilterAlt as FilterIcon } from "@mui/icons-material";

import { isEqual } from "lodash";

import {
    makeRealizationIndexSelectionsFromRealizationPickerTags,
    makeRealizationPickerTagsFromRealizationIndexSelections,
} from "./utils/dataTypeConversion";

type RealizationFilterSettingsProps = { workbench: Workbench };

export const RealizationFilterSettings: React.FC<RealizationFilterSettingsProps> = (props) => {
    const [isEdited, setIsEdited] = React.useState<boolean>(false);
    const [realizationIndexSelections, setRealizationIndexSelections] = React.useState<
        readonly RealizationIndexSelectionType[] | null
    >(null);
    const [selectedRealizationFilter, setSelectedRealizationFilter] = React.useState<RealizationFilter | null>(null);
    const [selectedRangeTags, setSelectedRangeTags] = React.useState<string[]>([]);
    const [selectedFilteringOption, setSelectedFilteringOption] = React.useState<RealizationFilteringOption>(
        RealizationFilteringOption.INCLUDE
    );
    const [selectedFilterType, setSelectedFilterType] = React.useState<RealizationFilterType>(
        RealizationFilterType.REALIZATION_INDEX
    );

    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());
    const realizationFilterSet = props.workbench.getWorkbenchSession().getRealizationFilterSet();

    function handleSelectedEnsembleChange(newValue: string | undefined) {
        if (newValue === undefined) {
            setSelectedRealizationFilter(null);
            setSelectedRangeTags([]);
            setSelectedFilterType(RealizationFilterType.REALIZATION_INDEX);
            setIsEdited(false);
            return;
        }

        const ensembleIdent = EnsembleIdent.fromString(newValue);
        const realizationFilter = realizationFilterSet.getRealizationFilterByEnsembleIdent(ensembleIdent);

        if (realizationFilter === null) {
            setSelectedRealizationFilter(null);
            return;
        }

        const realizationIndexSelection = realizationFilter.getRealizationIndexSelections();

        setSelectedRealizationFilter(realizationFilter);
        setRealizationIndexSelections(realizationIndexSelection);
        setSelectedRangeTags(makeRealizationPickerTagsFromRealizationIndexSelections(realizationIndexSelection));
        setSelectedFilterType(realizationFilter.getFilterType());
        setSelectedFilteringOption(realizationFilter.getFilteringOption());
        setIsEdited(false);
    }

    function handleRealizationPickChange(newSelection: RealizationPickerSelection) {
        const realizationIndexSelection =
            newSelection.selectedRangeTags.length === 0
                ? null
                : makeRealizationIndexSelectionsFromRealizationPickerTags(newSelection.selectedRangeTags);

        const isEdited = !isEqual(
            realizationIndexSelection,
            selectedRealizationFilter?.getRealizationIndexSelections()
        );

        setIsEdited(isEdited);
        setSelectedRangeTags(newSelection.selectedRangeTags);
        setRealizationIndexSelections(realizationIndexSelection);
    }

    function handleDiscardChangesOnClick() {
        if (!selectedRealizationFilter) return;

        const realizationIndexSelections = selectedRealizationFilter.getRealizationIndexSelections();
        setRealizationIndexSelections(realizationIndexSelections);
        setSelectedRangeTags(makeRealizationPickerTagsFromRealizationIndexSelections(realizationIndexSelections));
        setSelectedFilterType(selectedRealizationFilter.getFilterType());
        setIsEdited(false);
    }

    function handleApplyButtonOnClick() {
        if (!selectedRealizationFilter) return;

        setIsEdited(false);

        // Prevent unnecessary updates and notification
        const isFilterSelectionsUnchanged =
            isEqual(realizationIndexSelections, selectedRealizationFilter.getRealizationIndexSelections()) &&
            selectedFilterType === selectedRealizationFilter.getFilterType() &&
            selectedFilteringOption === selectedRealizationFilter.getFilteringOption();
        if (isFilterSelectionsUnchanged) {
            return;
        }

        selectedRealizationFilter.setFilterType(selectedFilterType);
        selectedRealizationFilter.setFilteringOption(selectedFilteringOption);
        selectedRealizationFilter.setRealizationIndexSelections(realizationIndexSelections);

        // Notify subscribers of change.
        props.workbench.getWorkbenchSessionPrivate().notifyAboutEnsembleRealizationFilterChange();
    }

    function handleSelectedFilterTypeChange(newFilterType: RealizationFilterType) {
        setSelectedFilterType(newFilterType);

        if (!selectedRealizationFilter) return;

        setIsEdited(newFilterType !== selectedRealizationFilter.getFilterType());
    }

    function handleSelectedFilteringOptionChange(value: RealizationFilteringOption) {
        setSelectedFilteringOption(value);

        if (!selectedRealizationFilter) return;

        setIsEdited(value !== selectedRealizationFilter.getFilteringOption());
    }

    return (
        <>
            <div className="flex justify-center items-center bg-slate-100 h-10">
                <FilterIcon />
                {""}
                <span
                    title={"Realization Filter"}
                    className="font-bold flex-grow p-0 text-ellipsis whitespace-nowrap overflow-hidden text-sm"
                >
                    {"Realization Filter"}
                </span>
            </div>
            <div className="flex flex-col p-2 gap-4 overflow-y-auto">
                <Label text="Ensemble">
                    <Dropdown
                        value={selectedRealizationFilter?.getParentEnsembleIdent().toString() ?? undefined}
                        options={ensembleSet.getEnsembleArr().map((elm) => {
                            return { value: elm.getIdent().toString(), label: elm.getDisplayName() };
                        })}
                        onChange={handleSelectedEnsembleChange}
                    />
                </Label>
                <Label text="Active Filter Type">
                    <RadioGroup
                        value={selectedFilterType}
                        options={[
                            {
                                label: RealizationFilterTypeStringMapping[RealizationFilterType.REALIZATION_INDEX],
                                value: RealizationFilterType.REALIZATION_INDEX,
                            },
                            {
                                label: RealizationFilterTypeStringMapping[RealizationFilterType.PARAMETER_VALUES],
                                value: RealizationFilterType.PARAMETER_VALUES,
                            },
                        ]}
                        onChange={(_, value: string | number) =>
                            handleSelectedFilterTypeChange(value as RealizationFilterType)
                        }
                    />
                </Label>
                <Label text="Filter Option">
                    <RadioGroup
                        value={selectedFilteringOption}
                        options={[
                            {
                                label: RealizationFilteringOptionStringMapping[RealizationFilteringOption.INCLUDE],
                                value: RealizationFilteringOption.INCLUDE,
                            },
                            {
                                label: RealizationFilteringOptionStringMapping[RealizationFilteringOption.EXCLUDE],
                                value: RealizationFilteringOption.EXCLUDE,
                            },
                        ]}
                        onChange={(_, value: string | number) =>
                            handleSelectedFilteringOptionChange(value as RealizationFilteringOption)
                        }
                    ></RadioGroup>
                </Label>
                <Label text="Realizations by index">
                    <div>
                        <RealizationPicker
                            selectedRangeTags={selectedRangeTags}
                            validRealizations={
                                selectedRealizationFilter
                                    ? ensembleSet
                                          .findEnsemble(selectedRealizationFilter.getParentEnsembleIdent())
                                          ?.getRealizations()
                                    : []
                            }
                            debounceTimeMs={500}
                            onChange={handleRealizationPickChange}
                            disabled={
                                !selectedRealizationFilter ||
                                selectedFilterType !== RealizationFilterType.REALIZATION_INDEX
                            }
                        />
                    </div>
                </Label>
                <div className="flex gap-4">
                    <Button
                        color="danger"
                        variant="outlined"
                        disabled={!selectedRealizationFilter || !isEdited}
                        startIcon={isEdited ? <Close fontSize="small" /> : undefined}
                        onClick={handleDiscardChangesOnClick}
                    >
                        Discard changes
                    </Button>
                    <Button
                        variant="outlined"
                        disabled={!selectedRealizationFilter || !isEdited}
                        startIcon={isEdited ? <Check fontSize="small" /> : undefined}
                        onClick={handleApplyButtonOnClick}
                    >
                        Apply
                    </Button>
                </div>
            </div>
        </>
    );
};
