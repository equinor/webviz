import React from "react";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Slider } from "@lib/components/Slider";

import { useWellCompletionQuery } from "./queryHooks";
import { RealizationSelection, State } from "./state";
import { TimeAggregations, WellCompletionsDataAccessor } from "./wellCompletionsDataAccessor";

// TODO:  Add usage of new DiscreteSlider component
export const settings = ({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) => {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = moduleContext.useStoreState("ensembleIdent");
    const [selectedRealizationNumber, setSelectedRealizationNumber] =
        moduleContext.useStoreState("realizationToInclude");
    const [realizationSelection, setRealizationSelection] = moduleContext.useStoreState("realizationSelection");
    const [availableTimeSteps, setAvailableTimeSteps] = moduleContext.useStoreState("availableTimeSteps");
    const setPlotData = moduleContext.useSetStoreValue("plotData");

    const [selectedTimeStep, setSelectedTimeStep] = React.useState<string | null>(null);

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);

    const wellCompletionQuery = useWellCompletionQuery(
        selectedEnsembleIdent?.getCaseUuid(),
        selectedEnsembleIdent?.getEnsembleName(),
        selectedRealizationNumber
    );

    const wellCompletionsDataAccessor = React.useRef<WellCompletionsDataAccessor | null>(null);

    React.useEffect(() => {
        if (wellCompletionQuery.data) {
            if (!wellCompletionsDataAccessor.current) {
                wellCompletionsDataAccessor.current = new WellCompletionsDataAccessor();
            }

            wellCompletionsDataAccessor.current.parseWellCompletionsData(wellCompletionQuery.data);

            let timeStep = selectedTimeStep;

            if (!timeStep || !wellCompletionsDataAccessor.current.getTimeSteps().includes(timeStep)) {
                timeStep = wellCompletionsDataAccessor.current.getTimeSteps().length
                    ? wellCompletionsDataAccessor.current.getTimeSteps()[0]
                    : null;
            }
            if (availableTimeSteps != wellCompletionsDataAccessor.current.getTimeSteps()) {
                setAvailableTimeSteps(wellCompletionsDataAccessor.current.getTimeSteps());
            }

            setSelectedTimeStep(timeStep);
            if (timeStep) {
                const plotData = wellCompletionsDataAccessor.current.createPlotData(timeStep, "None");
                if (plotData) {
                    setPlotData(wellCompletionsDataAccessor.current.createPlotData(timeStep, "None"));
                }
            }
        }
    }, [wellCompletionQuery.data, selectedTimeStep]);

    React.useEffect(
        function selectDefaultEnsemble() {
            const fixedEnsembleIdent = fixupEnsembleIdent(selectedEnsembleIdent, ensembleSet);
            if (fixedEnsembleIdent !== selectedEnsembleIdent) {
                setSelectedEnsembleIdent(fixedEnsembleIdent);
            }
        },
        [ensembleSet, selectedEnsembleIdent]
    );

    function handleSelectedTimeStepChange(newTimeStep: string) {
        setSelectedTimeStep(newTimeStep);
    }

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleRealizationSelectionChange(_: React.ChangeEvent<HTMLInputElement>, value: string | number) {
        const selection = value as RealizationSelection.Aggregated | RealizationSelection.Single;
        setRealizationSelection(selection);
        if (selection === RealizationSelection.Aggregated) {
            setSelectedRealizationNumber(undefined);
        }
    }

    function handleSelectedRealizationNumberChange(realizationNumber: string) {
        setSelectedRealizationNumber(parseInt(realizationNumber));
    }

    const computedEnsemble = computedEnsembleIdent ? ensembleSet.findEnsemble(computedEnsembleIdent) : null;

    return (
        <>
            <Label
                text="Ensemble:"
                labelClassName={syncHelper.isSynced(SyncSettingKey.ENSEMBLE) ? "bg-indigo-700 text-white" : ""}
            >
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            <Label text="Realization selection">
                <RadioGroup
                    options={[
                        { label: RealizationSelection.Aggregated, value: RealizationSelection.Aggregated },
                        { label: RealizationSelection.Single, value: RealizationSelection.Single },
                    ]}
                    value={realizationSelection}
                    onChange={handleRealizationSelectionChange}
                />
            </Label>
            {realizationSelection === RealizationSelection.Single && (
                <Label text="Realization">
                    <Dropdown
                        options={computedEnsemble === null ? [] : makeRealizationOptionItems(computedEnsemble)}
                        value={selectedRealizationNumber?.toString() ?? undefined}
                        onChange={handleSelectedRealizationNumberChange}
                    />
                </Label>
            )}
            {/* {/* <Slider value={[2, 5]} min={1} max={30} displayValue={true}></Slider> */
            /*Make it possible to have timesteps/strings as input for Slider?*/}
            <Label text="Time Step">
                <Dropdown
                    options={
                        wellCompletionsDataAccessor.current
                            ? makeTimeStepOptionItems(wellCompletionsDataAccessor.current.getTimeSteps())
                            : []
                    }
                    value={selectedTimeStep ? selectedTimeStep : undefined}
                    onChange={handleSelectedTimeStepChange}
                />
            </Label>
            {/* <Label text="Start timestep">
                <Dropdown options={[]} />
            </Label>
            <Label text="End timestep">
                <Dropdown options={[]} />
            </Label> */}
        </>
    );
};

//-----------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------

function makeRealizationOptionItems(ensemble: Ensemble): DropdownOption[] {
    const optionItems: DropdownOption[] = [];
    ensemble.getRealizations().map((realization: number) => {
        optionItems.push({ label: realization.toString(), value: realization.toString() });
    });
    return optionItems;
}

function makeTimeStepOptionItems(timeSteps: string[]): DropdownOption[] {
    const optionItems: DropdownOption[] = [];
    // TODO: Fill time steps

    timeSteps.map((timeStep: string) => {
        optionItems.push({ label: timeStep, value: timeStep });
    });
    return optionItems;
}
