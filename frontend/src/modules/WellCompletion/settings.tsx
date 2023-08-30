import React from "react";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { DiscreteSlider } from "@lib/components/DiscreteSlider";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Switch } from "@lib/components/Switch";
import { useValidState } from "@lib/hooks/useValidState";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

import { useWellCompletionQuery } from "./queryHooks";
import { DataLoadingStatus, State } from "./state";
import { TimeAggregationType, WellCompletionsDataAccessor } from "./utils/wellCompletionsDataAccessor";

enum RealizationSelection {
    Aggregated = "Aggregated",
    Single = "Single",
}

export const settings = ({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) => {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [availableTimeSteps, setAvailableTimeSteps] = moduleContext.useStoreState("availableTimeSteps");
    const setDataLoadingStatus = moduleContext.useSetStoreValue("dataLoadingStatus");
    const setPlotData = moduleContext.useSetStoreValue("plotData");

    const [realizationSelection, setRealizationSelection] = React.useState<RealizationSelection>(
        RealizationSelection.Aggregated
    );
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useValidState<EnsembleIdent | null>(null, [
        ensembleSet.getEnsembleArr(),
        (item: Ensemble) => item.getIdent(),
    ]);
    const [selectedRealizationNumber, setSelectedRealizationNumber] = useValidState<number>(0, [
        (selectedEnsembleIdent && ensembleSet.findEnsemble(selectedEnsembleIdent)?.getRealizations()) ?? [],
        (item: number) => item,
    ]);

    const [selectedTimeStepOptions, setSelectedTimeStepOptions] = React.useState<{
        timeStepIndex: number | [number, number] | null;
        timeAggregationType: TimeAggregationType;
    }>({ timeStepIndex: 0, timeAggregationType: TimeAggregationType.None });

    const timeAggregationOptions = makeTimeAggregationOptionItems();

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const computedEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        const acceptInvalidState = false;
        setSelectedEnsembleIdent(computedEnsembleIdent, acceptInvalidState);
    }

    const wellCompletionQuery = useWellCompletionQuery(
        selectedEnsembleIdent?.getCaseUuid(),
        selectedEnsembleIdent?.getEnsembleName(),
        realizationSelection === RealizationSelection.Single ? selectedRealizationNumber : undefined
    );

    // Use ref to prevent new every render
    const wellCompletionsDataAccessor = React.useRef<WellCompletionsDataAccessor>(new WellCompletionsDataAccessor());

    React.useEffect(
        function handleNewQueryData() {
            if (!wellCompletionQuery.data) {
                wellCompletionsDataAccessor.current.clearWellCompletionsData();
                setAvailableTimeSteps(null);
                setPlotData(null);
                return;
            }

            wellCompletionsDataAccessor.current.parseWellCompletionsData(wellCompletionQuery.data);

            // Update available time steps
            const allTimeSteps = wellCompletionsDataAccessor.current.getTimeSteps();
            if (availableTimeSteps !== allTimeSteps) {
                setAvailableTimeSteps(allTimeSteps);
            }

            // Update selected time step indices if not among available time steps
            let timeStepIndex = selectedTimeStepOptions.timeStepIndex;
            if (typeof timeStepIndex === "number" && timeStepIndex >= allTimeSteps.length) {
                timeStepIndex = allTimeSteps.length - 1;
            }
            if (Array.isArray(timeStepIndex)) {
                let [startIndex, endIndex] = timeStepIndex;
                if (startIndex >= allTimeSteps.length) {
                    startIndex = allTimeSteps.length - 1;
                }
                if (endIndex >= allTimeSteps.length) {
                    endIndex = allTimeSteps.length - 1;
                }
                timeStepIndex = [startIndex, endIndex];
            }
            if (!isEqual(timeStepIndex, selectedTimeStepOptions.timeStepIndex)) {
                setSelectedTimeStepOptions((prev) => ({
                    ...prev,
                    timeStepIndex,
                }));
            }

            if (timeStepIndex === null || allTimeSteps.length === 0) {
                setPlotData(null);
                return;
            }
            createAndSetPlotData(allTimeSteps, timeStepIndex, selectedTimeStepOptions.timeAggregationType);
        },
        [wellCompletionQuery.data, selectedTimeStepOptions]
    );

    React.useEffect(
        function handleQueryStateChange() {
            if (wellCompletionQuery.status === "loading" && wellCompletionQuery.fetchStatus === "fetching") {
                setDataLoadingStatus(DataLoadingStatus.Loading);
            } else if (wellCompletionQuery.status === "error") {
                setDataLoadingStatus(DataLoadingStatus.Error);
            } else if (wellCompletionQuery.status === "success") {
                setDataLoadingStatus(DataLoadingStatus.Idle);
            }
        },
        [wellCompletionQuery.status, wellCompletionQuery.fetchStatus]
    );

    function createAndSetPlotData(
        availableTimeSteps: string[] | null,
        timeStepIndex: number | [number, number] | null,
        timeAggregation: TimeAggregationType
    ): void {
        if (!wellCompletionsDataAccessor.current || availableTimeSteps === null || timeStepIndex === null) {
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
    }

    function handleSelectedRealizationNumberChange(realizationNumber: string) {
        setSelectedRealizationNumber(parseInt(realizationNumber));
    }

    function handleTimeAggregationChange(_: React.ChangeEvent<HTMLInputElement>, value: string | number) {
        const newTimeAggregation = value as TimeAggregationType;
        let newTimeStepIndex: number | [number, number] | null = 0;
        if (!availableTimeSteps) {
            setSelectedTimeStepOptions({ timeStepIndex: newTimeStepIndex, timeAggregationType: newTimeAggregation });
            return;
        }

        if (newTimeAggregation === TimeAggregationType.Max || newTimeAggregation === TimeAggregationType.Average) {
            newTimeStepIndex =
                typeof selectedTimeStepOptions.timeStepIndex === "number"
                    ? [0, availableTimeSteps.length - 1]
                    : selectedTimeStepOptions.timeStepIndex;
            setSelectedTimeStepOptions({
                timeStepIndex: newTimeStepIndex,
                timeAggregationType: newTimeAggregation,
            });
        } else if (newTimeAggregation === TimeAggregationType.None) {
            if (selectedTimeStepOptions.timeStepIndex === null) {
                newTimeStepIndex = 0;
            } else if (typeof selectedTimeStepOptions.timeStepIndex === "number") {
                newTimeStepIndex = selectedTimeStepOptions.timeStepIndex;
            } else {
                const firstRangeIndex = selectedTimeStepOptions.timeStepIndex[0];
                newTimeStepIndex = firstRangeIndex < availableTimeSteps.length ? firstRangeIndex : 0;
            }
            setSelectedTimeStepOptions({
                timeStepIndex: newTimeStepIndex,
                timeAggregationType: newTimeAggregation,
            });
        }

        createAndSetPlotData(availableTimeSteps, newTimeStepIndex, newTimeAggregation);
    }

    function handleSelectedTimeStepIndexChange(e: Event, newIndex: number | number[]) {
        let newTimeStepIndex: number | [number, number] = 0;
        if (typeof newIndex === "number") {
            newTimeStepIndex = newIndex;
            setSelectedTimeStepOptions((prev) => ({ ...prev, timeStepIndex: newTimeStepIndex }));
        } else if (newIndex.length >= 2) {
            newTimeStepIndex = [newIndex[0], newIndex[1]];
            setSelectedTimeStepOptions((prev) => ({
                ...prev,
                timeStepIndex: newTimeStepIndex,
            }));
        }

        createAndSetPlotData(availableTimeSteps, newTimeStepIndex, selectedTimeStepOptions.timeAggregationType);
    }

    function handleSearchWellChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        wellCompletionsDataAccessor.current?.setSearchWellText(value);

        createAndSetPlotData(
            availableTimeSteps,
            selectedTimeStepOptions.timeStepIndex,
            selectedTimeStepOptions.timeAggregationType
        );
    }

    function handleHideZeroCompletionsChange(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        wellCompletionsDataAccessor.current?.setHideZeroCompletions(checked);

        createAndSetPlotData(
            availableTimeSteps,
            selectedTimeStepOptions.timeStepIndex,
            selectedTimeStepOptions.timeAggregationType
        );
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
                <>
                    <SingleEnsembleSelect
                        ensembleSet={ensembleSet}
                        value={computedEnsembleIdent}
                        onChange={handleEnsembleSelectionChange}
                    />
                    {
                        <div className="text-red-500 text-sm h-4">
                            {wellCompletionQuery.isError
                                ? "Current ensemble does not contain well completions data"
                                : ""}
                        </div>
                    }
                </>
            </Label>
            <div className={resolveClassNames({ "pointer-events-none opacity-40": wellCompletionQuery.isError })}>
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
                        value={selectedTimeStepOptions.timeAggregationType}
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
                    <Input onChange={handleSearchWellChange} placeholder={"..."} />
                </Label>
                <Label text="Filter by completions">
                    <Switch defaultChecked={false} onChange={handleHideZeroCompletionsChange} />
                </Label>
            </div>
        </>
    );
};

//-----------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------

function makeRealizationOptionItems(ensemble: Ensemble): DropdownOption[] {
    const options: DropdownOption[] = [];
    ensemble.getRealizations().map((realization: number) => {
        options.push({ label: realization.toString(), value: realization.toString() });
    });
    return options;
}

function makeTimeAggregationOptionItems(): DropdownOption[] {
    const options: DropdownOption[] = [];

    Object.values(TimeAggregationType).forEach((key: string) => {
        options.push({ label: key, value: key });
    });

    return options;
}
