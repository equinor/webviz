import type React from "react";

import { useAtom } from "jotai";

import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";
import type { StatisticKey } from "@modules/_shared/eCharts";
import { ALL_STATISTIC_KEYS, HistogramType } from "@modules/_shared/eCharts";

import { PlotType, PLOT_TYPE_LABELS } from "../typesAndEnums";

import {
    dataConfigAtom,
    histogramDisplayConfigAtom,
    layoutConfigAtom,
    pointsAndLabelsConfigAtom,
    timeseriesDisplayConfigAtom,
} from "./atoms/baseAtoms";

const plotTypeOptions = Object.values(PlotType).map((pt) => ({ value: pt, label: PLOT_TYPE_LABELS[pt] }));

const statisticOptions = ALL_STATISTIC_KEYS.map((k) => ({
    value: k,
    label: k.toUpperCase(),
}));

const histogramLayoutOptions = [
    { value: HistogramType.Overlay, label: "Overlay" },
    { value: HistogramType.Group, label: "Grouped" },
    { value: HistogramType.Stack, label: "Stacked" },
    { value: HistogramType.Relative, label: "Relative" },
];

export function Settings(): React.ReactNode {
    const [dataConfig, setDataConfig] = useAtom(dataConfigAtom);
    const [tsConfig, setTsConfig] = useAtom(timeseriesDisplayConfigAtom);
    const [histConfig, setHistConfig] = useAtom(histogramDisplayConfigAtom);
    const [plConfig, setPlConfig] = useAtom(pointsAndLabelsConfigAtom);
    const [layoutConfig, setLayoutConfig] = useAtom(layoutConfigAtom);

    const { plotType, numSubplots, numGroups, numRealizations } = dataConfig;

    const isTimeseries = plotType === PlotType.Timeseries;
    const isHistogram = plotType === PlotType.Histogram;
    const isPercentileRange = plotType === PlotType.PercentileRange;
    const supportsStatisticalMarkers = plotType === PlotType.Bar;
    const supportsBarLabels = plotType === PlotType.Bar;
    const supportsRealizationPoints = isHistogram || isPercentileRange || plotType === PlotType.Density;

    function handleStatToggle(key: StatisticKey, checked: boolean) {
        setTsConfig((prev) => ({
            ...prev,
            selectedStatistics: checked
                ? [...prev.selectedStatistics, key]
                : prev.selectedStatistics.filter((k) => k !== key),
        }));
    }

    return (
        <div className="flex flex-col gap-2 p-2">
            <CollapsibleGroup title="Plot type" expanded>
                <Label text="Chart type">
                    <Dropdown
                        options={plotTypeOptions}
                        value={plotType}
                        onChange={(v) => setDataConfig((prev) => ({ ...prev, plotType: v as PlotType }))}
                    />
                </Label>
            </CollapsibleGroup>

            <CollapsibleGroup title="Data" expanded>
                <Label text={`Subplots: ${numSubplots}`}>
                    <Slider
                        min={1}
                        max={20}
                        step={1}
                        value={numSubplots}
                        onChange={(_, v) => setDataConfig((prev) => ({ ...prev, numSubplots: v as number }))}
                    />
                </Label>
                <Label text={`Groups: ${numGroups}`}>
                    <Slider
                        min={1}
                        max={6}
                        step={1}
                        value={numGroups}
                        onChange={(_, v) => setDataConfig((prev) => ({ ...prev, numGroups: v as number }))}
                    />
                </Label>
                <Label text={`Realizations: ${numRealizations}`}>
                    <Slider
                        min={10}
                        max={200}
                        step={10}
                        value={numRealizations}
                        onChange={(_, v) => setDataConfig((prev) => ({ ...prev, numRealizations: v as number }))}
                    />
                </Label>
                {isHistogram && (
                    <Label text={`Bins: ${histConfig.histogramBins}`}>
                        <Slider
                            min={5}
                            max={40}
                            step={1}
                            value={histConfig.histogramBins}
                            onChange={(_, v) => setHistConfig((prev) => ({ ...prev, histogramBins: v as number }))}
                        />
                    </Label>
                )}
            </CollapsibleGroup>

            {isHistogram && (
                <CollapsibleGroup title="Histogram" expanded>
                    <Label text="Layout">
                        <Dropdown
                            options={histogramLayoutOptions}
                            value={histConfig.histogramType}
                            onChange={(v) => setHistConfig((prev) => ({ ...prev, histogramType: v as HistogramType }))}
                        />
                    </Label>
                </CollapsibleGroup>
            )}

            {isTimeseries && (
                <CollapsibleGroup title="Timeseries display" expanded>
                    <Checkbox
                        label="Show realizations"
                        checked={tsConfig.showRealizations}
                        onChange={(_, c) => setTsConfig((prev) => ({ ...prev, showRealizations: c }))}
                    />
                    <Checkbox
                        label="Show reference lines"
                        checked={tsConfig.showReferenceLines}
                        onChange={(_, c) => setTsConfig((prev) => ({ ...prev, showReferenceLines: c }))}
                    />
                    <Checkbox
                        label="Show point annotations"
                        checked={tsConfig.showPointAnnotations}
                        onChange={(_, c) => setTsConfig((prev) => ({ ...prev, showPointAnnotations: c }))}
                    />
                    <Checkbox
                        label="Show statistics"
                        checked={tsConfig.showStatistics}
                        onChange={(_, c) => setTsConfig((prev) => ({ ...prev, showStatistics: c }))}
                    />
                    <Checkbox
                        label="Show fanchart"
                        checked={tsConfig.showFanchart}
                        onChange={(_, c) => setTsConfig((prev) => ({ ...prev, showFanchart: c }))}
                        disabled={!tsConfig.showStatistics}
                    />
                    {tsConfig.showStatistics && (
                        <div className="ml-4 flex flex-col gap-1">
                            {statisticOptions.map((opt) => (
                                <Checkbox
                                    key={opt.value}
                                    label={opt.label}
                                    checked={tsConfig.selectedStatistics.includes(opt.value)}
                                    onChange={(_, c) => handleStatToggle(opt.value, c)}
                                />
                            ))}
                        </div>
                    )}
                </CollapsibleGroup>
            )}

            {(supportsStatisticalMarkers || supportsBarLabels || supportsRealizationPoints) && (
                <CollapsibleGroup title="Markers & points" expanded>
                    {supportsStatisticalMarkers && (
                        <Checkbox
                            label="Show statistical markers"
                            checked={plConfig.showStatisticalMarkers}
                            onChange={(_, c) => setPlConfig((prev) => ({ ...prev, showStatisticalMarkers: c }))}
                        />
                    )}
                    {supportsBarLabels && (
                        <Checkbox
                            label="Show bar labels"
                            checked={plConfig.showBarLabels}
                            onChange={(_, c) => setPlConfig((prev) => ({ ...prev, showBarLabels: c }))}
                        />
                    )}
                    {supportsRealizationPoints && (
                        <Checkbox
                            label="Show realization points"
                            checked={plConfig.showRealizationPoints}
                            onChange={(_, c) => setPlConfig((prev) => ({ ...prev, showRealizationPoints: c }))}
                        />
                    )}
                </CollapsibleGroup>
            )}

            <CollapsibleGroup title="Layout" expanded>
                <Checkbox
                    label="Shared X axis"
                    checked={layoutConfig.sharedXAxis}
                    onChange={(_, c) => setLayoutConfig((prev) => ({ ...prev, sharedXAxis: c }))}
                />
                <Checkbox
                    label="Shared Y axis"
                    checked={layoutConfig.sharedYAxis}
                    onChange={(_, c) => setLayoutConfig((prev) => ({ ...prev, sharedYAxis: c }))}
                />
                <Checkbox
                    label="Scroll mode (large charts)"
                    checked={layoutConfig.scrollMode}
                    onChange={(_, c) => setLayoutConfig((prev) => ({ ...prev, scrollMode: c }))}
                />
            </CollapsibleGroup>
        </div>
    );
}
