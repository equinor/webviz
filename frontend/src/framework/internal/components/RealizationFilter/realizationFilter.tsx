import React from "react";

import { Ensemble } from "@framework/Ensemble";
import {
    RealizationContinuousParameterValueFilter,
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

type RealizationFilterProps = { workbench: Workbench };

export const RealizationFilter: React.FC<RealizationFilterProps> = (props) => {
    const [selectedEnsemble, setSelectedEnsemble] = React.useState<Ensemble | null>(null);
    const [selectedRealizations, setSelectedRealizations] = React.useState<number[]>([]);
    const [selectedRangeTags, setSelectedRangeTags] = React.useState<string[]>([]);
    const [selectedParameterValueFilters, setSelectedParameterValueFilters] = React.useState<
        RealizationContinuousParameterValueFilter[]
    >([]);
    const [selectedFilterType, setSelectedFilterType] = React.useState<RealizationFilterType>(
        RealizationFilterType.REALIZATION_INDEX
    );
    const [isEdited, setIsEdited] = React.useState<boolean>(false);

    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());

    function handleSelectedEnsembleChange(newValue: string | undefined) {
        if (newValue === undefined) {
            setSelectedEnsemble(null);
            return;
        }

        const ensemble = ensembleSet.findEnsembleByIdentString(newValue);
        const selectedEnsembleRealizations = ensemble?.getRealizationFilter().getSelectedRealizations() ?? [];
        const selectedEnsembleRangeTags = ensemble?.getRealizationFilter().getSelectedRangeTags() ?? [];
        const selectedEnsembleParameterValueFilters = ensemble?.getRealizationFilter().getParameterValueFilters() ?? [];
        const filterType = ensemble?.getRealizationFilter().getFilterType() ?? RealizationFilterType.REALIZATION_INDEX;

        setSelectedEnsemble(ensemble);
        setSelectedRealizations([...(selectedEnsembleRealizations ?? [])]);
        setSelectedRangeTags([...(selectedEnsembleRangeTags ?? [])]);
        setSelectedParameterValueFilters(selectedEnsembleParameterValueFilters);
        setSelectedFilterType(filterType);
        setIsEdited(false);
    }

    function handleRealizationPickChange(newSelection: RealizationPickerSelection) {
        const isEdited =
            !isEqual(
                newSelection.selectedRealizations,
                selectedEnsemble?.getRealizationFilter().getSelectedRealizations() ?? []
            ) ||
            !isEqual(
                newSelection.selectedRangeTags,
                selectedEnsemble?.getRealizationFilter().getSelectedRangeTags() ?? []
            );
        setIsEdited(isEdited);
        setSelectedRealizations(newSelection.selectedRealizations);
        setSelectedRangeTags(newSelection.selectedRangeTags);
    }

    function handleDiscardChangesOnClick() {
        if (!selectedEnsemble) return;

        setSelectedRealizations([...selectedEnsemble.getRealizationFilter().getSelectedRealizations()]);
        setSelectedRangeTags([...selectedEnsemble.getRealizationFilter().getSelectedRangeTags()]);
        setSelectedParameterValueFilters(selectedEnsemble.getRealizationFilter().getParameterValueFilters());
        setSelectedFilterType(selectedEnsemble.getRealizationFilter().getFilterType());
        setIsEdited(false);
    }

    function handleApplyButtonOnClick() {
        if (!selectedEnsemble) return;
        if (
            isEqual(selectedRealizations, selectedEnsemble.getRealizationFilter().getSelectedRealizations()) &&
            isEqual(selectedRangeTags, selectedEnsemble.getRealizationFilter().getSelectedRangeTags()) &&
            selectedFilterType === selectedEnsemble.getRealizationFilter().getFilterType()
        ) {
            return;
        }

        setIsEdited(false);

        // If selected realizations are unequal to current selected realizations for ensemble - update the ensemble and notify.
        selectedEnsemble
            .getRealizationFilter()
            .setSelectedRealizationsAndRangeTags({ realizations: selectedRealizations, rangeTags: selectedRangeTags });
        selectedEnsemble.getRealizationFilter().setFilterType(selectedFilterType);
        props.workbench.getWorkbenchSessionPrivate().notifyAboutEnsembleRealizationFilterChange();
    }

    function handleSelectedFilterTypeChange(newFilterType: RealizationFilterType) {
        setSelectedFilterType(newFilterType);

        if (!selectedEnsemble) return;

        setIsEdited(newFilterType !== selectedEnsemble?.getRealizationFilter().getFilterType());
    }

    // TODO:
    // - How to populate selections/notify modules of changes?
    // - More info on possible realization indices for RealizationPicker? A bit difficult to see what can be written in the input field.

    return (
        <>
            <div className="flex justify-center items-center p-2 bg-slate-100 h-10">
                <FilterIcon />
                {""}
                <span
                    title={"Realization Filter"}
                    className="font-bold flex-grow p-0 text-ellipsis whitespace-nowrap overflow-hidden text-sm"
                >
                    {"Realization Filter"}
                </span>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto">
                <Label text="Ensemble">
                    <Dropdown
                        value={selectedEnsemble?.getIdent().toString() ?? undefined}
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
                    <RealizationPicker
                        selectedRangeTags={selectedRangeTags}
                        validRealizations={selectedEnsemble?.getRealizations() ?? []}
                        debounceTimeMs={500}
                        onChange={handleRealizationPickChange}
                        disabled={!selectedEnsemble || selectedFilterType !== RealizationFilterType.REALIZATION_INDEX}
                    />
                </Label>
                {/* <Label text="Realizations by parameter values">
                    <div>TO BE IMPLEMENTED</div>
                </Label> */}
                <div className="flex gap-4">
                    <Button
                        color="danger"
                        variant="outlined"
                        disabled={!selectedEnsemble || !isEdited}
                        startIcon={isEdited ? <Close fontSize="small" /> : undefined}
                        onClick={handleDiscardChangesOnClick}
                    >
                        Discard changes
                    </Button>
                    <Button
                        variant="outlined"
                        disabled={!selectedEnsemble || !isEdited}
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
