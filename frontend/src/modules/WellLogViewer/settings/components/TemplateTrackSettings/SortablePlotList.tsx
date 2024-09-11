import React from "react";

import { WellboreLogCurveHeader_api } from "@api";
import { arrayMove } from "@framework/utils/arrays";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { SortableList, SortableListItem } from "@lib/components/SortableList";
import { ColorSet } from "@lib/utils/ColorSet";
import { CURVE_COLOR_PALETTE } from "@modules/WellLogViewer/utils/logViewerColors";
import { PLOT_TYPE_OPTIONS, makeTrackPlot } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { Delete, SwapHoriz, Warning } from "@mui/icons-material";
import { TemplatePlotTypes } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { useAtomValue } from "jotai";
import _ from "lodash";

import { allSelectedWellLogCurvesAtom } from "../../atoms/derivedAtoms";
import { TemplatePlotConfig } from "../../atoms/persistedAtoms";
import { AddItemButton } from "../AddItemButton";

export type SortablePlotListProps = {
    availableCurveHeaders: WellboreLogCurveHeader_api[];
    plots: TemplatePlotConfig[];
    onUpdatePlots: (plots: TemplatePlotConfig[]) => void;
};

export function SortablePlotList(props: SortablePlotListProps): React.ReactNode {
    const allSelectedWellLogCurves = useAtomValue(allSelectedWellLogCurvesAtom);

    const { onUpdatePlots } = props;

    const curveHeaderOptions = makeCurveNameOptions(props.availableCurveHeaders);

    // If the current selection does not exist, keep it in the selection, with a warning. This can happen when the user is importing a config, or swapping between wellbores
    allSelectedWellLogCurves.forEach((curveName) => {
        if (!curveHeaderOptions.some(({ value }) => value === curveName)) {
            curveHeaderOptions.push(makeMissingCurveOption(curveName));
        }
    });

    // TODO, do an offsett or something, so they dont always start on the same color?
    const colorSet = React.useRef<ColorSet>(new ColorSet(CURVE_COLOR_PALETTE));

    const addPlot = React.useCallback(
        function addPlot(plotType: string) {
            const plotConfig: TemplatePlotConfig = makeTrackPlot({
                color: colorSet.current.getNextColor(),
                type: plotType as TemplatePlotTypes,
            });

            onUpdatePlots([...props.plots, plotConfig]);
        },
        [onUpdatePlots, props.plots]
    );

    const removePlot = React.useCallback(
        function removePlot(plot: TemplatePlotConfig) {
            onUpdatePlots(props.plots.filter((p) => p._id !== plot._id));
        },
        [onUpdatePlots, props.plots]
    );

    const handlePlotUpdate = React.useCallback(
        function handlePlotUpdate(newPlot: TemplatePlotConfig) {
            const newPlots = props.plots.map((p) => (p._id === newPlot._id ? newPlot : p));

            onUpdatePlots(newPlots);
        },
        [onUpdatePlots, props.plots]
    );

    const handleTrackMove = React.useCallback(
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

            onUpdatePlots(newTrackCfg);
        },
        [onUpdatePlots, props.plots]
    );

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
    const { onPlotUpdate } = props;
    const secondCurveNeeded = props.plot.type === "differential";

    const handlePlotChange = React.useCallback(
        function handlePlotChange(changes: Partial<TemplatePlotConfig>) {
            const newPlot = makeTrackPlot({
                ...props.plot,
                ...changes,
            });

            onPlotUpdate(newPlot);
        },
        [props.plot, onPlotUpdate]
    );

    const title = (
        <>
            <Dropdown
                placeholder="Select a curve"
                value={props.plot.name}
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
                        onClick={() => handlePlotChange({ name: props.plot.name2, name2: props.plot.name })}
                    >
                        <SwapHoriz fontSize="inherit" />
                    </button>
                    <Dropdown
                        placeholder="Select 2nd curve"
                        value={props.plot.name2}
                        options={props.curveHeaderOptions}
                        onChange={(v) => handlePlotChange({ name2: v })}
                    />
                </>
            )}
            <div className="text-xs w-28 flex-shrink-0">
                <Dropdown
                    value={props.plot.type}
                    options={PLOT_TYPE_OPTIONS}
                    onChange={(v) => handlePlotChange({ type: v as TemplatePlotTypes })}
                />
            </div>

            <button
                className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-xs text-red-800"
                title="Remove Track"
                onClick={() => props.onDeletePlot(props.plot)}
            >
                <Delete fontSize="inherit" />
            </button>
        </>
    );

    return <SortableListItem id={props.plot._id} title={title} endAdornment={endAdornment} />;
}

function makeCurveNameOptions(curveHeaders: WellboreLogCurveHeader_api[]): DropdownOption[] {
    return _.chain(curveHeaders)
        .sortBy(["logName", "curveName"])
        .map((curveHeader): DropdownOption => {
            return {
                value: curveHeader.curveName,
                label: curveHeader.curveName,
                group: curveHeader.logName,
            };
        })
        .value();
}

// Helper method to show a missing curve as a disabled option
function makeMissingCurveOption(curveName: string): DropdownOption {
    return {
        label: curveName,
        value: curveName,
        group: "Unavailable curves!",
        disabled: true,
        adornment: (
            <span title="This plot is is not available for this wellbore!" className="text-yellow-500">
                <Warning fontSize="inherit" />
            </span>
        ),
    };
}
