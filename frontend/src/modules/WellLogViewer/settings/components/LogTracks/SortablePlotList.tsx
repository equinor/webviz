import React, { useRef } from "react";

import { WellboreLogCurveHeader_api } from "@api";
import { arrayMove } from "@framework/utils/arrays";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { SortableList, SortableListItem } from "@lib/components/SortableList";
import { ColorSet } from "@lib/utils/ColorSet";
import { PLOT_TYPE_OPTIONS } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { Delete, SwapHoriz } from "@mui/icons-material";
import { TemplatePlotTypes } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import _ from "lodash";
import { v4 } from "uuid";

import { TemplatePlotConfig } from "../../atoms/baseAtoms";
import { AddItemButton } from "../AddItemButton";

export type SortablePlotListProps = {
    availableCurveHeaders: WellboreLogCurveHeader_api[];
    plots: TemplatePlotConfig[];
    onUpdatePlots: (plots: TemplatePlotConfig[]) => void;
};

// Using the "Time series" palette to pick line colors
const CURVE_COLOR_PALETTE = defaultColorPalettes[2] || defaultColorPalettes[0];

const DIFF_CURVE_COLORS = [
    // Colors based on the ones in the Time Series palette
    "#D62728",
    "#2CA02C",
];

export function SortablePlotList(props: SortablePlotListProps): React.ReactNode {
    const curveHeaderOptions = makeCurveNameOptions(props.availableCurveHeaders);

    // TODO, do an offsett or something, so they dont always start on the same color?
    const colorSet = useRef<ColorSet>(new ColorSet(CURVE_COLOR_PALETTE));

    function addPlot(plotType: string) {
        const plotConfig: TemplatePlotConfig = makeTrackPlot({
            color: colorSet.current.getNextColor(),
            type: plotType as TemplatePlotTypes,
        });

        props.onUpdatePlots([...props.plots, plotConfig]);
    }

    function removePlot(plot: TemplatePlotConfig) {
        props.onUpdatePlots(props.plots.filter((p) => p._id !== plot._id));
    }

    function handlePlotUpdate(newPlot: TemplatePlotConfig) {
        const newPlots = props.plots.map((p) => (p._id === newPlot._id ? newPlot : p));

        props.onUpdatePlots(newPlots);
    }

    function handleTrackMove(
        movedItemId: string,
        originId: string | null,
        destinationId: string | null,
        newPosition: number
    ) {
        // Skip update if the item was moved above or below itself, as this means no actual move happened
        // TODO: This should probably be checked inside SortableList
        const currentPosition = props.plots.findIndex((p) => p.name === movedItemId);
        if (currentPosition === newPosition || currentPosition + 1 === newPosition) return;

        const newTrackCfg = arrayMove(props.plots, currentPosition, newPosition);

        props.onUpdatePlots(newTrackCfg);
    }

    return (
        <div className="">
            <Label text="Plots" position="left" wrapperClassName="!justify-between" labelClassName="!mb-0">
                <AddItemButton buttonText="Add plot" options={PLOT_TYPE_OPTIONS} onOptionClicked={addPlot} />
            </Label>

            <SortableList onItemMoved={handleTrackMove}>
                {props.plots.map((plot) => (
                    <SortablePlotItem
                        key={plot._id}
                        plot={plot}
                        curveHeaderOptions={curveHeaderOptions}
                        onPlotUpdate={handlePlotUpdate}
                        onDeletePlot={removePlot}
                    />
                ))}
            </SortableList>
        </div>
    );
}

type SortablePlotItemProps = {
    plot: TemplatePlotConfig;
    curveHeaderOptions: DropdownOption[];
    onPlotUpdate: (plot: TemplatePlotConfig) => void;
    onDeletePlot: (plot: TemplatePlotConfig) => void;
};

function SortablePlotItem(props: SortablePlotItemProps) {
    const plot = props.plot;
    const secondCurveNeeded = plot.type === "differential";

    function handlePlotChange(changes: Partial<TemplatePlotConfig>) {
        const newPlot = makeTrackPlot({
            ...plot,
            ...changes,
        });

        props.onPlotUpdate(newPlot);
    }

    const title = (
        <>
            <Dropdown
                placeholder="Select a curve"
                value={plot.name}
                options={props.curveHeaderOptions}
                onChange={(v) => handlePlotChange({ name: v })}
            />
        </>
    );

    const endAdornment = (
        <>
            {secondCurveNeeded && (
                <>
                    <button
                        title="Swap curves"
                        aria-label="Swap curves"
                        className="rounded hover:bg-slate-300 text-base block px-1 -mx-1"
                        onClick={() => handlePlotChange({ name: plot.name2, name2: plot.name })}
                    >
                        <SwapHoriz fontSize="inherit" />
                    </button>
                    <Dropdown
                        placeholder="Select 2nd curve"
                        value={plot.name2}
                        options={props.curveHeaderOptions}
                        onChange={(v) => handlePlotChange({ name2: v })}
                    />
                </>
            )}
            <div className="text-xs w-28">
                <Dropdown
                    value={plot.type}
                    options={PLOT_TYPE_OPTIONS}
                    onChange={(v) => handlePlotChange({ type: v as TemplatePlotTypes })}
                />
            </div>

            <button
                className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-xs text-red-800"
                title="Remove Track"
                onClick={() => props.onDeletePlot(plot)}
            >
                <Delete fontSize="inherit" />
            </button>
        </>
    );

    return <SortableListItem id={plot._id} title={title} endAdornment={endAdornment} />;
}

// function isValidPlotConfig(plot: Partial<TemplatePlotConfig>): plot is TemplatePlot {
// function isValidPlotConfig(plot: Partial<TemplatePlotConfig>): boolean {
//     if (!plot.name) return false;
//     if (plot.type === "differential" && !plot.name2) return false;
//     return true;
// }

function makeTrackPlot(plot: Partial<TemplatePlotConfig>): TemplatePlotConfig {
    // If colors get put as undefined, new colors are selected EVERY rerender, so we should avoid that
    const curveColor = plot.color ?? CURVE_COLOR_PALETTE.getColors()[0];
    const curveColor2 = plot.color2 ?? CURVE_COLOR_PALETTE.getColors()[3];
    // DIFF_CURVE_COLORS
    const config: TemplatePlotConfig = {
        ...plot,
        _id: plot._id ?? v4(),
        _isValid: Boolean(plot.name),
        name: plot.name,
        type: plot.type,
        color: curveColor,
        color2: curveColor2,

        //Reset the values that are curve specific
        name2: undefined,
        fill: undefined,
        fill2: undefined,
        colorTable: undefined,
    };

    switch (plot.type) {
        case "stacked":
            throw new Error("Stacked graph type currently not supported");
        case "differential":
            return {
                ...config,
                _isValid: config._isValid && Boolean(plot.name2),
                name2: plot.name2,
                fill: DIFF_CURVE_COLORS.at(0),
                fill2: DIFF_CURVE_COLORS.at(1),
            };

        case "gradientfill":
            return {
                ...config,
                colorTable: "Continuous",
            };

        case "line":
        case "linestep":
        case "dot":
        case "area":
        default:
            return config;
    }
}

function makeCurveNameOptions(curveHeaders: WellboreLogCurveHeader_api[]): DropdownOption[] {
    return _.chain(curveHeaders)
        .sortBy(["logName", "curveName"])

        .flatMap((curveHeader): DropdownOption => {
            return {
                value: curveHeader.curveName,
                label: curveHeader.curveName,
                group: curveHeader.logName,
            };
        })
        .value();
}
