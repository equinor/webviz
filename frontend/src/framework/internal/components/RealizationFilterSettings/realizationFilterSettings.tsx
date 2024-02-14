import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import {
    IncludeExcludeFilter,
    IncludeExcludeFilterEnumToStringMapping,
    RealizationFilter,
    RealizationFilterType,
    RealizationFilterTypeStringMapping,
    RealizationIndexSelection,
} from "@framework/RealizationFilter";
import { Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { RealizationPicker, RealizationPickerSelection } from "@framework/components/RealizationPicker";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Check, FilterAlt as FilterIcon } from "@mui/icons-material";

import { isEqual } from "lodash";

import {
    makeRealizationIndexSelectionsFromRealizationPickerTags,
    makeRealizationPickerTagsFromRealizationIndexSelections,
} from "./utils/dataTypeConversion";

import { Drawer } from "../Drawer";

type RealizationFilterSettingsProps = { workbench: Workbench; onClose: () => void };

export const RealizationFilterSettings: React.FC<RealizationFilterSettingsProps> = (props) => {
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
    const [candidateEnsembleIdent, setCandidateEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [realizationIndexSelections, setRealizationIndexSelections] = React.useState<
        readonly RealizationIndexSelection[] | null
    >(null);
    const [selectedRealizationFilter, setSelectedRealizationFilter] = React.useState<RealizationFilter | null>(null);
    const [selectedRangeTags, setSelectedRangeTags] = React.useState<string[]>([]);
    const [selectedIncludeOrExcludeFiltering, setSelectedIncludeOrExcludeFiltering] =
        React.useState<IncludeExcludeFilter>(IncludeExcludeFilter.INCLUDE_FILTER);
    const [selectedFilterType, setSelectedFilterType] = React.useState<RealizationFilterType>(
        RealizationFilterType.REALIZATION_INDEX
    );

    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());
    const realizationFilterSet = props.workbench.getWorkbenchSession().getRealizationFilterSet();

    const hasUnsavedChanges = !selectedRealizationFilter
        ? false
        : !isEqual(realizationIndexSelections, selectedRealizationFilter.getRealizationIndexSelections()) ||
          selectedFilterType !== selectedRealizationFilter.getFilterType() ||
          selectedIncludeOrExcludeFiltering !== selectedRealizationFilter.getIncludeOrExcludeFilter();

    function setStatesFromEnsembleIdent(ensembleIdent: EnsembleIdent | null) {
        if (ensembleIdent === null) {
            setSelectedRealizationFilter(null);
            setRealizationIndexSelections(null);
            setSelectedRangeTags([]);
            setSelectedFilterType(RealizationFilterType.REALIZATION_INDEX);
            return;
        }

        const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);
        const realizationIndexSelection = realizationFilter.getRealizationIndexSelections();

        setSelectedRealizationFilter(realizationFilter);
        setRealizationIndexSelections(realizationIndexSelection);
        setSelectedRangeTags(makeRealizationPickerTagsFromRealizationIndexSelections(realizationIndexSelection));
        setSelectedFilterType(realizationFilter.getFilterType());
        setSelectedIncludeOrExcludeFiltering(realizationFilter.getIncludeOrExcludeFilter());
    }

    function handleSelectedEnsembleChange(newValue: string | undefined) {
        const ensembleIdent = newValue ? EnsembleIdent.fromString(newValue) : null;
        setCandidateEnsembleIdent(ensembleIdent);
        if (hasUnsavedChanges) {
            setDialogOpen(true);
            return;
        }

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

    function handleDiscardChangesClick() {
        if (!selectedRealizationFilter) return;

        const realizationIndexSelections = selectedRealizationFilter.getRealizationIndexSelections();
        setRealizationIndexSelections(realizationIndexSelections);
        setSelectedRangeTags(makeRealizationPickerTagsFromRealizationIndexSelections(realizationIndexSelections));
        setSelectedFilterType(selectedRealizationFilter.getFilterType());
        setSelectedIncludeOrExcludeFiltering(selectedRealizationFilter.getIncludeOrExcludeFilter());
    }

    function handleApplyButtonClick() {
        saveSelectionsToSelectedFilterAndNotifySubscribers();

        // Force update to reflect changes in UI, as states are not updated.
        forceUpdate();
    }

    function handleDoNotSaveClick() {
        setStatesFromEnsembleIdent(candidateEnsembleIdent);
        setDialogOpen(false);
    }

    function handleDoSaveClick() {
        saveSelectionsToSelectedFilterAndNotifySubscribers();

        setStatesFromEnsembleIdent(candidateEnsembleIdent);
        setDialogOpen(false);
    }

    function saveSelectionsToSelectedFilterAndNotifySubscribers() {
        if (!selectedRealizationFilter || !hasUnsavedChanges) return;

        selectedRealizationFilter.setFilterType(selectedFilterType);
        selectedRealizationFilter.setIncludeOrExcludeFilter(selectedIncludeOrExcludeFiltering);
        selectedRealizationFilter.setRealizationIndexSelections(realizationIndexSelections);

        // Notify subscribers of change.
        props.workbench.getWorkbenchSession().notifyAboutEnsembleRealizationFilterChange();
    }

    function handleFilterSettingsClose() {
        props.onClose();
    }

    return (
        <Drawer title="Realization Filter" icon={<FilterIcon />} visible={true} onClose={handleFilterSettingsClose}>
            <div className="flex flex-col p-2 gap-4 overflow-y-auto">
                <Label text="Ensemble">
                    <Dropdown
                        value={selectedRealizationFilter?.getAssignedEnsembleIdent().toString() ?? undefined}
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
                        ]}
                        onChange={(_, value: string | number) => setSelectedFilterType(value as RealizationFilterType)}
                    />
                </Label>
                <Label text="Filtering Option">
                    <RadioGroup
                        value={selectedIncludeOrExcludeFiltering}
                        options={[
                            {
                                label: IncludeExcludeFilterEnumToStringMapping[IncludeExcludeFilter.INCLUDE_FILTER],
                                value: IncludeExcludeFilter.INCLUDE_FILTER,
                            },
                            {
                                label: IncludeExcludeFilterEnumToStringMapping[IncludeExcludeFilter.EXCLUDE_FILTER],
                                value: IncludeExcludeFilter.EXCLUDE_FILTER,
                            },
                        ]}
                        onChange={(_, value: string | number) =>
                            setSelectedIncludeOrExcludeFiltering(value as IncludeExcludeFilter)
                        }
                    ></RadioGroup>
                </Label>
                <Label text="Realizations by index">
                    <RealizationPicker
                        selectedRangeTags={selectedRangeTags}
                        validRealizations={
                            selectedRealizationFilter
                                ? ensembleSet
                                      .findEnsemble(selectedRealizationFilter.getAssignedEnsembleIdent())
                                      ?.getRealizations()
                                : []
                        }
                        debounceTimeMs={500}
                        onChange={handleRealizationPickChange}
                        disabled={
                            !selectedRealizationFilter || selectedFilterType !== RealizationFilterType.REALIZATION_INDEX
                        }
                    />
                </Label>
                <div className="flex gap-4">
                    <Button
                        color="danger"
                        variant="contained"
                        disabled={!selectedRealizationFilter || !hasUnsavedChanges}
                        onClick={handleDiscardChangesClick}
                    >
                        Discard changes
                    </Button>
                    <Button
                        variant="contained"
                        disabled={!selectedRealizationFilter || !hasUnsavedChanges}
                        startIcon={<Check fontSize="small" />}
                        onClick={handleApplyButtonClick}
                    >
                        Apply
                    </Button>
                </div>
                {
                    <Dialog
                        open={dialogOpen}
                        onClose={() => setDialogOpen(false)}
                        title="Unsaved changes"
                        modal
                        actions={
                            <div className="flex gap-4">
                                <Button onClick={handleDoNotSaveClick} color="danger">
                                    No, don&apos;t save
                                </Button>
                                <Button onClick={handleDoSaveClick}>Yes, save</Button>
                            </div>
                        }
                    >
                        You have unsaved changes which will be lost. Do you want to save changes?
                    </Dialog>
                }
            </div>
        </Drawer>
    );
};
