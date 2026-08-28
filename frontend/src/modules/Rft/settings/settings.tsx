import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { xor } from "lodash";

import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { CheckboxCompositions } from "@lib/components/Checkbox/compositions";
import { Combobox } from "@lib/components/Combobox";
import { NumberInput } from "@lib/components/NumberInput";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { Setting, type SettingAnnotation } from "@lib/components/Setting";
import { SwitchCompositions } from "@lib/components/Switch/compositions";
import { useDebouncedFunction } from "@lib/hooks/usedDebouncedStateEmit";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import {
    usePropagateAllApiErrorsToStatusWriter,
    usePropagateQueryErrorsToStatusWriter,
} from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import { RFT_STATISTIC_LABELS, type RftStatistic } from "../typesAndEnums";

import {
    dataChannelDepthAtom,
    selectedStatisticsAtom,
    showDepthLineAtom,
    showIndividualRealizationsAtom,
    showObservationsAtom,
    showStatisticalFanAtom,
    showStatisticalLinesAtom,
} from "./atoms/baseAtoms";
import {
    availableResponseNamesAtom,
    availableTimestampsUtcMsAtom,
    availableWellNamesAtom,
    ensembleTableDefinitionsAtom,
} from "./atoms/derivedAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedResponseNameAtom,
    selectedTimestampUtcMsAtom,
    selectedWellNameAtom,
} from "./atoms/persistableFixableAtoms";
import {
    rftObservationsQueriesAtom,
    rftRealizationDataQueriesAtom,
    rftTableDefinitionQueriesAtom,
} from "./atoms/queryAtoms";

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom).value;
    const setSelectedEnsembleIdents = useSetAtom(selectedEnsembleIdentsAtom);

    const [showIndividualRealizations, setShowIndividualRealizations] = useAtom(showIndividualRealizationsAtom);
    const [showStatisticalLines, setShowStatisticalLines] = useAtom(showStatisticalLinesAtom);
    const [showStatisticalFan, setShowStatisticalFan] = useAtom(showStatisticalFanAtom);
    const [showObservations, setShowObservations] = useAtom(showObservationsAtom);
    const [selectedStatistics, setSelectedStatistics] = useAtom(selectedStatisticsAtom);
    const [dataChannelDepth, setDataChannelDepth] = useAtom(dataChannelDepthAtom);
    const [showDepthLine, setShowDepthLine] = useAtom(showDepthLineAtom);

    const selectedEnsembleIdentsAnnotations = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentsAtom);
    const selectedResponseNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedResponseNameAtom);
    const selectedWellNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedWellNameAtom);
    const selectedTimestampAnnotations = useMakePersistableFixableAtomAnnotations(selectedTimestampUtcMsAtom);

    const tableDefinitionQueries = useAtomValue(rftTableDefinitionQueriesAtom);
    usePropagateQueryErrorsToStatusWriter(tableDefinitionQueries, statusWriter);

    const rftRealizationDataResult = useAtomValue(rftRealizationDataQueriesAtom);
    const rftObservationsResult = useAtomValue(rftObservationsQueriesAtom);
    usePropagateAllApiErrorsToStatusWriter(rftRealizationDataResult.errors, statusWriter);
    usePropagateAllApiErrorsToStatusWriter(rftObservationsResult.errors, statusWriter);

    const availableResponseNames = useAtomValue(availableResponseNamesAtom);
    const selectedResponseName = useAtomValue(selectedResponseNameAtom).value;
    const setSelectedResponseName = useSetAtom(selectedResponseNameAtom);

    const availableWellNames = useAtomValue(availableWellNamesAtom);
    const selectedWellName = useAtomValue(selectedWellNameAtom).value;
    const setSelectedWellName = useSetAtom(selectedWellNameAtom);

    const availableTimestampsUtcMs = useAtomValue(availableTimestampsUtcMsAtom);
    const selectedTimestampUtcMs = useAtomValue(selectedTimestampUtcMsAtom).value;
    const setSelectedTimestampUtcMs = useSetAtom(selectedTimestampUtcMsAtom);

    const ensembleTableDefinitions = useAtomValue(ensembleTableDefinitionsAtom);

    function handleEnsembleSelectionChange(ensembleIdents: RegularEnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
    }

    function handleResponseNameChange(responseNames: string[]) {
        setSelectedResponseName(responseNames[0] ?? null);
    }

    function handleWellNameChange(wellNames: string[]) {
        setSelectedWellName(wellNames[0] ?? null);
    }

    function handleTimestampChange(timestamps: number[]) {
        setSelectedTimestampUtcMs(timestamps[0] ?? null);
    }

    function handleStatisticsChange(statistics: string[]) {
        setSelectedStatistics(statistics as RftStatistic[]);
    }

    function handleDataChannelDepthChange(value: number | null) {
        setDataChannelDepth(value !== null && Number.isFinite(value) ? value : null);
    }

    const debouncedHandleDataChannelDepthChange = useDebouncedFunction(handleDataChannelDepthChange, 500);

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
        <Setting.ScrollArea>
            <Setting.Panel>
                <Setting.Section title="Data" defaultOpen>
                    <Setting.Field label="Ensembles" annotations={selectedEnsembleIdentsAnnotations} stacked>
                        <EnsemblePicker
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={selectedEnsembleIdents}
                            allowDeltaEnsembles={false}
                            ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                            onValueChange={handleEnsembleSelectionChange}
                        />
                    </Setting.Field>
                </Setting.Section>
                <Setting.Section title="Selections" defaultOpen>
                    <Setting.Field
                        label="Response"
                        annotations={selectedResponseNameAnnotations}
                        loadingOverlay={tableDefinitionsArePending}
                        errorOverlay={tableDefinitionsErrorMessage}
                        stacked
                    >
                        <Select
                            options={makeStringOptions(availableResponseNames)}
                            value={selectedResponseName ? [selectedResponseName] : []}
                            onValueChange={handleResponseNameChange}
                            filter={availableResponseNames.length > 6}
                            size={Math.max(1, Math.min(availableResponseNames.length, 4))}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Well"
                        annotations={wellNameAnnotations}
                        loadingOverlay={tableDefinitionsArePending}
                        errorOverlay={tableDefinitionsErrorMessage}
                        stacked
                    >
                        <Select
                            options={makeStringOptions(availableWellNames)}
                            value={selectedWellName ? [selectedWellName] : []}
                            onValueChange={handleWellNameChange}
                            filter={availableWellNames.length > 6}
                            size={Math.max(1, Math.min(availableWellNames.length, 10))}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Date"
                        annotations={timestampAnnotations}
                        loadingOverlay={tableDefinitionsArePending}
                        errorOverlay={tableDefinitionsErrorMessage}
                        stacked
                    >
                        <Select<number>
                            options={makeTimestampOptions(availableTimestampsUtcMs)}
                            value={selectedTimestampUtcMs !== null ? [selectedTimestampUtcMs] : []}
                            onValueChange={handleTimestampChange}
                            filter={availableTimestampsUtcMs.length > 6}
                            size={Math.max(3, Math.min(availableTimestampsUtcMs.length, 6))}
                        />
                    </Setting.Field>
                </Setting.Section>
                <Setting.Section title="Plot" defaultOpen>
                    <Setting.Field label="Display" stacked contentClassName="flex flex-col gap-y-xs">
                        <>
                            <CheckboxCompositions.WithLabel
                                label="Individual realizations"
                                checked={showIndividualRealizations}
                                onCheckedChange={setShowIndividualRealizations}
                                size="small"
                            />
                            <CheckboxCompositions.WithLabel
                                label="Statistic lines"
                                checked={showStatisticalLines}
                                onCheckedChange={setShowStatisticalLines}
                                size="small"
                            />
                            <CheckboxCompositions.WithLabel
                                label="Statistic fan"
                                checked={showStatisticalFan}
                                onCheckedChange={setShowStatisticalFan}
                                size="small"
                            />
                            <CheckboxCompositions.WithLabel
                                label="Observations"
                                checked={showObservations}
                                onCheckedChange={setShowObservations}
                                size="small"
                            />
                        </>
                    </Setting.Field>
                    <Setting.Field label="Statistic lines" stacked>
                        <Combobox
                            multiple
                            items={Object.entries(RFT_STATISTIC_LABELS).map(([value, label]) => ({
                                value: value as RftStatistic,
                                label,
                            }))}
                            value={selectedStatistics}
                            onValueChange={handleStatisticsChange}
                            placeholder="Select statistics..."
                        />
                    </Setting.Field>
                </Setting.Section>
                <Setting.Section title="Data channel">
                    <Setting.Field>
                        <SwitchCompositions.WithLabel
                            label="Show depth line in plot"
                            checked={showDepthLine}
                            onCheckedChange={setShowDepthLine}
                            size="small"
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Depth (TVD)"
                        description="Publishes the response value interpolated at this depth, per realization, as a data channel. The depth can also be dragged in the plot."
                        stacked
                    >
                        <NumberInput
                            value={dataChannelDepth}
                            onValueChange={debouncedHandleDataChannelDepthChange}
                            placeholder="No depth selected"
                        />
                    </Setting.Field>
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}

function arraysHaveSameValues<T>(left: T[], right: T[]): boolean {
    return xor(left, right).length === 0;
}

function makeStringOptions(values: string[]): SelectOption[] {
    return values.map(function makeStringOption(value) {
        return { label: value, value };
    });
}

function makeTimestampOptions(timestampsUtcMs: number[]): SelectOption<number>[] {
    return timestampsUtcMs.map(function makeTimestampOption(timestampUtcMs) {
        return { label: timestampUtcMsToCompactIsoString(timestampUtcMs), value: timestampUtcMs };
    });
}
