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
import { Dialog } from "@lib/components/Dialog";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Check, Close, FilterAlt as FilterIcon } from "@mui/icons-material";

import { isEqual } from "lodash";

import {
    makeRealizationIndexSelectionsFromRealizationPickerTags,
    makeRealizationPickerTagsFromRealizationIndexSelections,
} from "./utils/dataTypeConversion";

type RealizationFilterSettingsProps = { workbench: Workbench; onClose: () => void };

export const RealizationFilterSettings: React.FC<RealizationFilterSettingsProps> = (props) => {
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
    const [candidateEnsembleIdent, setCandidateEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
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

    const hasUnsavedChanges = !selectedRealizationFilter
        ? false
        : !isEqual(realizationIndexSelections, selectedRealizationFilter.getRealizationIndexSelections()) ||
          selectedFilterType !== selectedRealizationFilter.getFilterType() ||
          selectedFilteringOption !== selectedRealizationFilter.getFilteringOption();

    function setStatesFromEnsembleIdent(ensembleIdent: EnsembleIdent | null) {
        if (ensembleIdent === null) {
            setSelectedRealizationFilter(null);
            setRealizationIndexSelections(null);
            setSelectedRangeTags([]);
            setSelectedFilterType(RealizationFilterType.REALIZATION_INDEX);
            return;
        }

        const realizationFilter = realizationFilterSet.getRealizationFilterByEnsembleIdent(ensembleIdent);
        const realizationIndexSelection = realizationFilter.getRealizationIndexSelections();

        setSelectedRealizationFilter(realizationFilter);
        setRealizationIndexSelections(realizationIndexSelection);
        setSelectedRangeTags(makeRealizationPickerTagsFromRealizationIndexSelections(realizationIndexSelection));
        setSelectedFilterType(realizationFilter.getFilterType());
        setSelectedFilteringOption(realizationFilter.getFilteringOption());
    }

    function handleSelectedEnsembleChange(newValue: string | undefined) {
        if (hasUnsavedChanges) {
            const ensembleIdent = newValue ? EnsembleIdent.fromString(newValue) : null;
            setCandidateEnsembleIdent(ensembleIdent);
            setDialogOpen(true);
            return;
        }

        const ensembleIdent = newValue ? EnsembleIdent.fromString(newValue) : null;
        setCandidateEnsembleIdent(ensembleIdent);
        setStatesFromEnsembleIdent(ensembleIdent);
    }

    function handleRealizationPickChange(newSelection: RealizationPickerSelection) {
        const realizationIndexSelection =
            newSelection.selectedRangeTags.length === 0
                ? null
                : makeRealizationIndexSelectionsFromRealizationPickerTags(newSelection.selectedRangeTags);

        setSelectedRangeTags(newSelection.selectedRangeTags);
        setRealizationIndexSelections(realizationIndexSelection);
    }

    function handleDiscardChangesOnClick() {
        if (!selectedRealizationFilter) return;

        const realizationIndexSelections = selectedRealizationFilter.getRealizationIndexSelections();
        setRealizationIndexSelections(realizationIndexSelections);
        setSelectedRangeTags(makeRealizationPickerTagsFromRealizationIndexSelections(realizationIndexSelections));
        setSelectedFilterType(selectedRealizationFilter.getFilterType());
        setSelectedFilteringOption(selectedRealizationFilter.getFilteringOption());
    }

    function handleApplyButtonOnClick() {
        if (!selectedRealizationFilter) return;

        // Prevent unnecessary updates and notification
        if (!hasUnsavedChanges) {
            return;
        }

        selectedRealizationFilter.setFilterType(selectedFilterType);
        selectedRealizationFilter.setFilteringOption(selectedFilteringOption);
        selectedRealizationFilter.setRealizationIndexSelections(realizationIndexSelections);

        // Notify subscribers of change.
        props.workbench.getWorkbenchSessionPrivate().notifyAboutEnsembleRealizationFilterChange();

        // Force update to reflect changes in UI, as states are not updated.
        forceUpdate();
    }

    function handleDoNotSaveOnClick() {
        setStatesFromEnsembleIdent(candidateEnsembleIdent);
        setDialogOpen(false);
    }

    function handleDoSaveOnClick() {
        // Save changes before changing ensemble
        if (selectedRealizationFilter && hasUnsavedChanges) {
            selectedRealizationFilter.setFilterType(selectedFilterType);
            selectedRealizationFilter.setFilteringOption(selectedFilteringOption);
            selectedRealizationFilter.setRealizationIndexSelections(realizationIndexSelections);

            // Notify subscribers of change.
            props.workbench.getWorkbenchSessionPrivate().notifyAboutEnsembleRealizationFilterChange();
        }

        setStatesFromEnsembleIdent(candidateEnsembleIdent);
        setDialogOpen(false);
    }

    function handleFilterPanelCollapseOrExpand() {
        props.onClose();
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
                <Button title="Close filter" className="!text-slate-800" onClick={handleFilterPanelCollapseOrExpand}>
                    <Close fontSize="small" />
                </Button>
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
                        onChange={(_, value: string | number) => setSelectedFilterType(value as RealizationFilterType)}
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
                            setSelectedFilteringOption(value as RealizationFilteringOption)
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
                        disabled={!selectedRealizationFilter || !hasUnsavedChanges}
                        startIcon={hasUnsavedChanges ? <Close fontSize="small" /> : undefined}
                        onClick={handleDiscardChangesOnClick}
                    >
                        Discard changes
                    </Button>
                    <Button
                        variant="outlined"
                        disabled={!selectedRealizationFilter || !hasUnsavedChanges}
                        startIcon={hasUnsavedChanges ? <Check fontSize="small" /> : undefined}
                        onClick={handleApplyButtonOnClick}
                    >
                        Apply
                    </Button>
                </div>
                <Dialog open={dialogOpen}>
                    <div className="flex flex-col gap-4 p-4">
                        <Label text="Realizations by parameter values">
                            <div>TO BE IMPLEMENTED</div>
                        </Label>
                    </div>
                </Dialog>
                {
                    <Dialog
                        open={dialogOpen}
                        onClose={() => setDialogOpen(false)}
                        title="Unsaved changes"
                        modal
                        actions={
                            <div className="flex gap-4">
                                <Button onClick={handleDoNotSaveOnClick} color="danger">
                                    No, don&apos;t save
                                </Button>
                                <Button onClick={handleDoSaveOnClick}>Yes, save</Button>
                            </div>
                        }
                    >
                        You have unsaved changes which will be lost. Do you want to save changes?
                    </Dialog>
                }
            </div>
        </>
    );
};
