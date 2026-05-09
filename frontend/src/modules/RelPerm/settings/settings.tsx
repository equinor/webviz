import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { TagPicker, type TagOption } from "@lib/components/TagPicker";

import type { Interfaces } from "../interfaces";
import { ColorBy, CurveType, GroupBy, RelPermMetric, VisualizationType, YAxisScale } from "../typesAndEnums";

import {
    selectedColorByAtom,
    selectedCurveTypeAtom,
    selectedGroupByAtom,
    selectedMetricAtom,
    selectedVisualizationTypeAtom,
    selectedYAxisScaleAtom,
    userSelectedCurveNamesAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedSaturationAxisNameAtom,
    userSelectedSatnumsAtom,
    userSelectedTableNameAtom,
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
import { relPermTableDefinitionQueriesAtom, relPermTableNamesQueriesAtom } from "./atoms/queryAtoms";

const CURVE_TYPE_LABELS: Record<CurveType, string> = {
    [CurveType.RELPERM]: "Relative permeability",
    [CurveType.CAPILLARY_PRESSURE]: "Capillary pressure",
};

const VISUALIZATION_TYPE_LABELS: Record<VisualizationType, string> = {
    [VisualizationType.INDIVIDUAL_REALIZATIONS]: "Individual realizations",
    [VisualizationType.STATISTICAL_FANCHART]: "Statistical fanchart",
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

const METRIC_LABELS: Record<RelPermMetric, string> = {
    [RelPermMetric.ENDPOINT_MAX]: "Endpoint max",
    [RelPermMetric.ENDPOINT_MIN]: "Endpoint min",
    [RelPermMetric.AREA_UNDER_CURVE]: "Area under curve",
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

const METRIC_HELP = {
    title: "Data channel metric",
    content: (
        <div className="flex flex-col gap-2">
            <p>
                The selected metric is used when publishing RelPerm data channels. It produces one value per realization
                for each ensemble, curve, and SATNUM combination.
            </p>
            <p>Area under curve is calculated from the selected saturation axis using trapezoidal integration.</p>
        </div>
    ),
};

function arraysHaveSameValues(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
        return false;
    }

    const sortedLeft = [...left].sort();
    const sortedRight = [...right].sort();
    return sortedLeft.every((value, index) => value === sortedRight[index]);
}

export function Settings({ workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setUserSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);
    const setValidRealizationNumbers = useSetAtom(validRealizationNumbersAtom);

    const [selectedCurveType, setSelectedCurveType] = useAtom(selectedCurveTypeAtom);
    const [selectedVisualizationType, setSelectedVisualizationType] = useAtom(selectedVisualizationTypeAtom);
    const [selectedColorBy, setSelectedColorBy] = useAtom(selectedColorByAtom);
    const [selectedGroupBy, setSelectedGroupBy] = useAtom(selectedGroupByAtom);
    const [selectedYAxisScale, setSelectedYAxisScale] = useAtom(selectedYAxisScaleAtom);
    const [selectedMetric, setSelectedMetric] = useAtom(selectedMetricAtom);

    const tableNameQueries = useAtomValue(relPermTableNamesQueriesAtom);
    const tableDefinitionQueries = useAtomValue(relPermTableDefinitionQueriesAtom);

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

    function handleColorByChange(_: React.ChangeEvent<HTMLInputElement>, colorBy: string) {
        const shouldForceSatnumColor = selectedSatnums.length > 1 && selectedGroupBy !== GroupBy.SATNUM;
        setSelectedColorBy(shouldForceSatnumColor ? ColorBy.SATNUM : (colorBy as ColorBy));
    }

    function handleGroupByChange(_: React.ChangeEvent<HTMLInputElement>, groupBy: string) {
        const nextGroupBy = groupBy as GroupBy;
        setSelectedGroupBy(nextGroupBy);
        if (selectedSatnums.length > 1 && nextGroupBy !== GroupBy.SATNUM) {
            setSelectedColorBy(ColorBy.SATNUM);
        }
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
    const tableDefinitionsArePending = tableDefinitionQueries.some((query) => query.isFetching);
    const tableDefinitionsErrorMessage = tableDefinitionQueries.every((query) => query.isError)
        ? "Could not load table definitions"
        : undefined;

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup expanded={true} title="Data source" contentClassName="flex flex-col gap-2">
                <SettingWrapper label="Ensembles">
                    <EnsemblePicker
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        value={selectedEnsembleIdents}
                        allowDeltaEnsembles={false}
                        ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                        onChange={handleEnsembleSelectionChange}
                    />
                </SettingWrapper>
                <PendingWrapper isPending={tableNamesArePending} errorMessage={tableNamesErrorMessage}>
                    {showTableSelector && (
                        <SettingWrapper
                            label="Table"
                            errorAnnotation={
                                commonTableNamesAreMissing
                                    ? "Selected ensembles have no common relperm table names."
                                    : undefined
                            }
                            warningAnnotation={
                                tableNameSetsDiffer && !commonTableNamesAreMissing
                                    ? "Selected ensembles have different relperm table names. Only common names are available."
                                    : undefined
                            }
                        >
                            <Select
                                options={makeStringOptions(availableTableNames)}
                                value={selectedTableName ? [selectedTableName] : []}
                                onChange={handleTableNameChange}
                                filter={availableTableNames.length > 6}
                                size={1}
                            />
                        </SettingWrapper>
                    )}
                </PendingWrapper>
            </CollapsibleGroup>
            <PendingWrapper isPending={tableDefinitionsArePending} errorMessage={tableDefinitionsErrorMessage}>
                <CollapsibleGroup expanded={true} title="Curve selection" contentClassName="flex flex-col gap-2">
                    <SettingWrapper label="Curve type">
                        <RadioGroup
                            options={makeEnumOptions(CURVE_TYPE_LABELS)}
                            value={selectedCurveType}
                            onChange={(_, value) => setSelectedCurveType(value as CurveType)}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Curves">
                        <TagPicker
                            tagOptions={makeStringTagOptions(availableCurveNames)}
                            selection={selectedCurveNames}
                            onChange={handleCurveNamesChange}
                            placeholder="Select curves..."
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Saturation axis">
                        <RadioGroup
                            options={makeStringOptions(availableSaturationAxisNames)}
                            value={selectedSaturationAxisName ?? ""}
                            onChange={handleSaturationAxisChange}
                            direction="horizontal"
                        />
                    </SettingWrapper>
                    <SettingWrapper label="SATNUM" help={SATURATION_AXIS_HELP}>
                        <TagPicker
                            tagOptions={makeNumberTagOptions(availableSatnums)}
                            selection={selectedSatnums.map((satnum) => satnum.toString())}
                            onChange={handleSatnumsChange}
                            placeholder="Select SATNUMs..."
                        />
                    </SettingWrapper>
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Plot" contentClassName="flex flex-col gap-2">
                    <SettingWrapper label="Visualization">
                        <RadioGroup
                            options={makeEnumOptions(VISUALIZATION_TYPE_LABELS)}
                            value={selectedVisualizationType}
                            onChange={(_, value) => setSelectedVisualizationType(value as VisualizationType)}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Color by">
                        <RadioGroup
                            options={makeEnumOptions(COLOR_BY_LABELS)}
                            value={selectedColorBy}
                            onChange={handleColorByChange}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Subplot by">
                        <RadioGroup
                            options={makeEnumOptions(GROUP_BY_LABELS)}
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
                <CollapsibleGroup expanded={true} title="Data channel metric" contentClassName="flex flex-col gap-2">
                    <SettingWrapper label="Data channel metric" help={METRIC_HELP}>
                        <RadioGroup
                            options={makeEnumOptions(METRIC_LABELS)}
                            value={selectedMetric}
                            onChange={(_, value) => setSelectedMetric(value as RelPermMetric)}
                        />
                    </SettingWrapper>
                </CollapsibleGroup>
            </PendingWrapper>
        </div>
    );
}

function makeStringOptions(values: string[]): SelectOption[] {
    return values.map((value) => ({ label: value, value }));
}

function makeNumberTagOptions(values: number[]): TagOption[] {
    return values.map((value) => ({ label: value.toString(), value: value.toString() }));
}

function makeStringTagOptions(values: string[]): TagOption[] {
    return values.map((value) => ({ label: value, value }));
}

function makeEnumOptions<T extends string>(labels: Record<T, string>): SelectOption[] {
    return Object.entries(labels).map(([value, label]) => ({ label: label as string, value }));
}
