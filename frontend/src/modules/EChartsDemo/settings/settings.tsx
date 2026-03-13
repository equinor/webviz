import type React from "react";

import { useAtom } from "jotai";

import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";
import type { StatisticKey } from "@modules/_shared/eCharts";
import { ALL_STATISTIC_KEYS } from "@modules/_shared/eCharts";
import { HistogramType } from "@modules/_shared/histogram";

import { PlotType, PLOT_TYPE_LABELS } from "../typesAndEnums";

import {
    histogramBinsAtom,
    histogramTypeAtom,
    numGroupsAtom,
    numRealizationsAtom,
    numSubplotsAtom,
    plotTypeAtom,
    scrollModeAtom,
    selectedStatisticsAtom,
    sharedXAxisAtom,
    sharedYAxisAtom,
    showFanchartAtom,
    showRealizationPointsAtom,
    showRealizationsAtom,
    showStatisticalMarkersAtom,
    showStatisticsAtom,
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
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [numSubplots, setNumSubplots] = useAtom(numSubplotsAtom);
    const [numGroups, setNumGroups] = useAtom(numGroupsAtom);
    const [numRealizations, setNumRealizations] = useAtom(numRealizationsAtom);
    const [showRealizations, setShowRealizations] = useAtom(showRealizationsAtom);
    const [showStatistics, setShowStatistics] = useAtom(showStatisticsAtom);
    const [showFanchart, setShowFanchart] = useAtom(showFanchartAtom);
    const [selectedStatistics, setSelectedStatistics] = useAtom(selectedStatisticsAtom);
    const [showStatisticalMarkers, setShowStatisticalMarkers] = useAtom(showStatisticalMarkersAtom);
    const [showRealizationPoints, setShowRealizationPoints] = useAtom(showRealizationPointsAtom);
    const [histogramBins, setHistogramBins] = useAtom(histogramBinsAtom);
    const [histogramType, setHistogramType] = useAtom(histogramTypeAtom);
    const [sharedXAxis, setSharedXAxis] = useAtom(sharedXAxisAtom);
    const [sharedYAxis, setSharedYAxis] = useAtom(sharedYAxisAtom);
    const [scrollMode, setScrollMode] = useAtom(scrollModeAtom);

    const isTimeseries = plotType === PlotType.Timeseries;
    const isHistogram = plotType === PlotType.Histogram;
    const isPercentileRange = plotType === PlotType.PercentileRange;
    const supportsStatisticalMarkers = plotType === PlotType.Histogram || plotType === PlotType.Bar;
    const supportsRealizationPoints = isHistogram || isPercentileRange || plotType === PlotType.Distribution;

    function handleStatToggle(key: StatisticKey, checked: boolean) {
        if (checked) {
            setSelectedStatistics([...selectedStatistics, key]);
        } else {
            setSelectedStatistics(selectedStatistics.filter((k) => k !== key));
        }
    }

    return (
        <div className="flex flex-col gap-2 p-2">
            <CollapsibleGroup title="Plot type" expanded>
                <Label text="Chart type">
                    <Dropdown options={plotTypeOptions} value={plotType} onChange={(v) => setPlotType(v as PlotType)} />
                </Label>
            </CollapsibleGroup>

            <CollapsibleGroup title="Data" expanded>
                <Label text={`Subplots: ${numSubplots}`}>
                    <Slider
                        min={1}
                        max={9}
                        step={1}
                        value={numSubplots}
                        onChange={(_, v) => setNumSubplots(v as number)}
                    />
                </Label>
                <Label text={`Groups: ${numGroups}`}>
                    <Slider min={1} max={6} step={1} value={numGroups} onChange={(_, v) => setNumGroups(v as number)} />
                </Label>
                <Label text={`Realizations: ${numRealizations}`}>
                    <Slider
                        min={10}
                        max={200}
                        step={10}
                        value={numRealizations}
                        onChange={(_, v) => setNumRealizations(v as number)}
                    />
                </Label>
                {isHistogram && (
                    <Label text={`Bins: ${histogramBins}`}>
                        <Slider
                            min={5}
                            max={40}
                            step={1}
                            value={histogramBins}
                            onChange={(_, v) => setHistogramBins(v as number)}
                        />
                    </Label>
                )}
            </CollapsibleGroup>

            {isHistogram && (
                <CollapsibleGroup title="Histogram" expanded>
                    <Label text="Layout">
                        <Dropdown
                            options={histogramLayoutOptions}
                            value={histogramType}
                            onChange={(v) => setHistogramType(v as HistogramType)}
                        />
                    </Label>
                </CollapsibleGroup>
            )}

            {isTimeseries && (
                <CollapsibleGroup title="Timeseries display" expanded>
                    <Checkbox
                        label="Show realizations"
                        checked={showRealizations}
                        onChange={(_, c) => setShowRealizations(c)}
                    />
                    <Checkbox
                        label="Show statistics"
                        checked={showStatistics}
                        onChange={(_, c) => setShowStatistics(c)}
                    />
                    <Checkbox
                        label="Show fanchart"
                        checked={showFanchart}
                        onChange={(_, c) => setShowFanchart(c)}
                        disabled={!showStatistics}
                    />
                    {showStatistics && (
                        <div className="ml-4 flex flex-col gap-1">
                            {statisticOptions.map((opt) => (
                                <Checkbox
                                    key={opt.value}
                                    label={opt.label}
                                    checked={selectedStatistics.includes(opt.value)}
                                    onChange={(_, c) => handleStatToggle(opt.value, c)}
                                />
                            ))}
                        </div>
                    )}
                </CollapsibleGroup>
            )}

            {(supportsStatisticalMarkers || supportsRealizationPoints) && (
                <CollapsibleGroup title="Markers & points" expanded>
                    {supportsStatisticalMarkers && (
                        <Checkbox
                            label="Show statistical markers"
                            checked={showStatisticalMarkers}
                            onChange={(_, c) => setShowStatisticalMarkers(c)}
                        />
                    )}
                    {supportsRealizationPoints && (
                        <Checkbox
                            label="Show realization points"
                            checked={showRealizationPoints}
                            onChange={(_, c) => setShowRealizationPoints(c)}
                        />
                    )}
                </CollapsibleGroup>
            )}

            <CollapsibleGroup title="Layout" expanded>
                <Checkbox label="Shared X axis" checked={sharedXAxis} onChange={(_, c) => setSharedXAxis(c)} />
                <Checkbox label="Shared Y axis" checked={sharedYAxis} onChange={(_, c) => setSharedYAxis(c)} />
                <Checkbox
                    label="Scroll mode (large charts)"
                    checked={scrollMode}
                    onChange={(_, c) => setScrollMode(c)}
                />
            </CollapsibleGroup>
        </div>
    );
}
