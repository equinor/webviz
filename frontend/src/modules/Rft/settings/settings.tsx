import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { SettingWrapper, type SettingAnnotation } from "@lib/components/SettingWrapper";
import { TagPicker, type TagOption } from "@lib/components/TagPicker";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateQueryErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import { RFT_STATISTIC_LABELS, type RftStatistic } from "../typesAndEnums";

import {
    selectedStatisticsAtom,
    showIndividualRealizationsAtom,
    showObservationsAtom,
    showStatisticalFanAtom,
    showStatisticalLinesAtom,
    validRealizationNumbersAtom,
} from "./atoms/baseAtoms";
import {
    availableResponseNamesAtom,
    availableTimestampsUtcMsAtom,
    availableWellNamesAtom,
    ensembleTableDefinitionsAtom,
    selectedEnsembleIdentsAtom,
    selectedResponseNameAtom,
    selectedTimestampUtcMsAtom,
    selectedWellNameAtom,
} from "./atoms/derivedAtoms";
import {
    userSelectedEnsembleIdentsAtom,
    userSelectedResponseNameAtom,
    userSelectedTimestampUtcMsAtom,
    userSelectedWellNameAtom,
} from "./atoms/persistableFixableAtoms";
import { rftTableDefinitionQueriesAtom } from "./atoms/queryAtoms";

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setUserSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);
    const setValidRealizationNumbers = useSetAtom(validRealizationNumbersAtom);

    const [showIndividualRealizations, setShowIndividualRealizations] = useAtom(showIndividualRealizationsAtom);
    const [showStatisticalLines, setShowStatisticalLines] = useAtom(showStatisticalLinesAtom);
    const [showStatisticalFan, setShowStatisticalFan] = useAtom(showStatisticalFanAtom);
    const [showObservations, setShowObservations] = useAtom(showObservationsAtom);
    const [selectedStatistics, setSelectedStatistics] = useAtom(selectedStatisticsAtom);

    const selectedEnsembleIdentsAnnotations = useMakePersistableFixableAtomAnnotations(userSelectedEnsembleIdentsAtom);
    const selectedResponseNameAnnotations = useMakePersistableFixableAtomAnnotations(userSelectedResponseNameAtom);
    const selectedWellNameAnnotations = useMakePersistableFixableAtomAnnotations(userSelectedWellNameAtom);
    const selectedTimestampAnnotations = useMakePersistableFixableAtomAnnotations(userSelectedTimestampUtcMsAtom);

    const tableDefinitionQueries = useAtomValue(rftTableDefinitionQueriesAtom);
    usePropagateQueryErrorsToStatusWriter(tableDefinitionQueries, statusWriter);

    const availableResponseNames = useAtomValue(availableResponseNamesAtom);
    const selectedResponseName = useAtomValue(selectedResponseNameAtom);
    const setUserSelectedResponseName = useSetAtom(userSelectedResponseNameAtom);

    const availableWellNames = useAtomValue(availableWellNamesAtom);
    const selectedWellName = useAtomValue(selectedWellNameAtom);
    const setUserSelectedWellName = useSetAtom(userSelectedWellNameAtom);

    const availableTimestampsUtcMs = useAtomValue(availableTimestampsUtcMsAtom);
    const selectedTimestampUtcMs = useAtomValue(selectedTimestampUtcMsAtom);
    const setUserSelectedTimestampUtcMs = useSetAtom(userSelectedTimestampUtcMsAtom);

    const ensembleTableDefinitions = useAtomValue(ensembleTableDefinitionsAtom);

    const validRealizations = React.useMemo(() => {
        const realizationSet = new Set<number>();
        for (const ensembleIdent of selectedEnsembleIdents) {
            for (const realization of filterEnsembleRealizationsFunc(ensembleIdent)) {
                realizationSet.add(realization);
            }
        }
        return Array.from(realizationSet).sort((a, b) => a - b);
    }, [filterEnsembleRealizationsFunc, selectedEnsembleIdents]);

    React.useEffect(() => {
        setValidRealizationNumbers(validRealizations);
    }, [setValidRealizationNumbers, validRealizations]);

    function handleEnsembleSelectionChange(ensembleIdents: RegularEnsembleIdent[]) {
        setUserSelectedEnsembleIdents(ensembleIdents);
    }

    function handleResponseNameChange(responseNames: string[]) {
        setUserSelectedResponseName(responseNames[0] ?? null);
    }

    function handleWellNameChange(wellNames: string[]) {
        setUserSelectedWellName(wellNames[0] ?? null);
    }

    function handleTimestampChange(timestamps: string[]) {
        setUserSelectedTimestampUtcMs(timestamps[0] !== undefined ? parseInt(timestamps[0]) : null);
    }

    function handleStatisticsChange(statistics: string[]) {
        setSelectedStatistics(statistics as RftStatistic[]);
    }

    const tableDefinitionsArePending = tableDefinitionQueries.some((query) => query.isFetching);
    const tableDefinitionsErrorMessage =
        tableDefinitionQueries.length > 0 && tableDefinitionQueries.every((query) => query.isError)
            ? "Could not load RFT table definitions"
            : undefined;

    const allEnsembleTableDefinitionsLoaded =
        selectedEnsembleIdents.length > 0 && ensembleTableDefinitions.length === selectedEnsembleIdents.length;

    const wellNameSetsPerEnsemble = ensembleTableDefinitions.map((definition) =>
        definition.tableDefinition.well_infos.map((wellInfo) => wellInfo.well_name),
    );
    const wellNameSetsDiffer =
        wellNameSetsPerEnsemble.length > 1 &&
        wellNameSetsPerEnsemble.some((wellNames) => !arraysHaveSameValues(wellNames, wellNameSetsPerEnsemble[0]));
    const commonWellNamesAreMissing = allEnsembleTableDefinitionsLoaded && availableWellNames.length === 0;
    const wellNameAnnotations: SettingAnnotation[] = [
        ...selectedWellNameAnnotations,
        commonWellNamesAreMissing && {
            type: "error" as const,
            message: "Selected ensembles have no wells in common.",
        },
        wellNameSetsDiffer &&
            !commonWellNamesAreMissing && {
                type: "warning" as const,
                message: "Selected ensembles have different wells. Only wells common to all ensembles are available.",
            },
    ].filter(Boolean) as SettingAnnotation[];

    const timestampSetsPerEnsemble = selectedWellName
        ? ensembleTableDefinitions.map((definition) => {
              const wellInfo = definition.tableDefinition.well_infos.find(
                  (candidate) => candidate.well_name === selectedWellName,
              );
              return (wellInfo?.timestamps_utc_ms ?? []).map((timestamp) => timestamp.toString());
          })
        : [];
    const timestampSetsDiffer =
        timestampSetsPerEnsemble.length > 1 &&
        timestampSetsPerEnsemble.some((timestamps) => !arraysHaveSameValues(timestamps, timestampSetsPerEnsemble[0]));
    const commonTimestampsAreMissing =
        allEnsembleTableDefinitionsLoaded && Boolean(selectedWellName) && availableTimestampsUtcMs.length === 0;
    const timestampAnnotations: SettingAnnotation[] = [
        ...selectedTimestampAnnotations,
        commonTimestampsAreMissing && {
            type: "error" as const,
            message: "Selected ensembles have no dates in common for this well.",
        },
        timestampSetsDiffer &&
            !commonTimestampsAreMissing && {
                type: "warning" as const,
                message: "Selected ensembles have different dates. Only dates common to all ensembles are available.",
            },
    ].filter(Boolean) as SettingAnnotation[];

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup expanded={true} title="Data source" contentClassName="flex flex-col gap-2">
                <SettingWrapper label="Ensembles" annotations={selectedEnsembleIdentsAnnotations}>
                    <EnsemblePicker
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        value={selectedEnsembleIdents}
                        allowDeltaEnsembles={false}
                        ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                        onChange={handleEnsembleSelectionChange}
                    />
                </SettingWrapper>
            </CollapsibleGroup>
            <PendingWrapper isPending={tableDefinitionsArePending} errorMessage={tableDefinitionsErrorMessage}>
                <CollapsibleGroup expanded={true} title="Selection" contentClassName="flex flex-col gap-2">
                    <SettingWrapper label="Response" annotations={selectedResponseNameAnnotations}>
                        <Select
                            options={makeStringOptions(availableResponseNames)}
                            value={selectedResponseName ? [selectedResponseName] : []}
                            onChange={handleResponseNameChange}
                            filter={availableResponseNames.length > 6}
                            size={Math.max(1, Math.min(availableResponseNames.length, 4))}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Well" annotations={wellNameAnnotations}>
                        <Select
                            options={makeStringOptions(availableWellNames)}
                            value={selectedWellName ? [selectedWellName] : []}
                            onChange={handleWellNameChange}
                            filter={availableWellNames.length > 6}
                            size={Math.max(1, Math.min(availableWellNames.length, 10))}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Date" annotations={timestampAnnotations}>
                        <Select
                            options={makeTimestampOptions(availableTimestampsUtcMs)}
                            value={selectedTimestampUtcMs !== null ? [selectedTimestampUtcMs.toString()] : []}
                            onChange={handleTimestampChange}
                            filter={availableTimestampsUtcMs.length > 6}
                            size={Math.max(1, Math.min(availableTimestampsUtcMs.length, 6))}
                        />
                    </SettingWrapper>
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Plot" contentClassName="flex flex-col gap-2">
                    <SettingWrapper label="Display">
                        <div className="flex flex-col gap-1">
                            <Checkbox
                                label="Individual realizations"
                                checked={showIndividualRealizations}
                                onChange={(_, checked) => setShowIndividualRealizations(checked)}
                            />
                            <Checkbox
                                label="Statistic lines"
                                checked={showStatisticalLines}
                                onChange={(_, checked) => setShowStatisticalLines(checked)}
                            />
                            <Checkbox
                                label="Statistic fan"
                                checked={showStatisticalFan}
                                onChange={(_, checked) => setShowStatisticalFan(checked)}
                            />
                            <Checkbox
                                label="Observations"
                                checked={showObservations}
                                onChange={(_, checked) => setShowObservations(checked)}
                            />
                        </div>
                    </SettingWrapper>
                    <SettingWrapper label="Statistic lines">
                        <TagPicker
                            tagOptions={makeEnumOptions(RFT_STATISTIC_LABELS)}
                            selection={selectedStatistics}
                            onChange={handleStatisticsChange}
                            placeholder="Select statistics..."
                        />
                    </SettingWrapper>
                </CollapsibleGroup>
            </PendingWrapper>
        </div>
    );
}

function arraysHaveSameValues(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((value) => right.includes(value));
}

function makeStringOptions(values: string[]): SelectOption[] {
    return values.map(function makeStringOption(value) {
        return { label: value, value };
    });
}

function makeTimestampOptions(timestampsUtcMs: number[]): SelectOption[] {
    return timestampsUtcMs.map(function makeTimestampOption(timestampUtcMs) {
        return { label: timestampUtcMsToCompactIsoString(timestampUtcMs), value: timestampUtcMs.toString() };
    });
}

function makeEnumOptions<T extends string>(labels: Record<T, string>): TagOption[] {
    return Object.entries(labels).map(function makeEnumOption([value, label]) {
        return { label: label as string, value };
    });
}
