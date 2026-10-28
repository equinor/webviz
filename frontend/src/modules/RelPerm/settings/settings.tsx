import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { CheckboxCompositions } from "@lib/components/Checkbox/compositions";
import { Combobox } from "@lib/components/Combobox";
import type { ComboboxItem } from "@lib/components/Combobox/types";
import { RadioCompositions } from "@lib/components/Radio/compositions";
import type { SelectOption } from "@lib/components/Select";
import { Setting } from "@lib/components/Setting";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";

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
} from "./atoms/derivedAtoms";
import {
    selectedCurveNamesAtom,
    selectedEnsembleIdentsAtom,
    selectedSaturationAxisNameAtom,
    selectedSatnumsAtom,
    selectedTableNameAtom,
} from "./atoms/persistableFixableAtoms";
import { relPermTableNamesQueriesAtom } from "./atoms/queryAtoms";
import {
    useSelectedCurveNamesAnnotations,
    useSelectedEnsembleIdentsAnnotations,
    useSelectedSaturationAxisNameAnnotations,
    useSelectedSatnumsAnnotations,
    useSelectedTableNameAnnotations,
} from "./hooks/settingAnnotationHooks";
import { useEnsemblesWarningMessage } from "./hooks/useEnsemblesWarningMessage";
import { useMakeSettingsStatusWriterMessages } from "./hooks/useMakeSettingsStatusWriterMessages";

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
        <div className="gap-3xs flex flex-col">
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

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom).value;
    const setSelectedEnsembleIdents = useSetAtom(selectedEnsembleIdentsAtom);
    const setValidRealizationNumbers = useSetAtom(validRealizationNumbersAtom);

    const [selectedCurveType, setSelectedCurveType] = useAtom(selectedCurveTypeAtom);
    const [showIndividualRealizations, setShowIndividualRealizations] = useAtom(showIndividualRealizationsAtom);
    const [showStatisticalLines, setShowStatisticalLines] = useAtom(showStatisticalLinesAtom);
    const [showStatisticalFan, setShowStatisticalFan] = useAtom(showStatisticalFanAtom);
    const [selectedStatistics, setSelectedStatistics] = useAtom(selectedStatisticsAtom);
    const [selectedColorBy, setSelectedColorBy] = useAtom(selectedColorByAtom);
    const [selectedGroupBy, setSelectedGroupBy] = useAtom(selectedGroupByAtom);
    const [selectedYAxisScale, setSelectedYAxisScale] = useAtom(selectedYAxisScaleAtom);

    const selectedEnsembleIdentsAnnotations = useSelectedEnsembleIdentsAnnotations();
    const selectedTableNameAnnotations = useSelectedTableNameAnnotations();
    const selectedSaturationAxisNameAnnotations = useSelectedSaturationAxisNameAnnotations();
    const selectedCurveNamesAnnotations = useSelectedCurveNamesAnnotations();
    const selectedSatnumsAnnotations = useSelectedSatnumsAnnotations();
    const { handlePanelAnnotationsChange } = useMakeSettingsStatusWriterMessages(
        statusWriter,
        ensembleSet,
        filterEnsembleRealizationsFunc,
    );

    const tableNameQueries = useAtomValue(relPermTableNamesQueriesAtom);

    const ensemblesWarningMessage = useEnsemblesWarningMessage(ensembleSet);

    const availableTableNames = useAtomValue(availableTableNamesAtom);
    const selectedTableName = useAtomValue(selectedTableNameAtom).value;
    const setSelectedTableName = useSetAtom(selectedTableNameAtom);

    const availableSaturationAxisNames = useAtomValue(availableSaturationAxisNamesAtom);
    const selectedSaturationAxisName = useAtomValue(selectedSaturationAxisNameAtom).value;
    const setSelectedSaturationAxisName = useSetAtom(selectedSaturationAxisNameAtom);

    const availableCurveNames = useAtomValue(availableCurveNamesAtom);
    const selectedCurveNames = useAtomValue(selectedCurveNamesAtom).value;
    const setSelectedCurveNames = useSetAtom(selectedCurveNamesAtom);

    const availableSatnums = useAtomValue(availableSatnumsAtom);
    const selectedSatnums = useAtomValue(selectedSatnumsAtom).value;
    const setSelectedSatnums = useSetAtom(selectedSatnumsAtom);

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
        setSelectedEnsembleIdents(ensembleIdents);
    }

    function handleTableNameChange(tableName: string | null) {
        setSelectedTableName(tableName);
    }

    function handleSaturationAxisChange(saturationAxisName: string) {
        setSelectedSaturationAxisName(saturationAxisName);
    }

    function handleCurveNamesChange(curveNames: string[]) {
        // Curves kept from another curve type or saturation axis are still shown as chips. When the user changes the
        // selection, they are dropped rather than carried along with the new curves.
        setSelectedCurveNames(curveNames.filter((curveName) => availableCurveNames.includes(curveName)));
    }

    function handleSatnumsChange(newSatnums: number[]) {
        // As for the curves, retained SATNUMs that are no longer available are dropped when the user changes the selection
        const satnums = newSatnums.filter((satnum) => availableSatnums.includes(satnum));
        setSelectedSatnums(satnums);
        if (satnums.length > 1 && selectedGroupBy !== GroupBy.SATNUM) {
            setSelectedColorBy(ColorBy.SATNUM);
        }
    }
    const [immediateSatnums, setImmediateSatnums] = useDebouncedOnChange(
        selectedSatnums,
        handleSatnumsChange,
        SATNUM_QUERY_DEBOUNCE_MS,
    );

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

    return (
        <Setting.ScrollArea>
            <Setting.Panel onAnnotationsChange={handlePanelAnnotationsChange}>
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
                    {ensemblesWarningMessage && (
                        <Setting.Banner type="warning" title={ensemblesWarningMessage} report />
                    )}
                    <Setting.Field
                        label="Table"
                        annotations={selectedTableNameAnnotations}
                        overlay={
                            tableNamesArePending
                                ? { type: "loading", message: "Loading tables..." }
                                : tableNameQueries.length > 0 && tableNamesErrorMessage
                                  ? { type: "error", message: tableNamesErrorMessage }
                                  : undefined
                        }
                    >
                        <Combobox
                            items={makeStringItems(availableTableNames)}
                            value={selectedTableName}
                            onValueChange={handleTableNameChange}
                            placeholder="Select table..."
                        />
                    </Setting.Field>
                </Setting.Section>
                <Setting.Section title="Selection">
                    <Setting.Field label="Curve type">
                        <RadioCompositions.GroupWithLabels
                            options={makeEnumOptions(CURVE_TYPE_LABELS)}
                            value={selectedCurveType}
                            onValueChange={setSelectedCurveType}
                        />
                    </Setting.Field>
                    <Setting.Field label="Curves" annotations={selectedCurveNamesAnnotations}>
                        <Combobox
                            items={makeStringItems(availableCurveNames)}
                            value={selectedCurveNames}
                            onValueChange={handleCurveNamesChange}
                            placeholder="Select curves..."
                            multiple
                        />
                    </Setting.Field>
                    <Setting.Field label="Saturation axis" annotations={selectedSaturationAxisNameAnnotations}>
                        <RadioCompositions.GroupWithLabels
                            options={makeStringItems(availableSaturationAxisNames)}
                            value={selectedSaturationAxisName}
                            onValueChange={handleSaturationAxisChange}
                            layout="horizontal"
                        />
                    </Setting.Field>
                    <Setting.Field label="SatNum" help={SATURATION_AXIS_HELP} annotations={selectedSatnumsAnnotations}>
                        <Combobox
                            items={makeNumberItems(availableSatnums)}
                            value={immediateSatnums}
                            onValueChange={setImmediateSatnums}
                            placeholder="Select SATNUMs..."
                            multiple
                        />
                    </Setting.Field>
                </Setting.Section>
                <Setting.Section title="Plot">
                    <Setting.Field label="Display">
                        <div className="gap-y-xs flex flex-col">
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
                    </Setting.Field>
                    <Setting.Field label="Statistic lines">
                        <Combobox
                            items={makeEnumItems(REL_PERM_STATISTIC_LABELS)}
                            value={selectedStatistics}
                            onValueChange={handleStatisticsChange}
                            placeholder="Select statistics..."
                            multiple
                        />
                    </Setting.Field>
                    <Setting.Field label="Color by">
                        <Combobox<ColorBy>
                            items={makeEnumItems(COLOR_BY_LABELS)}
                            value={selectedColorBy}
                            onValueChange={handleColorByChange}
                        />
                    </Setting.Field>
                    <Setting.Field label="Subplot by">
                        <Combobox<GroupBy>
                            items={makeEnumItems(GROUP_BY_LABELS)}
                            value={selectedGroupBy}
                            onValueChange={handleGroupByChange}
                        />
                    </Setting.Field>
                    {selectedCurveType === CurveType.RELPERM && (
                        <Setting.Field label="Y-axis">
                            <CheckboxCompositions.WithLabel
                                label="Logarithmic scale"
                                checked={selectedYAxisScale === YAxisScale.LOG}
                                onCheckedChange={(checked) => {
                                    setSelectedYAxisScale(checked ? YAxisScale.LOG : YAxisScale.LINEAR);
                                }}
                            />
                        </Setting.Field>
                    )}
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
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
