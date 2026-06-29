import React from "react";

import { SortDirection, SortWellsBy, SortWellsByEnumToStringMapping } from "@webviz/well-completions-plot";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash-es";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { SortAscendingIcon, SortDescendingIcon } from "@lib/icons";
import { Button } from "@lib/components/Button";
import { Collapsible } from "@lib/components/Collapsible";
import { Combobox } from "@lib/components/Combobox";
import { RadioCompositions } from "@lib/components/Radio/compositions";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { Slider } from "@lib/components/Slider";
import { SwitchCompositions } from "@lib/components/Switch/compositions";
import { TextInput } from "@lib/components/TextInput";
import { Tooltip } from "@lib/components/Tooltip";
import type { ColorSet } from "@lib/utils/ColorSet";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import type { Interfaces } from "../interfaces";
import { RealizationMode, TimeAggregationMode, TimeAggregationModeEnumToStringMapping } from "../typesAndEnums";

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
import { sortedCompletionDatesAtom, availableRealizationsAtom } from "./atoms/derivedAtoms";
import {
    selectedCompletionDateIndexAtom,
    selectedCompletionDateIndexRangeAtom,
    selectedEnsembleIdentAtom,
    selectedRealizationAtom,
} from "./atoms/persistableFixableAtoms";
import { useMakeSettingsStatusWriterMessages } from "./hooks/useMakeSettingsStatusWriterMessages";
import { useMakeTimeStepSliderSettingProps } from "./hooks/useMakeTimeStepSettingProps";

export const Settings = (props: ModuleSettingsProps<Interfaces>) => {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.settingsContext);
    const stratigraphyColorSet = useColorSet(props.workbenchSettings);

    const setSyncedEnsembleIdents = useSetAtom(syncedEnsembleIdentsAtom);
    const setSelectedStratigraphyColorSet = useSetAtom(selectedStratigraphyColorSetAtom);

    const availableRealizations = useAtomValue(availableRealizationsAtom);
    const sortedCompletionDates = useAtomValue(sortedCompletionDatesAtom);

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

    const syncHelper = useRefStableSyncSettingsHelper({
        workbenchServices: props.workbenchServices,
        moduleContext: props.settingsContext,
    });
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

    function handleDateIndexSelectionChange(newIndex: number | readonly number[]) {
        if (typeof newIndex === "number") {
            setSelectedCompletionDateIndex(newIndex);
            return;
        }

        throw new Error("Invalid time step index selection, expected single number, got: " + newIndex);
    }

    function handleDateIndexRangeSelectionChange(newIndex: number | readonly number[]) {
        if (typeof newIndex === "number") {
            setSelectedCompletionDateIndexRange([newIndex, newIndex]);
            return;
        }
        if (Array.isArray(newIndex) && newIndex.length == 2) {
            setSelectedCompletionDateIndexRange([newIndex[0], newIndex[1]]);
            return;
        }
        throw new Error(
            "Invalid time step index range selection, expected number or array of numbers length 2, got: " + newIndex,
        );
    }

    function handleToggleSortDirection() {
        setWellSortDirection(
            wellSortDirection === SortDirection.ASCENDING ? SortDirection.DESCENDING : SortDirection.ASCENDING,
        );
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

    const isSingleRealizationMode = realizationMode === RealizationMode.SINGLE;
    const isSingleTimeStepMode = timeAggregationMode === TimeAggregationMode.NONE;

    const selectedEnsembleIdentAnnotations = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentAtom);
    const selectedRealizationAnnotations = useMakePersistableFixableAtomAnnotations(selectedRealizationAtom);

    // Props for setting wrapper and slider based on selected TimeAggregationMode
    const timeStepSettingProps = useMakeTimeStepSliderSettingProps({
        isSingleTimeStepMode,
        sortedCompletionDates,
        selectedCompletionDateIndex,
        selectedCompletionDateIndexRange,
    });

    return (
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <SettingWrapper.Section title="Data" defaultOpen>
                    <SettingWrapper label="Ensemble" annotations={selectedEnsembleIdentAnnotations}>
                        <EnsembleDropdown
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={selectedEnsembleIdent.value}
                            ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(props.workbenchSession)}
                            onValueChange={handleEnsembleSelectionChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Realization" stacked annotations={selectedRealizationAnnotations}>
                        <SwitchCompositions.WithLabel
                            label="Aggregate over all realizations"
                            checked={realizationMode === RealizationMode.AGGREGATED}
                            onCheckedChange={(checked) =>
                                setRealizationMode(checked ? RealizationMode.AGGREGATED : RealizationMode.SINGLE)
                            }
                        />
                        <SettingWrapper
                            annotations={
                                !isSingleRealizationMode
                                    ? [{ type: "info", message: "Only available in single realization mode." }]
                                    : []
                            }
                        >
                            <Combobox
                                items={availableRealizations.map((real) => {
                                    return { label: real.toString(), value: real };
                                })}
                                value={selectedRealization.value ?? undefined}
                                onValueChange={(v) => v !== null && setSelectedRealization(v)}
                                disabled={!isSingleRealizationMode}
                                placeholder="Select realization..."
                            />
                        </SettingWrapper>
                    </SettingWrapper>
                </SettingWrapper.Section>
                <SettingWrapper.Section title="Plot settings" defaultOpen>
                    <SettingWrapper label="Time Aggregation" stacked annotations={selectedEnsembleIdentAnnotations}>
                        <RadioCompositions.GroupWithLabels
                            value={timeAggregationMode}
                            options={Object.values(TimeAggregationMode).map((elm: TimeAggregationMode) => {
                                return { value: elm, label: TimeAggregationModeEnumToStringMapping[elm] };
                            })}
                            onValueChange={setTimeAggregationMode}
                            size="small"
                            layout="horizontal"
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        stacked
                        label={timeStepSettingProps.settingWrapper.label}
                        annotations={timeStepSettingProps.settingWrapper.annotations}
                        loadingOverlay={timeStepSettingProps.settingWrapper.loadingOverlay}
                        errorOverlay={timeStepSettingProps.settingWrapper.errorOverlay}
                    >
                        <Slider
                            valueLabelDisplay="auto"
                            value={timeStepSettingProps.sliderValue}
                            min={0}
                            max={sortedCompletionDates?.length ? sortedCompletionDates.length - 1 : 0}
                            markers={sortedCompletionDates?.map((_, index) => index) ?? undefined}
                            valueLabelFormat={createValueLabelFormat}
                            onValueChange={(value) =>
                                isSingleTimeStepMode
                                    ? handleDateIndexSelectionChange(value)
                                    : handleDateIndexRangeSelectionChange(value)
                            }
                        />
                    </SettingWrapper>
                    <SettingWrapper>
                        <SwitchCompositions.WithLabel
                            label="Filter by completions"
                            checked={isZeroCompletionsHidden}
                            onCheckedChange={setIsZeroCompletionsHidden}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Exclude well names">
                        <TextInput value={wellExclusionText} onValueChange={setWellExclusionText} placeholder={"..."} />
                    </SettingWrapper>
                    <SettingWrapper label="Search well names">
                        <TextInput value={wellSearchText} onValueChange={setWellSearchText} placeholder={"..."} />
                    </SettingWrapper>
                    <SettingWrapper label="Sort wells by">
                        <div className="gap-xs flex items-center">
                            <div className="grow">
                                <Combobox
                                    items={Object.values(SortWellsBy).map((elm: SortWellsBy) => {
                                        return { value: elm, label: SortWellsByEnumToStringMapping[elm] };
                                    })}
                                    value={sortWellsBy}
                                    onValueChange={(v) => v && setSortWellsBy(v)}
                                />
                            </div>
                            <Tooltip
                                content={
                                    wellSortDirection === SortDirection.ASCENDING ? "Sort descending" : "Sort ascending"
                                }
                            >
                                <Button onClick={handleToggleSortDirection} iconOnly variant="contained">
                                    {wellSortDirection === SortDirection.ASCENDING ? (
                                        <SortAscendingIcon />
                                    ) : (
                                        <SortDescendingIcon />
                                    )}
                                </Button>
                            </Tooltip>
                        </div>
                    </SettingWrapper>
                </SettingWrapper.Section>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
};
