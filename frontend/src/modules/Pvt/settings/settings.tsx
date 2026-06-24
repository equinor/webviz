import React from "react";

import { useAtom, useAtomValue } from "jotai";

import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { ComboboxCompositions } from "@lib/newComponents/Combobox/compositions";
import type { ComboboxItem } from "@lib/newComponents/Combobox/types";
import { RadioCompositions } from "@lib/newComponents/Radio/compositions";
import type { SelectOption } from "@lib/newComponents/Select";
import { Select } from "@lib/newComponents/Select";
import { SettingWrapper } from "@lib/newComponents/SettingWrapper";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import {
    GroupBy,
    PHASE_TO_DISPLAY_NAME,
    PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME,
    PhaseType,
    PressureDependentVariable,
} from "../typesAndEnums";

import { selectedGroupByAtom, selectedDependentVariablesAtom, selectedPhaseAtom } from "./atoms/baseAtoms";
import { availableRealizationNumbersAtom, pvtDataAccessorWithStatusAtom } from "./atoms/derivedAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedPvtNumsAtom,
    selectedRealizationNumbersAtom,
} from "./atoms/persistableFixableAtoms";
import { pvtDataQueriesAtom } from "./atoms/queryAtoms";
import { DependentVariableSelector } from "./components/DependentVariableSelector/dependentVariableSelector";

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
    const statusWriter = useSettingsStatusWriter(settingsContext);
    const ensembleSet = useEnsembleSet(workbenchSession);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(selectedEnsembleIdentsAtom);
    const [selectedPvtNums, setSelectedPvtNums] = useAtom(selectedPvtNumsAtom);
    const [selectedRealizations, setSelectedRealizations] = useAtom(selectedRealizationNumbersAtom);
    const availableRealizationNumbers = useAtomValue(availableRealizationNumbersAtom);

    const pvtDataQueries = useAtomValue(pvtDataQueriesAtom);
    const { pvtDataAccessor } = useAtomValue(pvtDataAccessorWithStatusAtom);

    const [selectedPhase, setSelectedPhase] = useAtom(selectedPhaseAtom);
    const [selectedGroupBy, setSelectedGroupBy] = useAtom(selectedGroupByAtom);
    const [selectedDependentVariables, setSelectedPlots] = useAtom(selectedDependentVariablesAtom);

    const [selectedMultiEnsembleIdents, setSelectedMultiEnsembleIdents] = React.useState<RegularEnsembleIdent[]>(
        selectedEnsembleIdents.value,
    );
    const [selectedMultiRealizations, setSelectedMultiRealizations] = React.useState<number[]>(
        selectedRealizations.value,
    );
    const [selectedMultiPvtNums, setSelectedMultiPvtNums] = React.useState<number[]>(selectedPvtNums.value);

    usePropagateAllApiErrorsToStatusWriter(pvtDataQueries.errors, statusWriter);

    function handleEnsembleSelectionChange(ensembleIdents: RegularEnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
        setSelectedMultiEnsembleIdents(ensembleIdents);
    }

    function handleRealizationSelectionChange(values: string[]) {
        const newRealizations = values.map((value) => parseInt(value) as number);
        setSelectedRealizations(newRealizations);
        setSelectedMultiRealizations(newRealizations);
    }

    function handlePvtNumChange(values: string[]) {
        const newPvtNums = values.map((value) => parseInt(value) as number);
        setSelectedPvtNums(newPvtNums);
        setSelectedMultiPvtNums(newPvtNums);
    }

    function handleGroupByChange(groupBy: GroupBy) {
        setSelectedGroupBy(groupBy);
        if (groupBy === GroupBy.PVT_NUM) {
            setSelectedEnsembleIdents([selectedMultiEnsembleIdents[0]]);
            setSelectedRealizations([selectedMultiRealizations[0]]);
            setSelectedPvtNums(selectedMultiPvtNums);
        } else {
            setSelectedEnsembleIdents(selectedMultiEnsembleIdents);
            setSelectedRealizations(selectedMultiRealizations);
            setSelectedPvtNums([selectedMultiPvtNums[0]]);
        }
    }

    function handleVisualizePlotsChange(plots: string[]) {
        const orderedPlots = [
            PressureDependentVariable.FORMATION_VOLUME_FACTOR,
            PressureDependentVariable.DENSITY,
            PressureDependentVariable.VISCOSITY,
            PressureDependentVariable.FLUID_RATIO,
        ];
        setSelectedPlots(orderedPlots.filter((plot) => plots.includes(plot)));
    }

    let errorMessage = "";
    if (pvtDataQueries.allQueriesFailed) {
        errorMessage = "Failed to fetch PVT data. Make sure the selected ensemble has PVT data.";
    }

    const selectedEnsemblesAnnotations = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentsAtom);
    const selectedRealizationsAnnotations = useMakePersistableFixableAtomAnnotations(selectedRealizationNumbersAtom);
    const selectedPvtNumsAnnotations = useMakePersistableFixableAtomAnnotations(selectedPvtNumsAtom);
    if (errorMessage) {
        selectedPvtNumsAnnotations.push({ type: "error", message: errorMessage });
    }

    return (
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <SettingWrapper.Section title="Selection" defaultOpen>
                    <SettingWrapper label="Ensembles" annotations={selectedEnsemblesAnnotations} stacked>
                        <EnsembleSelect
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(workbenchSession)}
                            onChange={handleEnsembleSelectionChange}
                            value={selectedEnsembleIdents.value}
                            size={3}
                            multiple={selectedGroupBy === GroupBy.ENSEMBLE}
                            showQuickSelectButtons
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Group by"
                        stacked
                        help={{
                            title: "Group by",
                            content: (
                                <>
                                    <p>
                                        Select how to group the data for visualization. Each group is represented by a
                                        different color.
                                    </p>
                                    <ul className="pl-md pt-xs gap-y-2xs flex list-disc flex-col">
                                        <li>
                                            <strong>Ensemble:</strong> Colors data by ensemble. You can select multiple
                                            ensembles and realizations but only one PVT number.
                                        </li>
                                        <li>
                                            <strong>PVTNum:</strong> Colors data by PVT number. You can select multiple
                                            PVT numbers but only one realization and one ensemble.
                                        </li>
                                    </ul>
                                </>
                            ),
                        }}
                    >
                        <RadioCompositions.GroupWithLabels
                            options={[
                                { label: "Ensemble", value: GroupBy.ENSEMBLE },
                                { label: "PVTNum", value: GroupBy.PVT_NUM },
                            ]}
                            value={selectedGroupBy}
                            onValueChange={handleGroupByChange}
                            layout="horizontal"
                            size="small"
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Realizations" annotations={selectedRealizationsAnnotations} stacked>
                        <Select
                            options={makeRealizationOptions(availableRealizationNumbers)}
                            value={selectedRealizations.value.map((el) => el.toString())}
                            onValueChange={handleRealizationSelectionChange}
                            size={5}
                            multiple={selectedGroupBy === GroupBy.ENSEMBLE}
                            showQuickSelectButtons
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="PVT Num"
                        annotations={selectedPvtNumsAnnotations}
                        loadingOverlay={selectedPvtNums.isLoading}
                        errorOverlay={selectedPvtNums.depsHaveError ? "Could not be loaded." : undefined}
                        stacked
                    >
                        <Select
                            options={makePvtNumOptions(pvtDataAccessor?.getUniquePvtNums() || [])}
                            value={selectedPvtNums.value.map((el) => el.toString())}
                            onValueChange={handlePvtNumChange}
                            size={5}
                            multiple={selectedGroupBy === GroupBy.PVT_NUM}
                            showQuickSelectButtons
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Phase">
                        <ComboboxCompositions.WithBrowseButtons
                            items={makePhaseItems()}
                            value={selectedPhase}
                            onValueChange={(val) => val !== null && setSelectedPhase(val)}
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
                <SettingWrapper.Section title="Visualization" defaultOpen>
                    <SettingWrapper label="Show plot for" stacked>
                        <DependentVariableSelector
                            dependentVariables={makeDependentVariableOptions(selectedPhase)}
                            value={selectedDependentVariables}
                            onChange={handleVisualizePlotsChange}
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}

function makePvtNumOptions(pvtNums: number[]): SelectOption[] {
    return pvtNums.map((pvtNum) => ({ label: pvtNum.toString(), value: pvtNum.toString() }));
}

function makePhaseItems(): ComboboxItem<PhaseType>[] {
    return Object.values(PhaseType).map((phase: PhaseType) => {
        return { value: phase, label: PHASE_TO_DISPLAY_NAME[phase] };
    });
}

function makeDependentVariableOptions(phaseType: PhaseType): PressureDependentVariable[] {
    const plots: PressureDependentVariable[] = [];

    for (const variable of Object.keys(PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME)) {
        if (variable === PressureDependentVariable.FLUID_RATIO && phaseType === PhaseType.WATER) {
            continue;
        }
        plots.push(variable as PressureDependentVariable);
    }

    return plots;
}

function makeRealizationOptions(realizations: number[]): SelectOption[] {
    return realizations.map((realization) => ({ label: realization.toString(), value: realization.toString() }));
}
