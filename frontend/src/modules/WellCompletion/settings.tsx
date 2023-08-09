import React from "react";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { DiscreteSlider } from "@lib/components/DiscreteSlider";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Switch } from "@lib/components/Switch";

import { useWellCompletionQuery } from "./queryHooks";
import { RealizationSelection, State } from "./state";
import { TimeAggregation, TimeAggregations, WellCompletionsDataAccessor } from "./wellCompletionsDataAccessor";

export const settings = ({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) => {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = moduleContext.useStoreState("ensembleIdent");
    const [selectedRealizationNumber, setSelectedRealizationNumber] =
        moduleContext.useStoreState("realizationToInclude");
    const [realizationSelection, setRealizationSelection] = moduleContext.useStoreState("realizationSelection");
    const [availableTimeSteps, setAvailableTimeSteps] = moduleContext.useStoreState("availableTimeSteps");
    const setPlotData = moduleContext.useSetStoreValue("plotData");

    const [searchWellText, setSearchWellText] = React.useState<string>("");
    const [hideZeroCompletions, setHideZeroCompletions] = React.useState<boolean>(false);
    const [selectedTimeStepOptions, setSelectedTimeStepOptions] = React.useState<{
        timeStepIndex: number | [number, number] | null;
        timeAggregation: TimeAggregation;
    }>({ timeStepIndex: 0, timeAggregation: "None" });

    const timeAggregationOptions = makeTimeAggregationOptionItems();

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

    React.useEffect(
        function selectDefaultEnsemble() {
            const fixedEnsembleIdent = fixupEnsembleIdent(selectedEnsembleIdent, ensembleSet);
            if (fixedEnsembleIdent !== selectedEnsembleIdent) {
                setSelectedEnsembleIdent(fixedEnsembleIdent);
            }
        },
        [ensembleSet, selectedEnsembleIdent]
    );

    React.useEffect(() => {
        // Update plot when new query data from Sumo is retrieved
        if (wellCompletionQuery.data) {
            if (!wellCompletionsDataAccessor.current) {
                wellCompletionsDataAccessor.current = new WellCompletionsDataAccessor();
            }

            wellCompletionsDataAccessor.current.parseWellCompletionsData(wellCompletionQuery.data);

            wellCompletionsDataAccessor.current.setSearchWellText(searchWellText);
            wellCompletionsDataAccessor.current.setHideZeroCompletions(hideZeroCompletions);

            // Update available time steps
            const allTimeSteps = wellCompletionsDataAccessor.current.getTimeSteps();
            if (availableTimeSteps != allTimeSteps) {
                setAvailableTimeSteps(allTimeSteps);
            }

            // Update selected time step indices if not among available time steps
            let timeStepIndex = selectedTimeStepOptions.timeStepIndex;
            if (typeof timeStepIndex === "number" && allTimeSteps.length < timeStepIndex) {
                timeStepIndex = 0;
            }
            if (Array.isArray(timeStepIndex)) {
                let [startIndex, endIndex] = timeStepIndex;
                if (startIndex > allTimeSteps.length) {
                    startIndex = allTimeSteps.length - 1;
                }
                if (endIndex > allTimeSteps.length) {
                    endIndex = allTimeSteps.length - 1;
                }
                timeStepIndex = [startIndex, endIndex];
            }
            if (timeStepIndex !== selectedTimeStepOptions.timeStepIndex) {
                setSelectedTimeStepOptions((prev) => ({
                    timeStepIndex,
                    timeAggregation: prev.timeAggregation,
                }));
            }

            if (!allTimeSteps || timeStepIndex === null || !selectedTimeStepOptions.timeAggregation) {
                setPlotData(null);
                return;
            }
            createAndSetPlotData(allTimeSteps, timeStepIndex, selectedTimeStepOptions.timeAggregation);
        }
    }, [wellCompletionQuery.data]);

    React.useEffect(() => {
        // Update plot when settings are adjusted, but no new query data is retrieved
        if (
            !wellCompletionsDataAccessor.current ||
            !availableTimeSteps ||
            selectedTimeStepOptions.timeStepIndex === null ||
            !selectedTimeStepOptions.timeAggregation
        ) {
            return;
        }

        createAndSetPlotData(
            availableTimeSteps,
            selectedTimeStepOptions.timeStepIndex,
            selectedTimeStepOptions.timeAggregation
        );
    }, [selectedTimeStepOptions, searchWellText, hideZeroCompletions]);

    const createAndSetPlotData = React.useCallback(
        function createAndSetPlotData(
            availableTimeSteps: string[],
            timeStepIndex: number | [number, number],
            timeAggregation: TimeAggregation
        ): void {
            if (!wellCompletionsDataAccessor.current) {
                setPlotData(null);
                return;
            }
            if (typeof timeStepIndex === "number" && availableTimeSteps.length < timeStepIndex) {
                setPlotData(null);
                return;
            }
            if (
                typeof timeStepIndex !== "number" &&
                (availableTimeSteps.length < timeStepIndex[0] || availableTimeSteps.length < timeStepIndex[1])
            ) {
                setPlotData(null);
                return;
            }

            const timeStepSelection: string | [string, string] =
                typeof timeStepIndex === "number"
                    ? availableTimeSteps[timeStepIndex]
                    : [availableTimeSteps[timeStepIndex[0]], availableTimeSteps[timeStepIndex[1]]];
            setPlotData(wellCompletionsDataAccessor.current.createPlotData(timeStepSelection, timeAggregation));
        },
        [wellCompletionsDataAccessor.current]
    );

    function handleSelectedTimeStepIndexChange(e: Event, newTimeStepIndex: number | number[]) {
        // Check type of newTimeStepIndex
        if (typeof newTimeStepIndex === "number") {
            setSelectedTimeStepOptions((prev) => ({
                timeStepIndex: newTimeStepIndex,
                timeAggregation: prev.timeAggregation,
            }));
            return;
        }
        if (newTimeStepIndex.length >= 2) {
            setSelectedTimeStepOptions((prev) => ({
                timeStepIndex: [newTimeStepIndex[0], newTimeStepIndex[1]],
                timeAggregation: prev.timeAggregation,
            }));
        }
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
        if (selection === RealizationSelection.Single && computedEnsemble?.getRealizations()) {
            const realization = computedEnsemble.getRealizations()?.[0];
            setSelectedRealizationNumber(realization);
        }
    }

    function handleSelectedRealizationNumberChange(realizationNumber: string) {
        setSelectedRealizationNumber(parseInt(realizationNumber));
    }

    function handleTimeAggregationChange(_: React.ChangeEvent<HTMLInputElement>, value: string | number) {
        const newTimeAggregation = value as TimeAggregation;
        if (!availableTimeSteps) {
            setSelectedTimeStepOptions({ timeStepIndex: 0, timeAggregation: newTimeAggregation });
            return;
        }

        if (newTimeAggregation === "Max" || newTimeAggregation === "Average") {
            setSelectedTimeStepOptions((prev) => ({
                timeStepIndex:
                    typeof prev.timeStepIndex === "number" ? [0, availableTimeSteps.length - 1] : prev.timeStepIndex,
                timeAggregation: newTimeAggregation,
            }));
            return;
        }

        if (newTimeAggregation === "None") {
            setSelectedTimeStepOptions((prev) => ({
                timeStepIndex:
                    typeof prev.timeStepIndex === "number"
                        ? prev.timeStepIndex
                        : prev.timeStepIndex
                        ? prev.timeStepIndex[0] < availableTimeSteps.length
                            ? prev.timeStepIndex[0]
                            : 0
                        : 0,
                timeAggregation: newTimeAggregation,
            }));
        }
    }

    function handleSearchWellChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setSearchWellText(value);
        wellCompletionsDataAccessor.current?.setSearchWellText(value);
    }

    function handleHideZeroCompletionsChange(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        setHideZeroCompletions(checked);
        wellCompletionsDataAccessor.current?.setHideZeroCompletions(checked);
    }

    const createValueLabelFormat = React.useCallback(
        function createValueLabelFormat(value: number): string {
            if (!availableTimeSteps || !availableTimeSteps.length) {
                return "";
            }

            const timeStep = availableTimeSteps.find((_, index) => {
                if (index === value) return true;
            });
            return timeStep ?? "";
        },
        [availableTimeSteps]
    );

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
            <Label text="Time Aggregation">
                <RadioGroup
                    options={timeAggregationOptions}
                    direction={"horizontal"}
                    value={selectedTimeStepOptions.timeAggregation?.toString()}
                    onChange={handleTimeAggregationChange}
                />
            </Label>
            <Label
                text={
                    selectedTimeStepOptions.timeStepIndex === null || !availableTimeSteps
                        ? "Time Step"
                        : typeof selectedTimeStepOptions.timeStepIndex === "number"
                        ? `Time Step: (${availableTimeSteps[selectedTimeStepOptions.timeStepIndex]})`
                        : `Time Steps: (${availableTimeSteps[selectedTimeStepOptions.timeStepIndex[0]]}, ${
                              availableTimeSteps[selectedTimeStepOptions.timeStepIndex[1]]
                          })`
                }
            >
                <DiscreteSlider
                    valueLabelDisplay="auto"
                    value={
                        selectedTimeStepOptions.timeStepIndex !== null
                            ? selectedTimeStepOptions.timeStepIndex
                            : undefined
                    }
                    values={
                        availableTimeSteps
                            ? availableTimeSteps.map((t, index) => {
                                  return index;
                              })
                            : []
                    }
                    valueLabelFormat={createValueLabelFormat}
                    onChange={handleSelectedTimeStepIndexChange}
                />
            </Label>
            <Label text="Search well names">
                <Input value={searchWellText} onChange={handleSearchWellChange} placeholder={"..."} />
            </Label>
            <Label text="Filter by completions">
                <Switch checked={hideZeroCompletions} onChange={handleHideZeroCompletionsChange} />
            </Label>
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

function makeTimeAggregationOptionItems(): DropdownOption[] {
    const optionItems: DropdownOption[] = [];

    Object.keys(TimeAggregations).forEach((key: string) => {
        optionItems.push({ label: key, value: key });
    });

    return optionItems;
}
