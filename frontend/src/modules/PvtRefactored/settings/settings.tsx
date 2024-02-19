import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";

import { useAtom, useAtomValue } from "jotai";

import {
    pvtDataAccessorAtom,
    pvtDataQueriesAtom,
    selectedEnsembleIdentsAtom,
    selectedPvtNumsAtom,
    selectedRealizationsAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedPvtNumsAtom,
    userSelectedRealizationsAtom,
} from "./atoms";

import { Plot, PlotsSelector } from "../components/PlotsSelector";
import { Interface, State } from "../state";
import {
    ColorBy,
    PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME,
    PhaseType,
    PressureDependentVariable,
} from "../typesAndEnums";
import { computeRealizationsIntersection } from "../utils/settingsUtils";

export function Settings({ settingsContext, workbenchSession }: ModuleSettingsProps<State, Interface>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    const filterEnsembleRealizations = useEnsembleRealizationFilterFunc(workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const [, setSelectedEnsembleIdents] = useAtom(userSelectedEnsembleIdentsAtom);
    const selectedPvtNums = useAtomValue(selectedPvtNumsAtom);
    const [, setSelectedPvtNums] = useAtom(userSelectedPvtNumsAtom);
    const pvtDataQueries = useAtomValue(pvtDataQueriesAtom);
    const pvtDataAccessor = useAtomValue(pvtDataAccessorAtom);
    const selectedRealizations = useAtomValue(selectedRealizationsAtom);
    const [, setSelectedRealizations] = useAtom(userSelectedRealizationsAtom);

    const [selectedPhase, setSelectedPhase] = settingsContext.useInterfaceState("selectedPhase");
    const [selectedColorBy, setSelectedColorBy] = settingsContext.useInterfaceState("selectedColorBy");
    const [selectedPlots, setSelectedPlots] = settingsContext.useInterfaceState("selectedPlots");

    const [selectedMultiEnsembleIdents, setSelectedMultiEnsembleIdents] =
        React.useState<EnsembleIdent[]>(selectedEnsembleIdents);
    const [selectedMultiRealizations, setSelectedMultiRealizations] = React.useState<number[]>(selectedRealizations);
    const [selectedMultiPvtNums, setSelectedMultiPvtNums] = React.useState<number[]>(selectedPvtNums);

    function handleMultiEnsembleSelectionChange(ensembleIdents: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
        setSelectedMultiEnsembleIdents(ensembleIdents);
    }

    function handleSingleEnsembleSelectionChange(ensembleIdents: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
    }

    function handleMultiRealizationSelectionChange(values: string[]) {
        setSelectedRealizations(values.map((value) => parseInt(value)));
        setSelectedMultiRealizations(realizations);
    }

    function handleSingleRealizationSelectionChange(values: string[]) {
        setSelectedRealizations(values.map((value) => parseInt(value)));
    }

    function handleMultiPvtNumChange(values: string[]) {
        const newPvtNums = values.map((value) => parseInt(value) as number);
        setSelectedPvtNums(newPvtNums);
        setSelectedMultiPvtNums(newPvtNums);
    }

    function handleSinglePvtNumChange(value: string[]) {
        setSelectedPvtNums(value.map((value) => parseInt(value)));
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

    function makeEnsembleSelect() {
        if (selectedColorBy === ColorBy.ENSEMBLE) {
            return (
                <MultiEnsembleSelect
                    ensembleSet={ensembleSet}
                    onChange={handleMultiEnsembleSelectionChange}
                    value={selectedEnsembleIdents}
                    size={5}
                />
            );
        }
        return (
            <MultiEnsembleSelect
                ensembleSet={ensembleSet}
                onChange={handleSingleEnsembleSelectionChange}
                value={selectedEnsembleIdents}
                size={5}
                multiple={false}
            />
        );
    }

    let errorMessage = "";
    if (pvtDataQueries.allQueriesFailed) {
        errorMessage = "Failed to fetch PVT data. Make sure the selected ensemble has PVT data.";
    }

    const realizations = computeRealizationsIntersection(selectedEnsembleIdents, filterEnsembleRealizations);

    function makeRealizationSelect() {
        if (selectedColorBy === ColorBy.ENSEMBLE) {
            return (
                <Select
                    options={makeRealizationOptions(realizations)}
                    value={selectedRealizations.map((el) => el.toString())}
                    onChange={handleMultiRealizationSelectionChange}
                    size={5}
                    multiple
                />
            );
        }

        return (
            <Select
                options={makeRealizationOptions(realizations)}
                value={selectedRealizations.map((el) => el.toString())}
                onChange={handleSingleRealizationSelectionChange}
                size={5}
            />
        );
    }

    function makePvtNumSelect() {
        if (selectedColorBy === ColorBy.PVT_NUM) {
            return (
                <Select
                    multiple
                    options={makePvtNumOptions(pvtDataAccessor.getUniquePvtNums())}
                    value={selectedPvtNums.map((el) => el.toString())}
                    onChange={handleMultiPvtNumChange}
                    size={5}
                />
            );
        }

        return (
            <Select
                options={makePvtNumOptions(pvtDataAccessor.getUniquePvtNums())}
                value={selectedPvtNums.map((el) => el.toString())}
                onChange={handleSinglePvtNumChange}
                size={5}
            />
        );
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
                {makeEnsembleSelect()}
            </CollapsibleGroup>
            <CollapsibleGroup title="Realizations" expanded>
                {makeRealizationSelect()}
            </CollapsibleGroup>
            <PendingWrapper isPending={pvtDataQueries.isFetching} errorMessage={errorMessage}>
                <CollapsibleGroup title="PVT Num" expanded>
                    {makePvtNumSelect()}
                </CollapsibleGroup>
                <CollapsibleGroup title="Phase" expanded>
                    <Dropdown options={makePhaseOptions()} value={selectedPhase} onChange={handlePhasesChange} />
                </CollapsibleGroup>
                <CollapsibleGroup title="Show plot for" expanded>
                    <PlotsSelector
                        plots={makePlotOptions(selectedPhase)}
                        value={selectedPlots}
                        onChange={handleVisualizePlotsChange}
                    />
                </CollapsibleGroup>
            </PendingWrapper>
        </div>
    );
}

function makePvtNumOptions(pvtNums: number[]): SelectOption[] {
    return pvtNums.map((pvtNum) => ({ label: pvtNum.toString(), value: pvtNum.toString() }));
}

function makePhaseOptions(): SelectOption[] {
    return [
        {
            label: "Oil (PVTO)",
            value: PhaseType.OIL,
        },
        {
            label: "Gas (PVTG)",
            value: PhaseType.GAS,
        },
        {
            label: "Water (PVTW)",
            value: PhaseType.WATER,
        },
    ];
}

function makePlotOptions(phaseType: PhaseType): Plot[] {
    const plots: Plot[] = [];

    for (const variable of Object.keys(PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME)) {
        if (variable === PressureDependentVariable.FLUID_RATIO && phaseType === PhaseType.WATER) {
            continue;
        }
        plots.push({
            label: PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME[variable as PressureDependentVariable],
            value: variable,
        });
    }

    return plots;
}

function makeRealizationOptions(realizations: number[]): SelectOption[] {
    return realizations.map((realization) => ({ label: realization.toString(), value: realization.toString() }));
}
