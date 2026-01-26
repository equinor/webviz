import type React from "react";

import { useAtom, useAtomValue } from "jotai";

import type { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import type { InplaceVolumesFilterSettings } from "@framework/types/inplaceVolumesFilterSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { Slider } from "@lib/components/Slider";
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

    const resultNameOptions: DropdownOption<string>[] = tableDefinitionsAccessor
        .getResultNamesIntersection()
        .map((name) => ({ label: name, value: name, hoverText: createHoverTextForVolume(name) }));

    // Create selector options
    const selectorOptions: DropdownOption<string>[] = [
        ...tableDefinitionsAccessor.getCommonSelectorColumns().map((name) => ({ label: name, value: name })),
    ];

    const subplotOptions = makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames.value);
    const colorByOptions = makeColorByOptions(
        tableDefinitionsAccessor,
        selectedSubplotBy.value,
        selectedTableNames.value,
    );
    const plotTypeOptions: DropdownOption<PlotType>[] = [];
    for (const [type, label] of Object.entries(plotTypeToStringMapping)) {
        plotTypeOptions.push({ label, value: type as PlotType });
    }

    const selectedFirstResultNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedResultNameAtom);
    const selectedSelectorColumnAnnotations = useMakePersistableFixableAtomAnnotations(selectedSelectorColumnAtom);
    const selectedSubplotByAnnotations = useMakePersistableFixableAtomAnnotations(selectedSubplotByAtom);
    const selectedColorByAnnotations = useMakePersistableFixableAtomAnnotations(selectedColorByAtom);

    const handleOptionChange = <K extends keyof InplaceVolumesPlotOptions>(
        key: K,
        value: InplaceVolumesPlotOptions[K],
    ) => {
        setPlotOptions({
            ...plotOptions,
            [key]: value,
        });
    };

    // Individual handlers
    const handleHistogramTypeChange = (value: string | number) => {
        handleOptionChange("histogramType", value as HistogramType);
    };
    const handleHistogramBinsChange = (_: Event, value: number | number[]) => {
        if (Array.isArray(value)) {
            return;
        }
        handleOptionChange("histogramBins", value);
    };
    const handleBarSortByChange = (value: string | number) => {
        handleOptionChange("barSortBy", value as BarSortBy);
    };

    const handleSharedXAxisChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("sharedXAxis", checked);
    };

    const handleSharedYAxisChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("sharedYAxis", checked);
    };

    const handleShowStatisticalMarkersChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("showStatisticalMarkers", checked);
    };
    const handleShowRealizationPointsChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("showRealizationPoints", checked);
    };
    const handleHideConstantsChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("hideConstants", checked);
    };
    const handleShowPercentageInHistogramChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("showPercentageInHistogram", checked);
    };

    const plotSettings = (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Data selection" expanded>
                <SettingWrapper label="Response" annotations={selectedFirstResultNameAnnotations}>
                    <Dropdown
                        value={selectedFirstResultName.value}
                        options={resultNameOptions}
                        onChange={setSelectedFirstResultName}
                    />
                </SettingWrapper>

                <SettingWrapper label="Subplot by" annotations={selectedSubplotByAnnotations}>
                    <Dropdown
                        value={selectedSubplotBy.value}
                        options={subplotOptions}
                        onChange={setSelectedSubplotBy}
                    />
                </SettingWrapper>
                <SettingWrapper label="Color by" annotations={selectedColorByAnnotations}>
                    <Dropdown value={selectedColorBy.value} options={colorByOptions} onChange={setSelectedColorBy} />
                </SettingWrapper>
            </CollapsibleGroup>

            <CollapsibleGroup title="Plot settings" expanded>
                <div className="flex flex-col gap-2">
                    <SettingWrapper label="Plot Type">
                        <Dropdown value={selectedPlotType} options={plotTypeOptions} onChange={setSelectedPlotType} />
                    </SettingWrapper>

                    <Checkbox
                        label="Show statistics table below plot"
                        checked={showTable}
                        onChange={(_e, checked) => setShowTable(checked)}
                    />

                    <Checkbox
                        label="Hide plots where all values are equal"
                        checked={plotOptions.hideConstants}
                        onChange={handleHideConstantsChange}
                    />

                    <Checkbox
                        label="Shared X Axis"
                        checked={plotOptions.sharedXAxis}
                        onChange={handleSharedXAxisChange}
                    />
                    <Checkbox
                        label="Shared Y Axis"
                        checked={plotOptions.sharedYAxis}
                        onChange={handleSharedYAxisChange}
                    />

                    {selectedPlotType === PlotType.HISTOGRAM ||
                    selectedPlotType === PlotType.BAR ||
                    selectedPlotType === PlotType.BOX ? (
                        <Checkbox
                            label="Show Statistical Markers"
                            checked={plotOptions.showStatisticalMarkers}
                            onChange={handleShowStatisticalMarkersChange}
                        />
                    ) : null}
                    {selectedPlotType === PlotType.HISTOGRAM ||
                    selectedPlotType === PlotType.DISTRIBUTION ||
                    selectedPlotType === PlotType.BOX ? (
                        <Checkbox
                            label="Show Realization Points"
                            checked={plotOptions.showRealizationPoints}
                            onChange={handleShowRealizationPointsChange}
                        />
                    ) : null}
                    {selectedPlotType === PlotType.HISTOGRAM && (
                        <Checkbox
                            label="Show labels"
                            checked={plotOptions.showPercentageInHistogram}
                            onChange={handleShowPercentageInHistogramChange}
                            disabled={selectedPlotType !== PlotType.HISTOGRAM}
                        />
                    )}

                    {selectedPlotType === PlotType.HISTOGRAM && (
                        <div>
                            <div className="mb-2">
                                <SettingWrapper
                                    label="Histogram Type"
                                    help={{ title: "Histogram Type", content: <HistogramTypeInfoContent /> }}
                                >
                                    <Dropdown
                                        options={[
                                            { label: "Stacked", value: HistogramType.Stack },
                                            { label: "Grouped", value: HistogramType.Group },
                                            { label: "Overlayed", value: HistogramType.Overlay },
                                            { label: "Relative", value: HistogramType.Relative },
                                        ]}
                                        value={plotOptions.histogramType}
                                        onChange={handleHistogramTypeChange}
                                        disabled={selectedPlotType !== PlotType.HISTOGRAM}
                                    />
                                </SettingWrapper>
                            </div>
                            <div className="mb-2">
                                <SettingWrapper label="Max number of histogram bins">
                                    <Slider
                                        value={plotOptions.histogramBins}
                                        onChange={handleHistogramBinsChange}
                                        min={5}
                                        step={1}
                                        max={30}
                                        valueLabelDisplay="auto"
                                        disabled={selectedPlotType !== PlotType.HISTOGRAM}
                                    />
                                </SettingWrapper>
                            </div>
                        </div>
                    )}

                    {selectedPlotType === PlotType.BAR && (
                        <div>
                            <div className="mb-2">
                                <SettingWrapper
                                    label="Create bar for each"
                                    annotations={selectedSelectorColumnAnnotations}
                                >
                                    <Dropdown
                                        value={selectedSelectorColumn.value}
                                        options={selectorOptions}
                                        onChange={setSelectedSelectorColumn}
                                        disabled={selectedPlotType !== PlotType.BAR}
                                    />
                                </SettingWrapper>
                            </div>
                            <div className="mb-2">
                                <SettingWrapper label="Sort bars by">
                                    <Dropdown
                                        options={[
                                            { label: "X values (Category)", value: BarSortBy.Xvalues },
                                            { label: "Y values (Response)", value: BarSortBy.Yvalues },
                                        ]}
                                        value={plotOptions.barSortBy}
                                        onChange={handleBarSortByChange}
                                        disabled={selectedPlotType !== PlotType.BAR}
                                    />
                                </SettingWrapper>
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleGroup>
        </div>
    );

    return (
        <InplaceVolumesFilterComponent
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
            onChange={handleFilterChange}
            additionalSettings={plotSettings}
            areCurrentlySelectedTablesComparable={tableDefinitionsAccessor.getAreTablesComparable()}
            debounceMs={1500}
        />
    );
}
