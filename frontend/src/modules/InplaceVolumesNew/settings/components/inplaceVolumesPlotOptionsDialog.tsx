import type React from "react";
import { useRef } from "react";

import { Close } from "@mui/icons-material";
import { ClickAwayListener } from "@mui/material";

import { Checkbox } from "@lib/components/Checkbox";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";
import { createPortal } from "@lib/utils/createPortal";

export enum HistogramType {
    Stack = "stack",
    Group = "group",
    Overlay = "overlay",
    Relative = "relative",
}

export enum BarSortBy {
    Xvalues = "xvalues",
    Yvalues = "yvalues",
}

export type InplaceVolumesPlotOptions = {
    histogramType: HistogramType; // For histogram plots
    histogramBins: number;
    barSortBy: BarSortBy; // How to sort the bars in a bar plot,
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
    sharedXAxis: boolean;
    sharedYAxis: boolean;
    showLegend: boolean;
    hideConstants: boolean;
};
export type InplaceVolumesPlotOptionsDialogProps = {
    options: InplaceVolumesPlotOptions;
    isOpen: boolean;
    onClose: () => void;
    onChange: (options: InplaceVolumesPlotOptions) => void;
    anchorElement?: HTMLElement | null;
};

export function InplaceVolumesPlotOptionsDialog({
    isOpen,
    onClose,
    anchorElement,
    options,
    onChange,
}: InplaceVolumesPlotOptionsDialogProps): React.ReactElement | null {
    const dialogRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    // Shared onChange handler for options
    const handleOptionChange = <K extends keyof InplaceVolumesPlotOptions>(
        key: K,
        value: InplaceVolumesPlotOptions[K],
    ) => {
        onChange({
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

    const handleShowLegendChange = (_: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
        handleOptionChange("showLegend", checked);
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
    // Calculate position relative to anchor element
    const baseStyle: React.CSSProperties = {
        position: "fixed",
        zIndex: 40,
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        minWidth: "320px",
        maxWidth: "200px",
        overflow: "visible",
    };

    // Position relative to anchor element
    const rect = anchorElement?.getBoundingClientRect();
    const style: React.CSSProperties = {
        ...baseStyle,
        top: rect ? rect.bottom + 4 : 100,
        left: rect ? rect.left : 100,
    };

    const dialogContent = (
        <ClickAwayListener onClickAway={onClose}>
            <div ref={dialogRef} style={style}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Plot Options</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                        title="Close"
                    >
                        <Close fontSize="small" />
                    </button>
                </div>
                <div className="p-4 flex flex-col gap-4">
                    {/* Histogram-specific options */}
                    <div className="flex flex-col gap-3 pb-3 border-b border-gray-200">
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
                            <Checkbox
                                checked={options.showStatisticalMarkers}
                                onChange={handleShowStatisticalMarkersChange}
                            />
                        </Label>
                        <div className="text-xs text-gray-500 -mt-2">
                            Display mean, P10, and P90 markers (available for certain plot types)
                        </div>
                        <Label position="left" text="Show Realization Points">
                            <Checkbox
                                checked={options.showRealizationPoints}
                                onChange={handleShowRealizationPointsChange}
                            />
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
                        <Label position="left" text="Show Legend">
                            <Checkbox checked={options.showLegend} onChange={handleShowLegendChange} />
                        </Label>
                    </div>
                </div>
            </div>
        </ClickAwayListener>
    );

    return createPortal(dialogContent);
}
