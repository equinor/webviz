import React from "react";

import { ArrowDownwardSharp, ArrowUpwardSharp } from "@mui/icons-material";
import { SortDirection, SortWellsBy, SortWellsByEnumToStringMapping } from "@webviz/well-completions-plot";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { Button } from "@lib/components/Button";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { DiscreteSlider } from "@lib/components/DiscreteSlider";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Switch } from "@lib/components/Switch";
import type { ColorSet } from "@lib/utils/ColorSet";
import { PersistableAtomWarningWrapper } from "@modules/_shared/components/PersistableAtomWarningWrapper";

import type { Interfaces } from "../interfaces";
import {
    RealizationMode,
    RealizationModeEnumToStringMapping,
    TimeAggregationMode,
    TimeAggregationModeEnumToStringMapping,
} from "../typesAndEnums";

import {
    selectedStratigraphyColorSetAtom,
    syncedEnsembleIdentsAtom,
    wellExclusionTextAtom,
    wellSearchTextAtom,
    isZeroCompletionsHiddenAtom,
    realizationModeAtom,
    sortWellsByAtom,
    wellSortDirectionAtom,
    timeAggregationModeAtom,
} from "./atoms/baseAtoms";
import {
    isQueryErrorAtom,
    isQueryFetchingAtom,
    sortedCompletionDatesAtom,
    availableRealizationsAtom,
} from "./atoms/derivedAtoms";
import {
    selectedCompletionDateIndexAtom,
    selectedCompletionDateIndexRangeAtom,
    selectedEnsembleIdentAtom,
    selectedRealizationAtom,
} from "./atoms/persistableFixableAtoms";
import { useMakeSettingsStatusWriterMessages } from "./hooks/useMakeSettingsStatusWriterMessages";

export const Settings = ({
    settingsContext,
    workbenchSession,
    workbenchServices,
    workbenchSettings,
}: ModuleSettingsProps<Interfaces>) => {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);
    const stratigraphyColorSet = useColorSet(workbenchSettings);

    const setSyncedEnsembleIdents = useSetAtom(syncedEnsembleIdentsAtom);
    const setSelectedStratigraphyColorSet = useSetAtom(selectedStratigraphyColorSetAtom);

    const availableRealizations = useAtomValue(availableRealizationsAtom);
    const sortedCompletionDates = useAtomValue(sortedCompletionDatesAtom);
    const isQueryFetching = useAtomValue(isQueryFetchingAtom);
    const isQueryError = useAtomValue(isQueryErrorAtom);

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);
    const [realizationMode, setRealizationMode] = useAtom(realizationModeAtom);
    const [selectedRealization, setSelectedRealization] = useAtom(selectedRealizationAtom);

    const [timeAggregationMode, setTimeAggregationMode] = useAtom(timeAggregationModeAtom);
    const [selectedCompletionDateIndex, setSelectedCompletionDateIndex] = useAtom(selectedCompletionDateIndexAtom);
    const [selectedCompletionDateIndexRange, setSelectedCompletionDateIndexRange] = useAtom(
        selectedCompletionDateIndexRangeAtom,
    );
    const [isZeroCompletionsHidden, setIsZeroCompletionsHidden] = useAtom(isZeroCompletionsHiddenAtom);
    const [wellExclusionText, setWellExclusionText] = useAtom(wellExclusionTextAtom);
    const [wellSearchText, setWellSearchText] = useAtom(wellSearchTextAtom);
    const [sortWellsBy, setSortWellsBy] = useAtom(sortWellsByAtom);
    const [wellSortDirection, setWellSortDirection] = useAtom(wellSortDirectionAtom);

    const [prevSyncedEnsembleIdents, setPrevSyncedEnsembleIdents] = React.useState<RegularEnsembleIdent[] | null>(null);
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

    function handleEnsembleSelectionChange(newEnsembleIdent: RegularEnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleSelectedRealizationNumberChange(realizationNumber: string) {
        setSelectedRealization(parseInt(realizationNumber));
    }

    function handleSelectedCompletionDateIndexSelectionChange(newIndex: number | number[]) {
        if (typeof newIndex === "number") {
            setSelectedCompletionDateIndex(newIndex);
            return;
        } else if (Array.isArray(newIndex) && newIndex.length >= 2) {
            setSelectedCompletionDateIndexRange([newIndex[0], newIndex[1]]);
            return;
        }
        throw new Error(
            "Invalid time step index selection, expected number or array of numbers length 2, got: " + newIndex,
        );
    }

    function handleWellExclusionChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setWellExclusionText(value);
    }

    function handleWellSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setWellSearchText(value);
    }

    function handleHideZeroCompletionsChange(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        setIsZeroCompletionsHidden(checked);
    }

    function handleSetAscendingSortDirection() {
        setWellSortDirection(SortDirection.ASCENDING);
    }

    function handleSetDescendingSortDirection() {
        setWellSortDirection(SortDirection.DESCENDING);
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
        [sortedCompletionDates],
    );

    function createErrorMessage(): string | null {
        if (!isQueryError) {
            return null;
        }

        return "Failed to load well completions data";
    }

    const isSingleRealizationMode = realizationMode === RealizationMode.SINGLE;

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup expanded={true} title="Ensemble">
                <PersistableAtomWarningWrapper atom={selectedEnsembleIdentAtom}>
                    <EnsembleDropdown
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        value={selectedEnsembleIdent.value}
                        ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(workbenchSession)}
                        onChange={handleEnsembleSelectionChange}
                    />
                </PersistableAtomWarningWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Realization mode">
                <div className="flex flex-col gap-2 overflow-y-auto">
                    <RadioGroup
                        options={Object.values(RealizationMode).map((elm: RealizationMode) => {
                            return { value: elm, label: RealizationModeEnumToStringMapping[elm] };
                        })}
                        value={realizationMode}
                        onChange={(_, value) => setRealizationMode(value)}
                    />
                    <div className={isSingleRealizationMode ? "" : "pointer-events-none"}>
                        <Label text={isSingleRealizationMode ? "Realization" : "Realization (disabled)"}>
                            <PersistableAtomWarningWrapper atom={selectedRealizationAtom}>
                                <Dropdown
                                    disabled={!isSingleRealizationMode}
                                    options={availableRealizations.map((realization: number) => {
                                        return {
                                            label: realization.toString(),
                                            value: realization.toString(),
                                        };
                                    })}
                                    value={selectedRealization.value?.toString() ?? undefined}
                                    onChange={handleSelectedRealizationNumberChange}
                                />
                            </PersistableAtomWarningWrapper>
                        </Label>
                    </div>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Completions selections">
                <PendingWrapper isPending={isQueryFetching} errorMessage={createErrorMessage() ?? undefined}>
                    <div className="flex flex-col gap-2 overflow-y-auto">
                        <Label text="Time Aggregation">
                            <RadioGroup
                                options={Object.values(TimeAggregationMode).map((elm: TimeAggregationMode) => {
                                    return { value: elm, label: TimeAggregationModeEnumToStringMapping[elm] };
                                })}
                                direction={"horizontal"}
                                value={timeAggregationMode}
                                onChange={(_, value) => setTimeAggregationMode(value)}
                            />
                        </Label>
                        {timeAggregationMode === TimeAggregationMode.NONE && (
                            <PersistableAtomWarningWrapper atom={selectedCompletionDateIndexAtom}>
                                <Label
                                    text={
                                        selectedCompletionDateIndex.value === null || !sortedCompletionDates
                                            ? "Time Step"
                                            : `Time Step: (${sortedCompletionDates[selectedCompletionDateIndex.value]})`
                                    }
                                >
                                    <DiscreteSlider
                                        valueLabelDisplay="auto"
                                        value={selectedCompletionDateIndex.value ?? undefined}
                                        values={
                                            sortedCompletionDates?.map((_, index) => {
                                                return index;
                                            }) ?? []
                                        }
                                        valueLabelFormat={createValueLabelFormat}
                                        onChange={(_, value) => handleSelectedCompletionDateIndexSelectionChange(value)}
                                    />
                                </Label>
                            </PersistableAtomWarningWrapper>
                        )}
                        {timeAggregationMode !== TimeAggregationMode.NONE && (
                            <PersistableAtomWarningWrapper atom={selectedCompletionDateIndexRangeAtom}>
                                <Label
                                    text={
                                        selectedCompletionDateIndexRange.value === null || !sortedCompletionDates
                                            ? "Time Steps"
                                            : `Time Steps: (${
                                                  sortedCompletionDates[selectedCompletionDateIndexRange.value[0]]
                                              }, ${sortedCompletionDates[selectedCompletionDateIndexRange.value[1]]})`
                                    }
                                >
                                    <DiscreteSlider
                                        valueLabelDisplay="auto"
                                        value={selectedCompletionDateIndexRange.value ?? undefined}
                                        values={
                                            sortedCompletionDates?.map((_, index) => {
                                                return index;
                                            }) ?? []
                                        }
                                        valueLabelFormat={createValueLabelFormat}
                                        onChange={(_, value) => handleSelectedCompletionDateIndexSelectionChange(value)}
                                    />
                                </Label>
                            </PersistableAtomWarningWrapper>
                        )}
                        <Label text="Filter by completions">
                            <Switch checked={isZeroCompletionsHidden} onChange={handleHideZeroCompletionsChange} />
                        </Label>
                        <Label text="Exclude well names">
                            <Input value={wellExclusionText} onChange={handleWellExclusionChange} placeholder={"..."} />
                        </Label>
                        <Label text="Search well names">
                            <Input value={wellSearchText} onChange={handleWellSearchChange} placeholder={"..."} />
                        </Label>
                        <Label text="Sort wells by">
                            <div className="flex items-center gap-2">
                                <div className="grow">
                                    <Dropdown
                                        options={Object.values(SortWellsBy).map((elm: SortWellsBy) => {
                                            return { value: elm, label: SortWellsByEnumToStringMapping[elm] };
                                        })}
                                        value={sortWellsBy}
                                        onChange={setSortWellsBy}
                                    />
                                </div>
                                <div className="flex items-center">
                                    <Button
                                        onClick={handleSetAscendingSortDirection}
                                        title="Sort ascending"
                                        startIcon={<ArrowUpwardSharp />}
                                        variant={
                                            wellSortDirection === SortDirection.ASCENDING ? "contained" : undefined
                                        }
                                        size="medium"
                                    />
                                    <Button
                                        onClick={handleSetDescendingSortDirection}
                                        title="Sort descending"
                                        startIcon={<ArrowDownwardSharp />}
                                        variant={
                                            wellSortDirection === SortDirection.DESCENDING ? "contained" : undefined
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
