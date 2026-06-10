import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import type { SettingAnnotation } from "@lib/components/SettingWrapper";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { useDebouncedFunction } from "@lib/hooks/usedDebouncedStateEmit";
import { CheckboxCompositions } from "@lib/newComponents/Checkbox";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { Combobox } from "@lib/newComponents/Combobox";
import type { ComboboxItem } from "@lib/newComponents/Combobox/types";
import { Hidden } from "@lib/newComponents/Hidden";
import { RadioCompositions } from "@lib/newComponents/Radio";
import type { SelectOption } from "@lib/newComponents/Select";
import { Select } from "@lib/newComponents/Select";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateQueryErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import {
    ColorBy,
    CurveType,
    GroupBy,
    REL_PERM_STATISTIC_LABELS,
    YAxisScale,
    type RelPermStatistic,
} from "../typesAndEnums";

import {
    selectedColorByAtom,
    selectedCurveTypeAtom,
    selectedGroupByAtom,
    selectedStatisticsAtom,
    selectedYAxisScaleAtom,
    showIndividualRealizationsAtom,
    showStatisticalFanAtom,
    showStatisticalLinesAtom,
    validRealizationNumbersAtom,
} from "./atoms/baseAtoms";
import {
    availableCurveNamesAtom,
    availableSaturationAxisNamesAtom,
    availableSatnumsAtom,
    availableTableNamesAtom,
    selectedCurveNamesAtom,
    selectedEnsembleIdentsAtom,
    selectedSaturationAxisNameAtom,
    selectedSatnumsAtom,
    selectedTableNameAtom,
} from "./atoms/derivedAtoms";
import {
    userSelectedCurveNamesAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedSaturationAxisNameAtom,
    userSelectedSatnumsAtom,
    userSelectedTableNameAtom,
} from "./atoms/persistableFixableAtoms";
import { relPermTableDefinitionQueriesAtom, relPermTableNamesQueriesAtom } from "./atoms/queryAtoms";

const CURVE_TYPE_LABELS: Record<CurveType, string> = {
    [CurveType.RELPERM]: "Relative permeability",
    [CurveType.CAPILLARY_PRESSURE]: "Capillary pressure",
};

const COLOR_BY_LABELS: Record<ColorBy, string> = {
    [ColorBy.ENSEMBLE]: "Ensemble",
    [ColorBy.CURVE]: "Curve",
    [ColorBy.SATNUM]: "SATNUM",
};

const GROUP_BY_LABELS: Record<GroupBy, string> = {
    [GroupBy.NONE]: "None",
    [GroupBy.ENSEMBLE]: "Ensemble",
    [GroupBy.SATNUM]: "SATNUM",
};

const SATURATION_AXIS_HELP = {
    title: "Saturation axes",
    content: (
        <div className="flex flex-col gap-2">
            <p>
                Each selected SATNUM is plotted on its own shared saturation axis. When realization curves have
                different saturation samples, they are interpolated onto the common saturation interval for that SATNUM.
            </p>
            <p>
                Selecting several SATNUMs keeps their axes separate. The plot either colors by SATNUM or uses SATNUM
                subplots so the curves remain distinguishable.
            </p>
        </div>
    ),
};

const SATNUM_QUERY_DEBOUNCE_MS = 500;

function arraysHaveSameValues(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
        return false;
    }

    const sortedLeft = [...left].sort();
    const sortedRight = [...right].sort();
    return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setUserSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);
    const setValidRealizationNumbers = useSetAtom(validRealizationNumbersAtom);

    const [selectedCurveType, setSelectedCurveType] = useAtom(selectedCurveTypeAtom);
    const [showIndividualRealizations, setShowIndividualRealizations] = useAtom(showIndividualRealizationsAtom);
    const [showStatisticalLines, setShowStatisticalLines] = useAtom(showStatisticalLinesAtom);
    const [showStatisticalFan, setShowStatisticalFan] = useAtom(showStatisticalFanAtom);
    const [selectedStatistics, setSelectedStatistics] = useAtom(selectedStatisticsAtom);
    const [selectedColorBy, setSelectedColorBy] = useAtom(selectedColorByAtom);
    const [selectedGroupBy, setSelectedGroupBy] = useAtom(selectedGroupByAtom);
    const [selectedYAxisScale, setSelectedYAxisScale] = useAtom(selectedYAxisScaleAtom);

    const selectedEnsembleIdentsAnnotations = useMakePersistableFixableAtomAnnotations(userSelectedEnsembleIdentsAtom);
    const selectedTableNameAnnotations = useMakePersistableFixableAtomAnnotations(userSelectedTableNameAtom);
    const selectedSaturationAxisNameAnnotations = useMakePersistableFixableAtomAnnotations(
        userSelectedSaturationAxisNameAtom,
    );
    const selectedCurveNamesAnnotations = useMakePersistableFixableAtomAnnotations(userSelectedCurveNamesAtom);
    const selectedSatnumsAnnotations = useMakePersistableFixableAtomAnnotations(userSelectedSatnumsAtom);

    const tableNameQueries = useAtomValue(relPermTableNamesQueriesAtom);
    const tableDefinitionQueries = useAtomValue(relPermTableDefinitionQueriesAtom);
    usePropagateQueryErrorsToStatusWriter(tableNameQueries, statusWriter);
    usePropagateQueryErrorsToStatusWriter(tableDefinitionQueries, statusWriter);

    const availableTableNames = useAtomValue(availableTableNamesAtom);
    const selectedTableName = useAtomValue(selectedTableNameAtom);
    const setUserSelectedTableName = useSetAtom(userSelectedTableNameAtom);

    const availableSaturationAxisNames = useAtomValue(availableSaturationAxisNamesAtom);
    const selectedSaturationAxisName = useAtomValue(selectedSaturationAxisNameAtom);
    const setUserSelectedSaturationAxisName = useSetAtom(userSelectedSaturationAxisNameAtom);

    const availableCurveNames = useAtomValue(availableCurveNamesAtom);
    const selectedCurveNames = useAtomValue(selectedCurveNamesAtom);
    const setUserSelectedCurveNames = useSetAtom(userSelectedCurveNamesAtom);

    const availableSatnums = useAtomValue(availableSatnumsAtom);
    const selectedSatnums = useAtomValue(selectedSatnumsAtom);
    const setUserSelectedSatnums = useSetAtom(userSelectedSatnumsAtom);

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

    function handleTableNameChange(tableNames: string[]) {
        setUserSelectedTableName(tableNames[0] ?? null);
    }

    function handleSaturationAxisChange(saturationAxisName: string) {
        setUserSelectedSaturationAxisName(saturationAxisName);
    }

    function handleCurveNamesChange(curveNames: string[]) {
        setUserSelectedCurveNames(curveNames);
    }

    function handleSatnumsChange(satnums: number[]) {
        setUserSelectedSatnums(satnums);
        if (satnums.length > 1 && selectedGroupBy !== GroupBy.SATNUM) {
            setSelectedColorBy(ColorBy.SATNUM);
        }
    }
    const handleSatnumsChangeDebounced = useDebouncedFunction(handleSatnumsChange, SATNUM_QUERY_DEBOUNCE_MS);

    function handleColorByChange(colorBy: ColorBy | null) {
        if (colorBy === null) {
            return;
        }
        const shouldForceSatnumColor = selectedSatnums.length > 1 && selectedGroupBy !== GroupBy.SATNUM;
        setSelectedColorBy(shouldForceSatnumColor ? ColorBy.SATNUM : colorBy);
    }

    function handleGroupByChange(nextGroupBy: GroupBy | null) {
        if (nextGroupBy === null) {
            return;
        }
        setSelectedGroupBy(nextGroupBy);
        if (selectedSatnums.length > 1 && nextGroupBy !== GroupBy.SATNUM) {
            setSelectedColorBy(ColorBy.SATNUM);
        }
    }

    function handleStatisticsChange(statistics: string[]) {
        setSelectedStatistics(statistics as RelPermStatistic[]);
    }

    const tableNamesArePending = tableNameQueries.some((query) => query.isFetching);
    const tableNamesErrorMessage = tableNameQueries.every((query) => query.isError)
        ? "Could not load tables"
        : undefined;
    const loadedTableNameSets = tableNameQueries.flatMap((query) => (query.data ? [query.data] : []));
    const tableNameSetsDiffer =
        loadedTableNameSets.length > 1 &&
        loadedTableNameSets.some((tableNames) => !arraysHaveSameValues(tableNames, loadedTableNameSets[0]));
    const allTableNameQueriesLoaded =
        selectedEnsembleIdents.length > 0 && loadedTableNameSets.length === selectedEnsembleIdents.length;
    const commonTableNamesAreMissing = allTableNameQueriesLoaded && availableTableNames.length === 0;
    const showTableSelector = availableTableNames.length > 1 || commonTableNamesAreMissing;
    const showTableSetting = showTableSelector || Boolean(tableNamesErrorMessage);
    const tableNameAnnotations = [
        ...selectedTableNameAnnotations,
        commonTableNamesAreMissing && {
            type: "error" as const,
            message: "Selected ensembles have no common relperm table names.",
        },
        tableNameSetsDiffer &&
            !commonTableNamesAreMissing && {
                type: "warning" as const,
                message: "Selected ensembles have different relperm table names. Only common names are available.",
            },
    ].filter(Boolean) as SettingAnnotation[];
    const tableDefinitionsArePending = tableDefinitionQueries.some((query) => query.isFetching);
    const tableDefinitionsErrorMessage = tableDefinitionQueries.every((query) => query.isError)
        ? "Could not load table definitions"
        : undefined;

    for (const [index, query] of tableDefinitionQueries.entries()) {
        const tableDefinition = query.data;
        const ensembleIdent = selectedEnsembleIdents[index];
        if (!tableDefinition || !ensembleIdent) {
            continue;
        }

        const tableRealizations = new Set(tableDefinition.realizations);
        const missingRealizations = filterEnsembleRealizationsFunc(ensembleIdent).filter(
            function isMissingFromTable(realization) {
                return !tableRealizations.has(realization);
            },
        );
        if (missingRealizations.length === 0) {
            continue;
        }

        const ensembleName = ensembleSet.findEnsemble(ensembleIdent)?.getDisplayName() ?? ensembleIdent.toString();
        statusWriter.addWarning(
            `RelPerm table ${selectedTableName ?? ""} has no data for ${missingRealizations.length} filtered realizations in ${ensembleName}: ${formatRealizationList(missingRealizations)}.`,
        );
    }

    return (
        <Collapsible.ScrollArea>
            <SettingWrapper.Group>
                <SettingWrapper.Section title="Data" defaultOpen>
                    <SettingWrapper label="Ensembles" annotations={selectedEnsembleIdentsAnnotations} stacked>
                        <EnsemblePicker
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={selectedEnsembleIdents}
                            allowDeltaEnsembles={false}
                            ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                            onValueChange={handleEnsembleSelectionChange}
                        />
                    </SettingWrapper>
                    <Hidden hidden={!showTableSetting}>
                        <SettingWrapper
                            label="Table"
                            annotations={tableNameAnnotations}
                            overlay={
                                tableNamesArePending ? { type: "loading", message: "Loading vectors..." } : undefined
                            }
                        >
                            <Select
                                options={makeStringItems(availableTableNames)}
                                value={selectedTableName ? [selectedTableName] : []}
                                onValueChange={handleTableNameChange}
                                filter={availableTableNames.length > 6}
                                size={1}
                            />
                        </SettingWrapper>
                    </Hidden>
                </SettingWrapper.Section>
                <SettingWrapper.Section title="Selection">
                    <SettingWrapper label="Curve type">
                        <RadioCompositions.GroupWithLabels
                            options={makeEnumOptions(CURVE_TYPE_LABELS)}
                            value={selectedCurveType}
                            onValueChange={setSelectedCurveType}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Curves" annotations={selectedCurveNamesAnnotations}>
                        <Combobox
                            items={makeStringItems(availableCurveNames)}
                            value={selectedCurveNames}
                            onValueChange={handleCurveNamesChange}
                            placeholder="Select curves..."
                            multiple
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Saturation axis" annotations={selectedSaturationAxisNameAnnotations}>
                        <RadioCompositions.GroupWithLabels
                            options={makeStringItems(availableSaturationAxisNames)}
                            value={selectedSaturationAxisName}
                            onValueChange={handleSaturationAxisChange}
                            layout="horizontal"
                        />
                    </SettingWrapper>
                    <SettingWrapper label="SatNum" help={SATURATION_AXIS_HELP} annotations={selectedSatnumsAnnotations}>
                        <Combobox
                            items={makeNumberItems(availableSatnums)}
                            value={selectedSatnums}
                            onValueChange={handleSatnumsChangeDebounced}
                            placeholder="Select SATNUMs..."
                            multiple
                        />
                    </SettingWrapper>
                </SettingWrapper.Section>
                <SettingWrapper.Section title="Plot">
                    <SettingWrapper label="Display">
                        <div className="gap-vertical-xs flex flex-col">
                            <CheckboxCompositions.WithLabel
                                label="Individual realizations"
                                checked={showIndividualRealizations}
                                onCheckedChange={setShowIndividualRealizations}
                            />
                            <CheckboxCompositions.WithLabel
                                label="Statistic lines"
                                checked={showStatisticalLines}
                                onCheckedChange={setShowStatisticalLines}
                            />
                            <CheckboxCompositions.WithLabel
                                label="Statistic fan"
                                checked={showStatisticalFan}
                                onCheckedChange={setShowStatisticalFan}
                            />
                        </div>
                    </SettingWrapper>
                    <SettingWrapper label="Statistic lines">
                        <Combobox
                            items={makeEnumItems(REL_PERM_STATISTIC_LABELS)}
                            value={selectedStatistics}
                            onValueChange={handleStatisticsChange}
                            placeholder="Select statistics..."
                            multiple
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Color by">
                        <Combobox<ColorBy>
                            items={makeEnumItems(COLOR_BY_LABELS)}
                            value={selectedColorBy}
                            onValueChange={handleColorByChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Subplot by">
                        <Combobox<GroupBy>
                            items={makeEnumItems(GROUP_BY_LABELS)}
                            value={selectedGroupBy}
                            onValueChange={handleGroupByChange}
                        />
                    </SettingWrapper>
                    {selectedCurveType === CurveType.RELPERM && (
                        <SettingWrapper label="Y-axis">
                            <CheckboxCompositions.WithLabel
                                label="Logarithmic scale"
                                checked={selectedYAxisScale === YAxisScale.LOG}
                                onCheckedChange={(checked) => {
                                    setSelectedYAxisScale(checked ? YAxisScale.LOG : YAxisScale.LINEAR);
                                }}
                            />
                        </SettingWrapper>
                    )}
                </SettingWrapper.Section>
            </SettingWrapper.Group>
        </Collapsible.ScrollArea>
    );
}

function makeStringItems(values: string[]): SelectOption[] {
    return values.map(function makeStringOption(value) {
        return { label: value, value };
    });
}

function makeNumberItems(values: number[]): ComboboxItem<number>[] {
    return values.map(function makeNumberTagOption(value) {
        return { label: value.toString(), value };
    });
}

function makeEnumOptions<T extends string>(labels: Record<T, string>): SelectOption[] {
    return Object.entries(labels).map(function makeEnumOption([value, label]) {
        return { label: label as string, value };
    });
}

function makeEnumItems<T extends string>(labels: Record<T, string>): ComboboxItem<T>[] {
    return Object.entries(labels).map(function makeEnumItem([value, label]) {
        return { label: label as string, value: value as T };
    });
}

function formatRealizationList(realizations: number[]): string {
    const sortedRealizations = [...realizations].sort((left, right) => left - right);
    const visibleRealizations = sortedRealizations.slice(0, 20);
    const suffix = sortedRealizations.length > visibleRealizations.length ? ", ..." : "";

    return `${visibleRealizations.join(", ")}${suffix}`;
}
