import React from "react";

import { useAtom, useAtomValue } from "jotai";

import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import {
    ColorBy,
    PHASE_TO_DISPLAY_NAME,
    PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME,
    PhaseType,
    PressureDependentVariable,
} from "../typesAndEnums";

import { selectedColorByAtom, selectedDependentVariablesAtom, selectedPhaseAtom } from "./atoms/baseAtoms";
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
    const [selectedColorBy, setSelectedColorBy] = useAtom(selectedColorByAtom);
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

    function handleColorByChange(_: React.ChangeEvent<HTMLInputElement>, colorBy: ColorBy) {
        setSelectedColorBy(colorBy);
        if (colorBy === ColorBy.PVT_NUM) {
            setSelectedEnsembleIdents([selectedMultiEnsembleIdents[0]]);
            setSelectedRealizations([selectedMultiRealizations[0]]);
            setSelectedPvtNums(selectedMultiPvtNums);
        } else {
            setSelectedEnsembleIdents(selectedMultiEnsembleIdents);
            setSelectedRealizations(selectedMultiRealizations);
            setSelectedPvtNums([selectedMultiPvtNums[0]]);
        }
    }

    function handlePhasesChange(value: string) {
        setSelectedPhase(value as PhaseType);
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
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Color by" expanded>
                <RadioGroup
                    options={[
                        { label: "Ensemble", value: ColorBy.ENSEMBLE },
                        { label: "PVTNum", value: ColorBy.PVT_NUM },
                    ]}
                    value={selectedColorBy}
                    onChange={handleColorByChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="Ensembles" expanded>
                <SettingWrapper annotations={selectedEnsemblesAnnotations}>
                    <EnsembleSelect
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(workbenchSession)}
                        onChange={handleEnsembleSelectionChange}
                        value={selectedEnsembleIdents.value}
                        size={5}
                        multiple={selectedColorBy === ColorBy.ENSEMBLE}
                    />
                </SettingWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Realizations" expanded>
                <SettingWrapper annotations={selectedRealizationsAnnotations}>
                    <Select
                        options={makeRealizationOptions(availableRealizationNumbers)}
                        value={selectedRealizations.value.map((el) => el.toString())}
                        onChange={handleRealizationSelectionChange}
                        size={5}
                        multiple={selectedColorBy === ColorBy.ENSEMBLE}
                    />
                </SettingWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="PVT Num" expanded>
                <SettingWrapper
                    annotations={selectedPvtNumsAnnotations}
                    loadingOverlay={selectedPvtNums.isLoading}
                    errorOverlay={selectedPvtNums.depsHaveError ? "Could not be loaded." : undefined}
                >
                    <Select
                        options={makePvtNumOptions(pvtDataAccessor?.getUniquePvtNums() || [])}
                        value={selectedPvtNums.value.map((el) => el.toString())}
                        onChange={handlePvtNumChange}
                        size={5}
                        multiple={selectedColorBy === ColorBy.PVT_NUM}
                    />
                </SettingWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Phase" expanded>
                <Dropdown options={makePhaseOptions()} value={selectedPhase} onChange={handlePhasesChange} />
            </CollapsibleGroup>
            <CollapsibleGroup title="Show plot for" expanded>
                <DependentVariableSelector
                    dependentVariables={makeDependentVariableOptions(selectedPhase)}
                    value={selectedDependentVariables}
                    onChange={handleVisualizePlotsChange}
                />
            </CollapsibleGroup>
        </div>
    );
}

function makePvtNumOptions(pvtNums: number[]): SelectOption[] {
    return pvtNums.map((pvtNum) => ({ label: pvtNum.toString(), value: pvtNum.toString() }));
}

function makePhaseOptions(): SelectOption[] {
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
