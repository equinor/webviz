import type React from "react";

import { useAtom, useAtomValue } from "jotai";

import type { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Banner } from "@lib/components/Banner";
import { Combobox } from "@lib/components/Combobox";
import type { ComboboxItem } from "@lib/components/Combobox/types";
import { Hidden } from "@lib/components/Hidden";
import { Setting } from "@lib/components/Setting";
import { Slider } from "@lib/components/Slider";
import { SwitchCompositions } from "@lib/components/Switch/compositions";
import { InplaceVolumesFilterComponent } from "@modules/_shared/components/InplaceVolumesFilterComponent";
import { HistogramType } from "@modules/_shared/histogram";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { createHoverTextForVolume } from "@modules/_shared/InplaceVolumes/volumeStringUtils";

import type { Interfaces } from "../interfaces";
import { PlotType, plotTypeToStringMapping, type InplaceVolumesPlotOptions } from "../typesAndEnums";
import { BarSortBy } from "../view/utils/plotly/bar";

import {
    plotOptionsAtom,
    selectedIndexValueCriteriaAtom,
    selectedPlotTypeAtom,
    showTableAtom,
} from "./atoms/baseAtoms";
import { tableDefinitionsAccessorAtom } from "./atoms/derivedAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./atoms/persistableFixableAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";
import { HistogramTypeInfoContent } from "./components/HistogramTypeInfoContent";
import { makeColorByOptions, makeSubplotByOptions } from "./utils/plotDimensionUtils";

const DEBOUNCE_TIME_MS = 1500;

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const tableDefinitionsQueryResult = useAtomValue(tableDefinitionsQueryAtom);
    const tableDefinitionsAccessor = useAtomValue(tableDefinitionsAccessorAtom);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(selectedEnsembleIdentsAtom);

    const [selectedTableNames, setSelectedTableNames] = useAtom(selectedTableNamesAtom);

    const [selectedSelectorColumn, setSelectedSelectorColumn] = useAtom(selectedSelectorColumnAtom);

    const [selectedIndicesWithValues, setSelectedIndicesWithValues] = useAtom(selectedIndicesWithValuesAtom);

    const [selectedFirstResultName, setSelectedFirstResultName] = useAtom(selectedResultNameAtom);
    const [selectedSubplotBy, setSelectedSubplotBy] = useAtom(selectedSubplotByAtom);

    const [selectedColorBy, setSelectedColorBy] = useAtom(selectedColorByAtom);

    const [selectedPlotType, setSelectedPlotType] = useAtom(selectedPlotTypeAtom);
    const [selectedIndexValueCriteria, setSelectedIndexValueCriteria] = useAtom(selectedIndexValueCriteriaAtom);
    const [plotOptions, setPlotOptions] = useAtom(plotOptionsAtom);
    const [showTable, setShowTable] = useAtom(showTableAtom);

    usePropagateAllApiErrorsToStatusWriter(tableDefinitionsQueryResult.errors, statusWriter);

    function handleFilterChange(newFilter: InplaceVolumesFilterSettings) {
        setSelectedEnsembleIdents(newFilter.ensembleIdents);
        setSelectedTableNames(newFilter.tableNames);
        setSelectedIndicesWithValues(newFilter.indicesWithValues);
        setSelectedIndexValueCriteria(
            newFilter.allowIndicesValuesIntersection
                ? IndexValueCriteria.ALLOW_INTERSECTION
                : IndexValueCriteria.REQUIRE_EQUALITY,
        );
    }

    const resultNameOptions: ComboboxItem<string>[] = tableDefinitionsAccessor
        .getResultNamesIntersection()
        .map((name) => {
            const isFaciesFractionWithoutFaciesIndex =
                name === "FACIES_FRACTION" &&
                !tableDefinitionsAccessor.getCommonIndicesWithValues().some((idx) => idx.indexColumn === "FACIES");
            return {
                label: name,
                value: name,
                hoverText: isFaciesFractionWithoutFaciesIndex
                    ? "FACIES_FRACTION requires a FACIES index column; not available for the selected table(s)."
                    : createHoverTextForVolume(name),
                disabled: isFaciesFractionWithoutFaciesIndex,
            };
        });

    // Create selector options
    const selectorOptions: ComboboxItem<string>[] = [
        ...tableDefinitionsAccessor.getCommonSelectorColumns().map((name) => ({ label: name, value: name })),
    ];

    const subplotOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames.value);
    const colorByOptions = makeColorByOptions(
        tableDefinitionsAccessor,
        selectedSubplotBy.value,
        selectedTableNames.value,
    );
    const plotTypeOptions: ComboboxItem<PlotType>[] = [];
    for (const [type, label] of Object.entries(plotTypeToStringMapping)) {
        plotTypeOptions.push({ label, value: type as PlotType });
    }

    const showFaciesFractionGroupingWarning =
        selectedFirstResultName.value === "FACIES_FRACTION" &&
        selectedSubplotBy.value !== "FACIES" &&
        selectedColorBy.value !== "FACIES";

    const selectedFirstResultNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedResultNameAtom);
    const selectedSelectorColumnAnnotations = useMakePersistableFixableAtomAnnotations(selectedSelectorColumnAtom);
    const selectedSubplotByAnnotations = useMakePersistableFixableAtomAnnotations(selectedSubplotByAtom);
    const selectedColorByAnnotations = useMakePersistableFixableAtomAnnotations(selectedColorByAtom);

    function handleOptionChange<K extends keyof InplaceVolumesPlotOptions>(key: K) {
        return (value: InplaceVolumesPlotOptions[K]) => setPlotOptions({ ...plotOptions, [key]: value });
    }

    const plotSettings = (
        <>
            <Setting.Section title="Data Visualization" defaultOpen>
                {showFaciesFractionGroupingWarning && (
                    <Banner tone="warning">
                        <strong>Note:</strong> FACIES_FRACTION is only meaningful when FACIES is used as Subplot by or
                        Color by; otherwise every fraction collapses to 1.
                    </Banner>
                )}
                <Setting.Field label="Response" annotations={selectedFirstResultNameAnnotations}>
                    <Combobox
                        value={selectedFirstResultName.value}
                        items={resultNameOptions}
                        onValueChange={setSelectedFirstResultName}
                    />
                </Setting.Field>

                <Setting.Field label="Subplot by" annotations={selectedSubplotByAnnotations}>
                    <Combobox
                        value={selectedSubplotBy.value}
                        items={subplotOptions}
                        onValueChange={(v) => v && setSelectedSubplotBy(v)}
                    />
                </Setting.Field>

                <Setting.Field label="Color by" annotations={selectedColorByAnnotations}>
                    <Combobox
                        value={selectedColorBy.value}
                        items={colorByOptions}
                        onValueChange={(v) => v && setSelectedColorBy(v)}
                    />
                </Setting.Field>

                <Setting.Field stacked>
                    <SwitchCompositions.WithLabel
                        label="Show statistics table below plot"
                        checked={showTable}
                        onCheckedChange={setShowTable}
                        size="small"
                    />
                </Setting.Field>
            </Setting.Section>

            <Setting.Section title="Plot Settings" defaultOpen>
                <Setting.Field label="Plot Type">
                    <Combobox
                        value={selectedPlotType}
                        items={plotTypeOptions}
                        onValueChange={(v) => v && setSelectedPlotType(v)}
                    />
                </Setting.Field>

                <Hidden hidden={selectedPlotType !== PlotType.HISTOGRAM}>
                    <Setting.Field
                        label="Histogram Type"
                        help={{ title: "Histogram Type", content: <HistogramTypeInfoContent /> }}
                    >
                        <Combobox
                            value={plotOptions.histogramType}
                            items={[
                                { label: "Stacked", value: HistogramType.Stack },
                                { label: "Grouped", value: HistogramType.Group },
                                { label: "Overlayed", value: HistogramType.Overlay },
                                { label: "Relative", value: HistogramType.Relative },
                            ]}
                            onValueChange={(v: HistogramType | null) => v && handleOptionChange("histogramType")(v)}
                        />
                    </Setting.Field>
                    <Setting.Field label="Max bins">
                        <Slider
                            value={plotOptions.histogramBins}
                            min={5}
                            step={1}
                            max={30}
                            markerLabels
                            markers={[10, 15, 20, 25]}
                            valueLabelDisplay="auto"
                            disabled={selectedPlotType !== PlotType.HISTOGRAM}
                            onValueChange={(v) => handleOptionChange("histogramBins")(v)}
                        />
                    </Setting.Field>
                </Hidden>
                <Hidden hidden={selectedPlotType !== PlotType.BAR}>
                    <Setting.Field label="Create bar for each" annotations={selectedSelectorColumnAnnotations}>
                        <Combobox
                            value={selectedSelectorColumn.value}
                            items={selectorOptions}
                            onValueChange={setSelectedSelectorColumn}
                            disabled={selectedPlotType !== PlotType.BAR}
                        />
                    </Setting.Field>
                    <Setting.Field label="Sort bars by">
                        <Combobox
                            value={plotOptions.barSortBy}
                            items={[
                                { label: "X values (Category)", value: BarSortBy.Xvalues },
                                { label: "Y values (Response)", value: BarSortBy.Yvalues },
                            ]}
                            onValueChange={(v) => v && handleOptionChange("barSortBy")(v)}
                        />
                    </Setting.Field>
                </Hidden>

                <Setting.Field stacked label="Visuals">
                    <SwitchCompositions.WithLabel
                        label="Hide plots where all values are equal"
                        checked={plotOptions.hideConstants}
                        onCheckedChange={handleOptionChange("hideConstants")}
                        size="small"
                    />
                    {[PlotType.HISTOGRAM, PlotType.BAR, PlotType.BOX, PlotType.DISTRIBUTION].includes(
                        selectedPlotType,
                    ) && (
                        <SwitchCompositions.WithLabel
                            label="Show statistical markers"
                            checked={plotOptions.showStatisticalMarkers}
                            onCheckedChange={handleOptionChange("showStatisticalMarkers")}
                            size="small"
                        />
                    )}
                    {[PlotType.HISTOGRAM, PlotType.DISTRIBUTION].includes(selectedPlotType) && (
                        <SwitchCompositions.WithLabel
                            label="Show statistical marker labels"
                            checked={plotOptions.showStatisticalLabels}
                            disabled={!plotOptions.showStatisticalMarkers}
                            size="small"
                            onCheckedChange={handleOptionChange("showStatisticalLabels")}
                        />
                    )}
                    {[PlotType.HISTOGRAM, PlotType.DISTRIBUTION, PlotType.BOX].includes(selectedPlotType) && (
                        <SwitchCompositions.WithLabel
                            label="Show realization points"
                            checked={plotOptions.showRealizationPoints}
                            onCheckedChange={handleOptionChange("showRealizationPoints")}
                            size="small"
                        />
                    )}
                    {selectedPlotType === PlotType.HISTOGRAM && (
                        <SwitchCompositions.WithLabel
                            label="Show percentage"
                            checked={plotOptions.showPercentageInHistogram}
                            onCheckedChange={handleOptionChange("showPercentageInHistogram")}
                            size="small"
                        />
                    )}
                </Setting.Field>

                <Setting.Field label="Axes" stacked>
                    <SwitchCompositions.WithLabel
                        label="Shared x axis"
                        checked={plotOptions.sharedXAxis}
                        onCheckedChange={handleOptionChange("sharedXAxis")}
                        size="small"
                    />
                    <SwitchCompositions.WithLabel
                        label="Shared y axis"
                        checked={plotOptions.sharedYAxis}
                        onCheckedChange={handleOptionChange("sharedYAxis")}
                        size="small"
                    />
                </Setting.Field>
            </Setting.Section>
        </>
    );

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <InplaceVolumesFilterComponent
                    debounceMs={DEBOUNCE_TIME_MS}
                    ensembleSet={ensembleSet}
                    settingsContext={props.settingsContext}
                    workbenchSession={props.workbenchSession}
                    workbenchServices={props.workbenchServices}
                    isPending={tableDefinitionsQueryResult.isLoading}
                    availableTableNames={tableDefinitionsAccessor.getTableNamesIntersection()}
                    availableIndicesWithValues={tableDefinitionsAccessor.getCommonIndicesWithValues()}
                    selectedEnsembleIdents={selectedEnsembleIdents.value}
                    selectedIndicesWithValues={selectedIndicesWithValues.value}
                    selectedTableNames={selectedTableNames.value}
                    selectedAllowIndicesValuesIntersection={
                        selectedIndexValueCriteria === IndexValueCriteria.ALLOW_INTERSECTION
                    }
                    additionalSettings={plotSettings}
                    areCurrentlySelectedTablesComparable={tableDefinitionsAccessor.getAreTablesComparable()}
                    onChange={handleFilterChange}
                />
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}
