import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import {
    EnsembleRealizationFilterFunction,
    useEnsembleRealizationFilterFunc,
    useEnsembleSet,
} from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup, RadioGroupOption } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";

import { Plot, PlotsSelector } from "./components/PlotsSelector";
import { usePvtDataQueries } from "./queryHooks";
import { Interface, State } from "./state";
import {
    ColorBy,
    PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME,
    Phase,
    PhaseType,
    PressureDependentVariable,
} from "./typesAndEnums";
import { PvtDataAccessor } from "./utils/PvtDataAccessor";

export function Settings({ settingsContext, workbenchSession }: ModuleSettingsProps<State, Interface>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    const filterEnsembleRealizations = useEnsembleRealizationFilterFunc(workbenchSession);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] =
        settingsContext.useInterfaceState("selectedEnsembleIdents");
    const [selectedRealizations, setSelectedRealizations] = settingsContext.useInterfaceState("selectedRealizations");
    const [selectedPvtNums, setSelectedPvtNums] = settingsContext.useInterfaceState("selectedPvtNums");
    const [selectedPhases, setSelectedPhases] = settingsContext.useInterfaceState("selectedPhases");
    const [selectedColorBy, setSelectedColorBy] = settingsContext.useInterfaceState("selectedColorBy");
    const [selectedPlots, setSelectedPlots] = settingsContext.useInterfaceState("selectedPlots");

    const pvtDataQueries = usePvtDataQueries(selectedEnsembleIdents, selectedRealizations);

    const pvtDataAccessor = new PvtDataAccessor(pvtDataQueries.tableCollections);

    function handleEnsembleSelectionChange(ensembleIdents: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
    }

    function handleRealizationsChange(values: string[]) {
        setSelectedRealizations(values.map((value) => parseInt(value)));
    }

    function handlePvtNumChange(_: React.ChangeEvent<HTMLInputElement>, pvtNum: number) {
        setSelectedPvtNums([parseInt(String(pvtNum))]);
    }

    function handleColorByChange(_: React.ChangeEvent<HTMLInputElement>, colorBy: ColorBy) {
        setSelectedColorBy(colorBy);
    }

    function handlePhasesChange(values: string[]) {
        setSelectedPhases(values as PhaseType[]);
    }

    function handleVisualizePlotsChange(plots: string[]) {
        setSelectedPlots(plots as PressureDependentVariable[]);
    }

    let errorMessage = "";
    if (pvtDataQueries.allQueriesFailed) {
        errorMessage = "Failed to fetch PVT data. Make sure the selected ensemble has PVT data.";
    }

    const realizations = computeRealizationsIntersection(selectedEnsembleIdents, filterEnsembleRealizations);

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Ensembles" expanded>
                <MultiEnsembleSelect
                    ensembleSet={ensembleSet}
                    onChange={handleEnsembleSelectionChange}
                    value={selectedEnsembleIdents}
                    size={5}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="Realizations" expanded>
                <Select
                    options={makeRealizationOptions(realizations)}
                    value={selectedRealizations.map((el) => el.toString())}
                    onChange={handleRealizationsChange}
                    size={5}
                    multiple
                />
            </CollapsibleGroup>
            <PendingWrapper isPending={pvtDataQueries.isFetching} errorMessage={errorMessage}>
                <CollapsibleGroup title="PVT Num" expanded>
                    <RadioGroup
                        options={makePvtNumOptions(pvtDataAccessor.getUniquePvtNums())}
                        value={selectedPvtNums[0] ?? undefined}
                        onChange={handlePvtNumChange}
                    />
                </CollapsibleGroup>
                <CollapsibleGroup title="Phases" expanded>
                    <Select
                        options={makePhaseOptions(pvtDataAccessor.getUniquePhases())}
                        size={4}
                        value={selectedPhases}
                        onChange={handlePhasesChange}
                    />
                </CollapsibleGroup>
                <CollapsibleGroup title="Visualization" expanded>
                    <div className="flex flex-col gap-2">
                        <Label text="Color by">
                            <RadioGroup
                                options={[
                                    { label: "Ensemble", value: ColorBy.ENSEMBLE },
                                    { label: "PVTNum", value: ColorBy.PVT_NUM },
                                ]}
                                value={selectedColorBy}
                                onChange={handleColorByChange}
                            />
                        </Label>
                        <Label text="Show plot for">
                            <PlotsSelector
                                plots={makePlotOptions(selectedPhases)}
                                value={selectedPlots}
                                onChange={handleVisualizePlotsChange}
                            />
                        </Label>
                    </div>
                </CollapsibleGroup>
            </PendingWrapper>
        </div>
    );
}

function makePvtNumOptions(pvtNums: number[]): RadioGroupOption<number>[] {
    return pvtNums.map((pvtNum) => ({ label: pvtNum.toString(), value: pvtNum }));
}

function makePhaseOptions(phases: Phase[]): SelectOption[] {
    return phases.map((phase) => ({ label: phase.name, value: phase.phaseType }));
}

function makePlotOptions(phaseTypes: PhaseType[]): Plot[] {
    const plots: Plot[] = [];

    for (const variable of Object.keys(PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME)) {
        if (variable === PressureDependentVariable.FLUID_RATIO && phaseTypes.includes(PhaseType.WATER)) {
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

function computeRealizationsIntersection(
    ensembleIdents: EnsembleIdent[],
    filterEnsembleRealizations: EnsembleRealizationFilterFunction
) {
    const realizations = ensembleIdents.map(filterEnsembleRealizations).flat();
    return Array.from(new Set(realizations));
}
