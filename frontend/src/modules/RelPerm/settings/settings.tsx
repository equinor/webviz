import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown, type DropdownOption } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { SettingWrapper, type SettingAnnotation } from "@lib/components/SettingWrapper";
import { StatusWrapper } from "@lib/components/StatusWrapper";
import { TagPicker, type TagOption } from "@lib/components/TagPicker";
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

    function handleSaturationAxisChange(_: React.ChangeEvent<HTMLInputElement>, saturationAxisName: string) {
        setUserSelectedSaturationAxisName(saturationAxisName);
    }

    function handleCurveNamesChange(curveNames: string[]) {
        setUserSelectedCurveNames(curveNames);
    }

    function handleSatnumsChange(satnums: string[]) {
        const parsedSatnums = satnums.map((satnum) => parseInt(satnum));
        setUserSelectedSatnums(parsedSatnums);
        if (parsedSatnums.length > 1 && selectedGroupBy !== GroupBy.SATNUM) {
            setSelectedColorBy(ColorBy.SATNUM);
        }
    }

    function handleColorByChange(colorBy: ColorBy) {
        const shouldForceSatnumColor = selectedSatnums.length > 1 && selectedGroupBy !== GroupBy.SATNUM;
        setSelectedColorBy(shouldForceSatnumColor ? ColorBy.SATNUM : colorBy);
    }

    function handleGroupByChange(nextGroupBy: GroupBy) {
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
        <div className="flex flex-col gap-2">
            <CollapsibleGroup expanded={true} title="Data source" contentClassName="flex flex-col gap-2">
                <SettingWrapper label="Ensembles" annotations={selectedEnsembleIdentsAnnotations}>
                    <EnsemblePicker
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        value={selectedEnsembleIdents}
                        allowDeltaEnsembles={false}
                        ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                        onValueChange={handleEnsembleSelectionChange}
                    />
                </SettingWrapper>
                <StatusWrapper isPending={tableNamesArePending} errorMessage={tableNamesErrorMessage}>
                    {showTableSetting && (
                        <SettingWrapper label="Table" annotations={tableNameAnnotations}>
                            {showTableSelector ? (
                                <Select
                                    options={makeStringOptions(availableTableNames)}
                                    value={selectedTableName ? [selectedTableName] : []}
                                    onChange={handleTableNameChange}
                                    filter={availableTableNames.length > 6}
                                    size={1}
                                />
                            ) : (
                                <div className="h-9" />
                            )}
                        </SettingWrapper>
                    )}
                </StatusWrapper>
            </CollapsibleGroup>
            <StatusWrapper isPending={tableDefinitionsArePending} errorMessage={tableDefinitionsErrorMessage}>
                <CollapsibleGroup expanded={true} title="Curve selection" contentClassName="flex flex-col gap-2">
                    <SettingWrapper label="Curve type">
                        <RadioGroup
                            options={makeEnumOptions(CURVE_TYPE_LABELS)}
                            value={selectedCurveType}
                            onChange={(_, value) => setSelectedCurveType(value as CurveType)}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Curves" annotations={selectedCurveNamesAnnotations}>
                        <TagPicker
                            tagOptions={makeStringTagOptions(availableCurveNames)}
                            selection={selectedCurveNames}
                            onChange={handleCurveNamesChange}
                            placeholder="Select curves..."
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Saturation axis" annotations={selectedSaturationAxisNameAnnotations}>
                        <RadioGroup
                            options={makeStringOptions(availableSaturationAxisNames)}
                            value={selectedSaturationAxisName ?? ""}
                            onChange={handleSaturationAxisChange}
                            direction="horizontal"
                        />
                    </SettingWrapper>
                    <SettingWrapper label="SATNUM" help={SATURATION_AXIS_HELP} annotations={selectedSatnumsAnnotations}>
                        <TagPicker
                            tagOptions={makeNumberTagOptions(availableSatnums)}
                            selection={selectedSatnums.map((satnum) => satnum.toString())}
                            onChange={handleSatnumsChange}
                            debounceTimeMs={SATNUM_QUERY_DEBOUNCE_MS}
                            placeholder="Select SATNUMs..."
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
                        </div>
                    </SettingWrapper>
                    <SettingWrapper label="Statistic lines">
                        <TagPicker
                            tagOptions={makeEnumOptions(REL_PERM_STATISTIC_LABELS)}
                            selection={selectedStatistics}
                            onChange={handleStatisticsChange}
                            placeholder="Select statistics..."
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Color by">
                        <Dropdown<ColorBy>
                            options={makeEnumDropdownOptions(COLOR_BY_LABELS)}
                            value={selectedColorBy}
                            onChange={handleColorByChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Subplot by">
                        <Dropdown<GroupBy>
                            options={makeEnumDropdownOptions(GROUP_BY_LABELS)}
                            value={selectedGroupBy}
                            onChange={handleGroupByChange}
                        />
                    </SettingWrapper>
                    {selectedCurveType === CurveType.RELPERM && (
                        <SettingWrapper label="Y-axis">
                            <Checkbox
                                label="Logarithmic scale"
                                checked={selectedYAxisScale === YAxisScale.LOG}
                                onChange={(_, checked) =>
                                    setSelectedYAxisScale(checked ? YAxisScale.LOG : YAxisScale.LINEAR)
                                }
                            />
                        </SettingWrapper>
                    )}
                </CollapsibleGroup>
            </StatusWrapper>
        </div>
    );
}

function makeStringOptions(values: string[]): SelectOption[] {
    return values.map(function makeStringOption(value) {
        return { label: value, value };
    });
}

function makeNumberTagOptions(values: number[]): TagOption[] {
    return values.map(function makeNumberTagOption(value) {
        return { label: value.toString(), value: value.toString() };
    });
}

function makeStringTagOptions(values: string[]): TagOption[] {
    return values.map(function makeStringTagOption(value) {
        return { label: value, value };
    });
}

function makeEnumOptions<T extends string>(labels: Record<T, string>): SelectOption[] {
    return Object.entries(labels).map(function makeEnumOption([value, label]) {
        return { label: label as string, value };
    });
}

function makeEnumDropdownOptions<T extends string>(labels: Record<T, string>): DropdownOption<T>[] {
    return Object.entries(labels).map(function makeEnumDropdownOption([value, label]) {
        return { label: label as string, value: value as T };
    });
}

function formatRealizationList(realizations: number[]): string {
    const sortedRealizations = [...realizations].sort((left, right) => left - right);
    const visibleRealizations = sortedRealizations.slice(0, 20);
    const suffix = sortedRealizations.length > visibleRealizations.length ? ", ..." : "";

    return `${visibleRealizations.join(", ")}${suffix}`;
}
