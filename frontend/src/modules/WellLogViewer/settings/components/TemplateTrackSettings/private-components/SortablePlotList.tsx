import React from "react";

import { WellboreLogCurveHeader_api } from "@api";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { DropdownOptionGroup } from "@lib/components/Dropdown/dropdown";
import { Label } from "@lib/components/Label";
import { SortableList, SortableListItem } from "@lib/components/SortableList";
import { ColorSet } from "@lib/utils/ColorSet";
import { arrayMove } from "@lib/utils/arrays";
import { TemplatePlotConfig } from "@modules/WellLogViewer/types";
import { CURVE_COLOR_PALETTE } from "@modules/WellLogViewer/utils/logViewerColors";
import { makeTrackPlot } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { Delete, SwapHoriz, Warning } from "@mui/icons-material";
import { TemplatePlotTypes } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { useAtomValue } from "jotai";
import _ from "lodash";

import { PLOT_TYPE_OPTIONS } from "./plotTypeOptions";

import { missingCurvesAtom } from "../../../atoms/derivedAtoms";
import { AddItemButton } from "../../AddItemButton";

export type SortablePlotListProps = {
    availableCurveHeaders: WellboreLogCurveHeader_api[];
    plots: TemplatePlotConfig[];
    onUpdatePlots: (plots: TemplatePlotConfig[]) => void;
};

// TODO, do an offsett or something, so they dont always start on the same color?
const colorSet = new ColorSet(CURVE_COLOR_PALETTE);

export function SortablePlotList(props: SortablePlotListProps): React.ReactNode {
    const { onUpdatePlots } = props;

    const curveHeaderOptions = makeCurveNameOptions(props.availableCurveHeaders);
    const missingCurves = useAtomValue(missingCurvesAtom);

    if (missingCurves.length) {
        // If the current selection does not exist, keep it in the dropdown options, but with a warning.
        // This can happen when the user is importing a config, or swapping between wellbores.
        curveHeaderOptions.push(makeMissingCurveGroup(missingCurves));
    }

    const addPlot = React.useCallback(
        function addPlot(plotType: TemplatePlotTypes) {
            const plotConfig: TemplatePlotConfig = makeTrackPlot({
                color: colorSet.getNextColor(),
                type: plotType,
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
            const currentPosition = props.plots.findIndex((p) => p.name === movedItemId);
            const newTrackCfg = arrayMove(props.plots, currentPosition, newPosition);

            onUpdatePlots(newTrackCfg);
        },
        [onUpdatePlots, props.plots]
    );

    return (
        <div>
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
    curveHeaderOptions: CurveDropdownOptionGroup[];
    onPlotUpdate: (plot: TemplatePlotConfig) => void;
    onDeletePlot: (plot: TemplatePlotConfig) => void;
};

function SortablePlotItem(props: SortablePlotItemProps) {
    const { onPlotUpdate } = props;
    const secondCurveNeeded = props.plot.type === "differential";

    function handlePlotChange(changes: Partial<TemplatePlotConfig>) {
        const newPlot = makeTrackPlot({
            ...props.plot,
            ...changes,
        });

        onPlotUpdate(newPlot);
    }

    const title = (
        <>
            <Dropdown
                placeholder="Select a curve"
                value={props.plot._logAndName}
                options={props.curveHeaderOptions}
                onChange={(v) => handlePlotChange({ _logAndName: v, name: v.split("::")[1] })}
            />
        </>
    );

    const endAdornment = (
        <>
            {secondCurveNeeded && (
                <>
                    <DenseIconButton
                        title="Swap curves"
                        onClick={() =>
                            handlePlotChange({
                                _logAndName: props.plot._logAndName2,
                                _logAndName2: props.plot._logAndName,
                                name: props.plot.name2,
                                name2: props.plot.name,
                            })
                        }
                    >
                        <SwapHoriz fontSize="inherit" />
                    </DenseIconButton>

                    <Dropdown
                        placeholder="Select 2nd curve"
                        value={props.plot._logAndName2}
                        options={props.curveHeaderOptions}
                        onChange={(v) => handlePlotChange({ _logAndName2: v, name2: v.split("::")[1] })}
                    />
                </>
            )}
            <div className="text-xs w-28 flex-shrink-0">
                <Dropdown
                    value={props.plot.type}
                    options={PLOT_TYPE_OPTIONS}
                    onChange={(v) => handlePlotChange({ type: v })}
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

// It's my understanding that the STAT logs are the main curves users' would care about, so sorting them to the top first
function sortStatLogsToTop(group: CurveDropdownOptionGroup) {
    if (group.label.startsWith("STAT_")) return 0;
    else return 1;
}

// The select value string needs a specific pattern
type CurveDropdownOption = DropdownOption<TemplatePlotConfig["_logAndName"]>;
type CurveDropdownOptionGroup = DropdownOptionGroup<TemplatePlotConfig["_logAndName"]>;

function makeCurveNameOptions(curveHeaders: WellboreLogCurveHeader_api[]): CurveDropdownOptionGroup[] {
    return (
        _.chain(curveHeaders)
            .groupBy("logName")
            .entries()
            .map(([logName, headers]): CurveDropdownOptionGroup => {
                return {
                    label: logName,
                    options: _.chain(headers).sortBy("curveName").map(curveHeaderToDropdownOption).value(),
                };
            })
            // Sort each log group by name
            .sortBy([sortStatLogsToTop, "label"])
            .value()
    );
}

function curveHeaderToDropdownOption(curveHeader: WellboreLogCurveHeader_api): CurveDropdownOption {
    return {
        // ... surely they wont have log-names with :: in them, RIGHT?
        value: `${curveHeader.logName}::${curveHeader.curveName}`,
        label: curveHeader.curveName,
    };
}

// Helper method to show a missing curve as a disabled option
function makeMissingCurveGroup(curveNames: string[]): CurveDropdownOptionGroup {
    return {
        label: "Unavailable curves!",
        options: curveNames.map(makeMissingCurveOption),
    };
}

function makeMissingCurveOption(curveName: string): CurveDropdownOption {
    return {
        label: curveName,
        value: `${curveName}::n/a`,
        disabled: true,
        adornment: (
            <span title="This plot is is not available for this wellbore!" className="text-yellow-500">
                <Warning fontSize="inherit" />
            </span>
        ),
    };
}
