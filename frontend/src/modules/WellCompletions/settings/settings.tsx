import React from "react";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { DiscreteSlider } from "@lib/components/DiscreteSlider";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Switch } from "@lib/components/Switch";
import { useValidState } from "@lib/hooks/useValidState";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtom, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import { availableTimeStepsAtom, dataLoadingStatusAtom, plotDataAtom } from "./atoms/baseAtoms";
import { useWellCompletionsQuery } from "./hooks/queryHooks";

import { Interfaces } from "../interfaces";
import { DataLoadingStatus } from "../typesAndEnums";
import { TimeAggregationType, WellCompletionsDataAccessor } from "../utils/wellCompletionsDataAccessor";

enum RealizationSelection {
    Aggregated = "Aggregated",
    Single = "Single",
}

export const Settings = ({
    settingsContext,
    workbenchSession,
    workbenchServices,
    workbenchSettings,
}: ModuleSettingsProps<Interfaces>) => {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);

    const [availableTimeSteps, setAvailableTimeSteps] = useAtom(availableTimeStepsAtom);
    const setDataLoadingStatus = useSetAtom(dataLoadingStatusAtom);
    const setPlotData = useSetAtom(plotDataAtom);

    const stratigraphyColorSet = workbenchSettings.useColorSet();

    const [realizationSelection, setRealizationSelection] = React.useState<RealizationSelection>(
        RealizationSelection.Aggregated
    );
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useValidState<EnsembleIdent | null>({
        initialState: null,
        validStates: ensembleSet.getEnsembleArr().map((item: Ensemble) => item.getIdent()),
    });
    const [selectedRealizationNumber, setSelectedRealizationNumber] = useValidState<number>({
        initialState: 0,
        validStates:
            (selectedEnsembleIdent && ensembleSet.findEnsemble(selectedEnsembleIdent)?.getRealizations())?.map(
                (item: number) => item
            ) ?? [],
    });

    const [selectedTimeStepOptions, setSelectedTimeStepOptions] = React.useState<{
        timeStepIndex: number | [number, number] | null;
        timeAggregationType: TimeAggregationType;
    }>({ timeStepIndex: 0, timeAggregationType: TimeAggregationType.None });

    const timeAggregationOptions = makeTimeAggregationOptionItems();

    const syncedSettingKeys = settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const computedEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        const acceptInvalidState = false;
        setSelectedEnsembleIdent(computedEnsembleIdent, acceptInvalidState);
    }

    const wellCompletionsQuery = useWellCompletionsQuery(
        selectedEnsembleIdent?.getCaseUuid(),
        selectedEnsembleIdent?.getEnsembleName(),
        realizationSelection === RealizationSelection.Single ? selectedRealizationNumber : undefined
    );

    usePropagateApiErrorToStatusWriter(wellCompletionsQuery, statusWriter);

    // Use ref to prevent new every render
    const wellCompletionsDataAccessor = React.useRef<WellCompletionsDataAccessor>(new WellCompletionsDataAccessor());

    const createAndPropagatePlotDataToView = React.useCallback(
        function createAndPropagatePlotDataToView(
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
        },
        [setPlotData]
    );

    React.useEffect(
        function handleNewQueryData() {
            if (!wellCompletionsQuery.data) {
                wellCompletionsDataAccessor.current.clearWellCompletionsData();
                setAvailableTimeSteps(null);
                setPlotData(null);
                return;
            }

            wellCompletionsDataAccessor.current.parseWellCompletionsData(
                wellCompletionsQuery.data,
                stratigraphyColorSet
            );

            // Update available time steps
            const allTimeSteps = wellCompletionsDataAccessor.current.getTimeSteps();
            setAvailableTimeSteps((prev) => (prev !== allTimeSteps ? allTimeSteps : prev));

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

            createAndPropagatePlotDataToView(allTimeSteps, timeStepIndex, selectedTimeStepOptions.timeAggregationType);
        },
        [
            wellCompletionsQuery.data,
            selectedTimeStepOptions,
            stratigraphyColorSet,
            setPlotData,
            setAvailableTimeSteps,
            createAndPropagatePlotDataToView,
        ]
    );

    React.useEffect(
        function propagateQueryStatesToView() {
            if (wellCompletionsQuery.isFetching) {
                setDataLoadingStatus(DataLoadingStatus.Loading);
            } else if (wellCompletionsQuery.status === "error") {
                setDataLoadingStatus(DataLoadingStatus.Error);
            } else if (wellCompletionsQuery.status === "success") {
                setDataLoadingStatus(DataLoadingStatus.Idle);
            }
        },
        [wellCompletionsQuery.status, wellCompletionsQuery.isFetching, setDataLoadingStatus]
    );

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

        createAndPropagatePlotDataToView(availableTimeSteps, newTimeStepIndex, newTimeAggregation);
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

        createAndPropagatePlotDataToView(
            availableTimeSteps,
            newTimeStepIndex,
            selectedTimeStepOptions.timeAggregationType
        );
    }

    function handleSearchWellChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        wellCompletionsDataAccessor.current?.setSearchWellText(value);

        createAndPropagatePlotDataToView(
            availableTimeSteps,
            selectedTimeStepOptions.timeStepIndex,
            selectedTimeStepOptions.timeAggregationType
        );
    }

    function handleHideZeroCompletionsChange(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        wellCompletionsDataAccessor.current?.setHideZeroCompletions(checked);

        createAndPropagatePlotDataToView(
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
    const isSingleRealizationSelection = realizationSelection === RealizationSelection.Single;

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup expanded={true} title="Ensemble">
                <EnsembleDropdown
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Realization selection">
                <div className="flex flex-col gap-2 overflow-y-auto">
                    <RadioGroup
                        options={[
                            { label: RealizationSelection.Aggregated, value: RealizationSelection.Aggregated },
                            { label: RealizationSelection.Single, value: RealizationSelection.Single },
                        ]}
                        value={realizationSelection}
                        onChange={handleRealizationSelectionChange}
                    />
                    <div className={isSingleRealizationSelection ? "" : "pointer-events-none"}>
                        <Label text={isSingleRealizationSelection ? "Realization" : "Realization (disabled)"}>
                            <Dropdown
                                disabled={!isSingleRealizationSelection}
                                options={computedEnsemble === null ? [] : makeRealizationOptionItems(computedEnsemble)}
                                value={selectedRealizationNumber?.toString() ?? undefined}
                                onChange={handleSelectedRealizationNumberChange}
                            />
                        </Label>
                    </div>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Completions selections">
                <QueryStateWrapper
                    queryResult={wellCompletionsQuery}
                    loadingComponent={<CircularProgress />}
                    errorComponent={"Could not find well completions data"}
                >
                    <div className="flex flex-col gap-2 overflow-y-auto">
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
                </QueryStateWrapper>
            </CollapsibleGroup>
        </div>
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
