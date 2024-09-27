import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { GuiState, RightDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import {
    IncludeExcludeFilter,
    IncludeExcludeFilterEnumToStringMapping,
    RealizationFilter,
    RealizationFilterType,
    RealizationFilterTypeStringMapping,
    RealizationNumberSelection,
} from "@framework/RealizationFilter";
import { Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleRealizationFilter } from "@framework/components/EnsembleRealizationFilter";
import { RealizationPicker, RealizationPickerSelection } from "@framework/components/RealizationPicker";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Check, FilterAlt as FilterIcon } from "@mui/icons-material";

import { isEqual } from "lodash";

import { makeRealizationPickerTagsFromRealizationIndexSelections } from "./utils/dataTypeConversion";

import { Drawer } from "../../../Drawer";

type RealizationFilterSettingsProps = { workbench: Workbench; onClose: () => void };

export const RealizationFilterSettings: React.FC<RealizationFilterSettingsProps> = (props) => {
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.RightDrawerContent);

    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
    const [candidateEnsembleIdent, setCandidateEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [realizationIndexSelections, setRealizationIndexSelections] = React.useState<
        readonly RealizationNumberSelection[] | null
    >(null);
    const [selectedRealizationFilter, setSelectedRealizationFilter] = React.useState<RealizationFilter | null>(null);
    const [selectedRangeTags, setSelectedRangeTags] = React.useState<string[]>([]);
    const [selectedIncludeOrExcludeFiltering, setSelectedIncludeOrExcludeFiltering] =
        React.useState<IncludeExcludeFilter>(IncludeExcludeFilter.INCLUDE_FILTER);
    const [selectedFilterType, setSelectedFilterType] = React.useState<RealizationFilterType>(
        RealizationFilterType.BY_REALIZATION_NUMBER
    );

    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());
    const realizationFilterSet = props.workbench.getWorkbenchSession().getRealizationFilterSet();

    const hasUnsavedChanges = !selectedRealizationFilter
        ? false
        : !isEqual(realizationIndexSelections, selectedRealizationFilter.getRealizationNumberSelections()) ||
          selectedFilterType !== selectedRealizationFilter.getFilterType() ||
          selectedIncludeOrExcludeFiltering !== selectedRealizationFilter.getIncludeOrExcludeFilter();

    function setStatesFromEnsembleIdent(ensembleIdent: EnsembleIdent | null) {
        if (ensembleIdent === null) {
            setSelectedRealizationFilter(null);
            setRealizationIndexSelections(null);
            setSelectedRangeTags([]);
            setSelectedFilterType(RealizationFilterType.BY_REALIZATION_NUMBER);
            return;
        }

        const realizationFilter = realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent);
        const realizationIndexSelection = realizationFilter.getRealizationNumberSelections();

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

    function handleDiscardChangesClick() {
        if (!selectedRealizationFilter) return;

        const realizationIndexSelections = selectedRealizationFilter.getRealizationNumberSelections();
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
        selectedRealizationFilter.setRealizationNumberSelections(realizationIndexSelections);

        // Notify subscribers of change.
        props.workbench.getWorkbenchSession().notifyAboutEnsembleRealizationFilterChange();
    }

    function handleFilterSettingsClose() {
        props.onClose();
    }

    function handleFilterChange() {
        // Notify subscribers of change.
        props.workbench.getWorkbenchSession().notifyAboutEnsembleRealizationFilterChange();
    }

    return (
        <div className={`w-full ${drawerContent === RightDrawerContent.RealizationFilterSettings ? "h-full" : "h-0"}`}>
            <Drawer
                title="Realization Filter"
                icon={<FilterIcon />}
                visible={drawerContent === RightDrawerContent.RealizationFilterSettings}
                onClose={handleFilterSettingsClose}
            >
                <div className="flex flex-col p-2 gap-4 overflow-y-auto">
                    {/* <Label text="Active Filter Type">
                    <RadioGroup
                        value={selectedFilterType}
                        options={[
                            {
                                label: RealizationFilterTypeStringMapping[RealizationFilterType.BY_REALIZATION_NUMBER],
                                value: RealizationFilterType.BY_REALIZATION_NUMBER,
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
                            !selectedRealizationFilter ||
                            selectedFilterType !== RealizationFilterType.BY_REALIZATION_NUMBER
                        }
                    />
                </Label> */}
                    <div className="flex-grow space-y-4">
                        {ensembleSet.getEnsembleArr().map((ensemble) => {
                            return (
                                <EnsembleRealizationFilter
                                    key={ensemble.getIdent().toString()}
                                    realizationFilter={realizationFilterSet.getRealizationFilterForEnsembleIdent(
                                        ensemble.getIdent()
                                    )}
                                    active={true}
                                    onFilterChange={handleFilterChange}
                                />
                            );
                        })}
                    </div>
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
        </div>
    );
};
