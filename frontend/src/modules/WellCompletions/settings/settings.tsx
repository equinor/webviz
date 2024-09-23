import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { Button } from "@lib/components/Button";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { DiscreteSlider } from "@lib/components/DiscreteSlider";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Switch } from "@lib/components/Switch";
import { ColorSet } from "@lib/utils/ColorSet";
import { ArrowDownwardSharp, ArrowUpwardSharp } from "@mui/icons-material";
import { SortDirection, SortWellsBy, SortWellsByEnumToStringMapping } from "@webviz/well-completions-plot";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import {
    selectedStratigraphyColorSetAtom,
    syncedEnsembleIdentsAtom,
    userSearchWellTextAtom,
    userSelectedCompletionDateIndexAtom,
    userSelectedCompletionDateIndexRangeAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedHideZeroCompletionsAtom,
    userSelectedRealizationNumberAtom,
    userSelectedRealizationSelectionAtom,
    userSelectedSortWellsByAtom,
    userSelectedSortWellsDirectionAtom,
    userSelectedTimeAggregationAtom,
} from "./atoms/baseAtoms";
import {
    isQueryErrorAtom,
    isQueryFetchingAtom,
    selectedCompletionDateIndexAtom,
    selectedCompletionDateIndexRangeAtom,
    selectedEnsembleIdentAtom,
    selectedRealizationNumberAtom,
    sortedCompletionDatesAtom,
} from "./atoms/derivedAtoms";
import { useMakeSettingsStatusWriterMessages } from "./hooks/useMakeSettingsStatusWriterMessages";

import { Interfaces } from "../interfaces";
import {
    RealizationSelection,
    RealizationSelectionEnumToStringMapping,
    TimeAggregationSelection,
    TimeAggregationSelectionEnumToStringMapping,
} from "../typesAndEnums";

export const Settings = ({
    settingsContext,
    workbenchSession,
    workbenchServices,
    workbenchSettings,
}: ModuleSettingsProps<Interfaces>) => {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);
    const stratigraphyColorSet = workbenchSettings.useColorSet();

    const setSyncedEnsembleIdents = useSetAtom(syncedEnsembleIdentsAtom);
    const setSelectedStratigraphyColorSet = useSetAtom(selectedStratigraphyColorSetAtom);
    const setUserSearchWellText = useSetAtom(userSearchWellTextAtom);
    const setUserSelectedCompletionDateIndex = useSetAtom(userSelectedCompletionDateIndexAtom);
    const setUserSelectedCompletionDateIndexRange = useSetAtom(userSelectedCompletionDateIndexRangeAtom);
    const setUserSelectedEnsembleIdent = useSetAtom(userSelectedEnsembleIdentAtom);
    const setUserSelectedRealizationNumber = useSetAtom(userSelectedRealizationNumberAtom);
    const selectedEnsembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const selectedRealizationNumber = useAtomValue(selectedRealizationNumberAtom);
    const sortedCompletionDates = useAtomValue(sortedCompletionDatesAtom);
    const selectedCompletionDateIndex = useAtomValue(selectedCompletionDateIndexAtom);
    const selectedCompletionDateIndexRange = useAtomValue(selectedCompletionDateIndexRangeAtom);
    const isQueryFetching = useAtomValue(isQueryFetchingAtom);
    const isQueryError = useAtomValue(isQueryErrorAtom);

    const [userSelectedTimeAggregation, setUserSelectedTimeAggregation] = useAtom(userSelectedTimeAggregationAtom);
    const [userSelectedHideZeroCompletions, setUserSelectedHideZeroCompletions] = useAtom(
        userSelectedHideZeroCompletionsAtom
    );
    const [userSelectedRealizationSelection, setUserSelectedRealizationSelection] = useAtom(
        userSelectedRealizationSelectionAtom
    );
    const [userSelectedSortWellsBy, setUserSelectedSortWellsBy] = useAtom(userSelectedSortWellsByAtom);
    const [userSelectedSortWellsDirection, setUserSelectedSortWellsDirection] = useAtom(
        userSelectedSortWellsDirectionAtom
    );

    const [prevSyncedEnsembleIdents, setPrevSyncedEnsembleIdents] = React.useState<EnsembleIdent[] | null>(null);
    const [prevStratigraphyColorSet, setPrevStratigraphyColorSet] = React.useState<ColorSet | null>(null);

    const syncedSettingKeys = settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedEnsembleIdents = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    if (!isEqual(stratigraphyColorSet, prevStratigraphyColorSet)) {
        setPrevStratigraphyColorSet(stratigraphyColorSet);
        if (stratigraphyColorSet) {
            setSelectedStratigraphyColorSet(stratigraphyColorSet);
        }
    }
    if (!isEqual(syncedEnsembleIdents, prevSyncedEnsembleIdents)) {
        setPrevSyncedEnsembleIdents(syncedEnsembleIdents);
        if (syncedEnsembleIdents) {
            setSyncedEnsembleIdents(syncedEnsembleIdents);
        }
    }

    useMakeSettingsStatusWriterMessages(statusWriter);

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setUserSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleSelectedRealizationNumberChange(realizationNumber: string) {
        setUserSelectedRealizationNumber(parseInt(realizationNumber));
    }

    function handleSelectedCompletionDateIndexSelectionChange(newIndex: number | number[]) {
        if (typeof newIndex === "number") {
            setUserSelectedCompletionDateIndex(newIndex);
            return;
        } else if (Array.isArray(newIndex) && newIndex.length >= 2) {
            setUserSelectedCompletionDateIndexRange([newIndex[0], newIndex[1]]);
            return;
        }
        throw new Error(
            "Invalid time step index selection, expected number or array of numbers length 2, got: " + newIndex
        );
    }

    function handleSearchWellChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setUserSearchWellText(value);
    }

    function handleHideZeroCompletionsChange(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        setUserSelectedHideZeroCompletions(checked);
    }

    function handleSetAscendingSortDirection() {
        setUserSelectedSortWellsDirection(SortDirection.ASCENDING);
    }

    function handleSetDescendingSortDirection() {
        setUserSelectedSortWellsDirection(SortDirection.DESCENDING);
    }

    const createValueLabelFormat = React.useCallback(
        function createValueLabelFormat(value: number): string {
            if (!sortedCompletionDates || !sortedCompletionDates.length) {
                return "";
            }

            const timeStep = sortedCompletionDates.find((_, index) => {
                if (index === value) return true;
            });
            return timeStep ?? "";
        },
        [sortedCompletionDates]
    );

    const selectedEnsemble = selectedEnsembleIdent ? ensembleSet.findEnsemble(selectedEnsembleIdent) : null;
    const isSingleRealizationSelection = userSelectedRealizationSelection === RealizationSelection.SINGLE;

    function createErrorMessage(): string | null {
        if (!isQueryError) {
            return null;
        }

        return "Failed to load well completions data";
    }

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup expanded={true} title="Ensemble">
                <EnsembleDropdown
                    ensembleSet={ensembleSet}
                    value={selectedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Realization selection">
                <div className="flex flex-col gap-2 overflow-y-auto">
                    <RadioGroup
                        options={Object.values(RealizationSelection).map((elm: RealizationSelection) => {
                            return { value: elm, label: RealizationSelectionEnumToStringMapping[elm] };
                        })}
                        value={userSelectedRealizationSelection}
                        onChange={(_, value) => setUserSelectedRealizationSelection(value)}
                    />
                    <div className={isSingleRealizationSelection ? "" : "pointer-events-none"}>
                        <Label text={isSingleRealizationSelection ? "Realization" : "Realization (disabled)"}>
                            <Dropdown
                                disabled={!isSingleRealizationSelection}
                                options={
                                    !selectedEnsemble
                                        ? []
                                        : selectedEnsemble.getRealizations().map((realization: number) => {
                                              return {
                                                  label: realization.toString(),
                                                  value: realization.toString(),
                                              };
                                          })
                                }
                                value={selectedRealizationNumber?.toString() ?? undefined}
                                onChange={handleSelectedRealizationNumberChange}
                            />
                        </Label>
                    </div>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Completions selections">
                <PendingWrapper isPending={isQueryFetching} errorMessage={createErrorMessage() ?? undefined}>
                    <div className="flex flex-col gap-2 overflow-y-auto">
                        <Label text="Time Aggregation">
                            <RadioGroup
                                options={Object.values(TimeAggregationSelection).map(
                                    (elm: TimeAggregationSelection) => {
                                        return { value: elm, label: TimeAggregationSelectionEnumToStringMapping[elm] };
                                    }
                                )}
                                direction={"horizontal"}
                                value={userSelectedTimeAggregation}
                                onChange={(_, value) => setUserSelectedTimeAggregation(value)}
                            />
                        </Label>
                        {userSelectedTimeAggregation === TimeAggregationSelection.NONE && (
                            <Label
                                text={
                                    selectedCompletionDateIndex === null || !sortedCompletionDates
                                        ? "Time Step"
                                        : `Time Step: (${sortedCompletionDates[selectedCompletionDateIndex]})`
                                }
                            >
                                <DiscreteSlider
                                    valueLabelDisplay="auto"
                                    value={selectedCompletionDateIndex ?? undefined}
                                    values={
                                        sortedCompletionDates?.map((_, index) => {
                                            return index;
                                        }) ?? []
                                    }
                                    valueLabelFormat={createValueLabelFormat}
                                    onChange={(_, value) => handleSelectedCompletionDateIndexSelectionChange(value)}
                                />
                            </Label>
                        )}
                        {userSelectedTimeAggregation !== TimeAggregationSelection.NONE && (
                            <Label
                                text={
                                    selectedCompletionDateIndexRange === null || !sortedCompletionDates
                                        ? "Time Steps"
                                        : `Time Steps: (${
                                              sortedCompletionDates[selectedCompletionDateIndexRange[0]]
                                          }, ${sortedCompletionDates[selectedCompletionDateIndexRange[1]]})`
                                }
                            >
                                <DiscreteSlider
                                    valueLabelDisplay="auto"
                                    value={selectedCompletionDateIndexRange ?? undefined}
                                    values={
                                        sortedCompletionDates?.map((_, index) => {
                                            return index;
                                        }) ?? []
                                    }
                                    valueLabelFormat={createValueLabelFormat}
                                    onChange={(_, value) => handleSelectedCompletionDateIndexSelectionChange(value)}
                                />
                            </Label>
                        )}
                        <Label text="Filter by completions">
                            <Switch
                                checked={userSelectedHideZeroCompletions}
                                onChange={handleHideZeroCompletionsChange}
                            />
                        </Label>
                        <Label text="Search well names">
                            <Input onChange={handleSearchWellChange} placeholder={"..."} />
                        </Label>
                        <Label text="Sort wells by">
                            <div className="flex items-center gap-2">
                                <div className="flex-grow">
                                    <Dropdown
                                        options={Object.values(SortWellsBy).map((elm: SortWellsBy) => {
                                            return { value: elm, label: SortWellsByEnumToStringMapping[elm] };
                                        })}
                                        value={userSelectedSortWellsBy}
                                        onChange={setUserSelectedSortWellsBy}
                                    />
                                </div>
                                <div className="flex items-center">
                                    <Button
                                        onClick={handleSetAscendingSortDirection}
                                        title="Sort ascending"
                                        startIcon={<ArrowUpwardSharp />}
                                        variant={
                                            userSelectedSortWellsDirection === SortDirection.ASCENDING
                                                ? "contained"
                                                : undefined
                                        }
                                        size="medium"
                                    />
                                    <Button
                                        onClick={handleSetDescendingSortDirection}
                                        title="Sort descending"
                                        startIcon={<ArrowDownwardSharp />}
                                        variant={
                                            userSelectedSortWellsDirection === SortDirection.DESCENDING
                                                ? "contained"
                                                : undefined
                                        }
                                        size="medium"
                                        name="test"
                                    />
                                </div>
                            </div>
                        </Label>
                    </div>
                </PendingWrapper>
            </CollapsibleGroup>
        </div>
    );
};
