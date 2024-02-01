import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import {
    RealizationFilter,
    RealizationFilterType,
    RealizationFilterTypeStringMapping,
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

type RealizationFilterSettingsProps = { workbench: Workbench };

export const RealizationFilterSettings: React.FC<RealizationFilterSettingsProps> = (props) => {
    const [isEdited, setIsEdited] = React.useState<boolean>(false);
    const [selectedRealizationFilter, setSelectedRealizationFilter] = React.useState<RealizationFilter | null>(null);
    const [selectedRealizations, setSelectedRealizations] = React.useState<number[]>([]);
    const [selectedRangeTags, setSelectedRangeTags] = React.useState<string[]>([]);
    const [selectedFilterType, setSelectedFilterType] = React.useState<RealizationFilterType>(
        RealizationFilterType.REALIZATION_INDEX
    );

    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());
    const realizationFilterSet = props.workbench.getWorkbenchSession().getRealizationFilterSet();

    // TODO: Have a state which creates map between ensembleIdent and realizationTags?

    function handleSelectedEnsembleChange(newValue: string | undefined) {
        if (newValue === undefined) {
            setSelectedRealizationFilter(null);
            setSelectedRealizations([]);
            setSelectedRangeTags([]);
            setSelectedFilterType(RealizationFilterType.REALIZATION_INDEX);
            setIsEdited(false);
            return;
        }

        ensembleSet.findEnsemble(EnsembleIdent.fromString(newValue));
        const ensembleIdent = EnsembleIdent.fromString(newValue);
        const realizationFilter = realizationFilterSet.getRealizationFilterByEnsembleIdent(ensembleIdent);

        if (realizationFilter === null) {
            setSelectedRealizationFilter(null);
            return;
        }

        const selectedEnsembleRealizations = realizationFilter.getSelectedRealizations() ?? [];
        const selectedEnsembleRangeTags = realizationFilter.getSelectedRangeTags() ?? [];
        const filterType = realizationFilter.getFilterType() ?? RealizationFilterType.REALIZATION_INDEX;

        setSelectedRealizationFilter(realizationFilter);
        setSelectedRealizations([...(selectedEnsembleRealizations ?? [])]);
        setSelectedRangeTags([...(selectedEnsembleRangeTags ?? [])]);
        setSelectedFilterType(filterType);
        setIsEdited(false);
    }

    function handleRealizationPickChange(newSelection: RealizationPickerSelection) {
        const isEdited =
            !isEqual(newSelection.selectedRealizations, selectedRealizationFilter?.getSelectedRealizations() ?? []) ||
            !isEqual(newSelection.selectedRangeTags, selectedRealizationFilter?.getSelectedRangeTags() ?? []);
        setIsEdited(isEdited);
        setSelectedRealizations(newSelection.selectedRealizations);
        setSelectedRangeTags(newSelection.selectedRangeTags);
    }

    function handleDiscardChangesOnClick() {
        if (!selectedRealizationFilter) return;

        setSelectedRealizations([...selectedRealizationFilter.getSelectedRealizations()]);
        setSelectedRangeTags([...selectedRealizationFilter.getSelectedRangeTags()]);
        setSelectedFilterType(selectedRealizationFilter.getFilterType());
        setIsEdited(false);
    }

    function handleApplyButtonOnClick() {
        if (!selectedRealizationFilter) return;

        setIsEdited(false);

        // Prevent unnecessary updates and notification
        const isFilterSelectionsUnchanged =
            isEqual(selectedRealizations, selectedRealizationFilter.getSelectedRealizations()) &&
            isEqual(selectedRangeTags, selectedRealizationFilter.getSelectedRangeTags()) &&
            selectedFilterType === selectedRealizationFilter.getFilterType();
        if (isFilterSelectionsUnchanged) {
            return;
        }

        selectedRealizationFilter.setFilterType(selectedFilterType);
        selectedRealizationFilter.setSelectedRealizationsAndRangeTags({
            realizations: selectedRealizations,
            rangeTags: selectedRangeTags,
        });

        // Notify subscribers of change.
        props.workbench.getWorkbenchSessionPrivate().notifyAboutEnsembleRealizationFilterChange();
    }

    function handleSelectedFilterTypeChange(newFilterType: RealizationFilterType) {
        setSelectedFilterType(newFilterType);

        if (!selectedRealizationFilter) return;

        setIsEdited(newFilterType !== selectedRealizationFilter.getFilterType());
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
