import type React from "react";

import { Checkbox } from "@lib/components/Checkbox";
import { Dropdown, type DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";
import { plotTypeToStringMapping, type PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";
import { BarSortBy } from "@modules/InplaceVolumesPlot/view/utils/plotly/bar";

export enum HistogramType {
    Stack = "stack",
    Group = "group",
    Overlay = "overlay",
    Relative = "relative",
}

export type InplaceVolumesPlotOptions = {
    histogramType: HistogramType; // For histogram plots
    histogramBins: number;
    barSortBy: BarSortBy; // How to sort the bars in a bar plot,
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
    sharedXAxis: boolean;
    sharedYAxis: boolean;
    hideConstants: boolean;
};
export type InplaceVolumesPlotOptionsDialogProps = {
    plotType: PlotType;
    options: InplaceVolumesPlotOptions;
    onPlotTypeChange: (plotType: PlotType) => void;
    onOptionsChange: (options: InplaceVolumesPlotOptions) => void;
};
export function InplaceVolumesPlotOptionsDialogPreview({ value }: { value: PlotType }) {
    return <div className="rounded-sm  ">Plot type: {value}</div>;
}
export function InplaceVolumesPlotOptionsDialog({
    plotType,
    onPlotTypeChange,
    options,
    onOptionsChange,
}: InplaceVolumesPlotOptionsDialogProps): React.ReactElement | null {
    // Shared onChange handler for options
    const handleOptionChange = <K extends keyof InplaceVolumesPlotOptions>(
        key: K,
        value: InplaceVolumesPlotOptions[K],
    ) => {
        onOptionsChange({
            ...options,
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
    const plotTypeOptions: DropdownOption<PlotType>[] = [];
    for (const [type, label] of Object.entries(plotTypeToStringMapping)) {
        plotTypeOptions.push({ label, value: type as PlotType });
    }
    const dialogContent = (
        <div className="flex flex-col gap-6 p-4 ">
            {/* Histogram-specific options */}
            <div className="flex flex-col gap-3 pb-3 border-b border-gray-200">
                <Label text="Plot type">
                    <div className="flex">
                        <div className="flex-1  mr-2">
                            <Dropdown value={plotType} options={plotTypeOptions} onChange={onPlotTypeChange} />
                        </div>
                    </div>
                </Label>
                <div className="text-sm font-medium text-gray-700">Histogram Display</div>
                <Label text="Histogram Type">
                    <Dropdown
                        options={[
                            { label: "Stacked", value: HistogramType.Stack },
                            { label: "Grouped", value: HistogramType.Group },
                            { label: "Overlayed", value: HistogramType.Overlay },
                            { label: "Relative", value: HistogramType.Relative },
                        ]}
                        value={options.histogramType}
                        onChange={handleHistogramTypeChange}
                    />
                </Label>
                <div className="text-xs text-gray-500 -mt-2">
                    Controls how multiple data series are displayed (only applies to histogram plots)
                </div>
                <Label text="Max number of histogram bins" key="number-of-histogram-bins">
                    <Slider
                        value={options.histogramBins}
                        onChange={handleHistogramBinsChange}
                        min={5}
                        step={1}
                        max={30}
                        valueLabelDisplay="auto"
                    />
                </Label>
            </div>

            {/* Bar-specific options */}
            <div className="flex flex-col gap-3 pb-3 border-b border-gray-200">
                <div className="text-sm font-medium text-gray-700">Bar Chart Display</div>
                <Label text="Sort Bars By">
                    <Dropdown
                        options={[
                            { label: "Selector Values", value: BarSortBy.Xvalues },
                            { label: "Response Values", value: BarSortBy.Yvalues },
                        ]}
                        value={options.barSortBy}
                        onChange={handleBarSortByChange}
                    />
                </Label>
                <div className="text-xs text-gray-500 -mt-2">
                    Sort bars by selector (x-axis) or response (y-axis) values (only applies to bar plots)
                </div>
            </div>

            {/* Statistical visualization options */}
            <div className="flex flex-col gap-3 pb-3 border-b border-gray-200">
                <div className="text-sm font-medium text-gray-700">Statistical Visualization</div>
                <Label position="left" text="Show Statistical Markers">
                    <Checkbox checked={options.showStatisticalMarkers} onChange={handleShowStatisticalMarkersChange} />
                </Label>
                <div className="text-xs text-gray-500 -mt-2">
                    Display mean, P10, and P90 markers (available for certain plot types)
                </div>
                <Label position="left" text="Show Realization Points">
                    <Checkbox checked={options.showRealizationPoints} onChange={handleShowRealizationPointsChange} />
                </Label>
                <div className="text-xs text-gray-500 -mt-2">
                    Display individual realization data points (available for certain plot types)
                </div>
            </div>

            {/* Layout options */}
            <div className="flex flex-col gap-3">
                <div className="text-sm font-medium text-gray-700">Layout Options</div>
                <Label position="left" text="Hide plots where all values are equal">
                    <Checkbox checked={options.hideConstants} onChange={handleHideConstantsChange} />
                </Label>
                <Label position="left" text="Shared X Axis">
                    <Checkbox checked={options.sharedXAxis} onChange={handleSharedXAxisChange} />
                </Label>
                <Label position="left" text="Shared Y Axis">
                    <Checkbox checked={options.sharedYAxis} onChange={handleSharedYAxisChange} />
                </Label>
            </div>
        </div>
    );

    return dialogContent;
}
