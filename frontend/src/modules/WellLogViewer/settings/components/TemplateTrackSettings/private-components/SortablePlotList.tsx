import React from "react";

import { Delete, SwapHoriz, Warning } from "@mui/icons-material";
import type { TemplatePlotType } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";
import { useAtomValue } from "jotai";
import _ from "lodash";

import type { WellboreLogCurveHeader_api } from "@api";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Dropdown } from "@lib/components/Dropdown";
import type { DropdownOption, DropdownOptionGroup } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { SortableList, SortableListItem } from "@lib/components/SortableList";
import { arrayMove } from "@lib/utils/arrays";
import { ColorSet } from "@lib/utils/ColorSet";
import { missingCurvesAtom } from "@modules/WellLogViewer/settings/atoms/derivedAtoms";
import type { TemplatePlotConfig } from "@modules/WellLogViewer/types";
import { CURVE_COLOR_PALETTE } from "@modules/WellLogViewer/utils/logViewerColors";
import { makeTrackPlot } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { makeSelectValueForCurveHeader } from "@modules/WellLogViewer/utils/strings";

import { AddItemButton } from "../../AddItemButton";

import { PLOT_TYPE_OPTIONS } from "./plotTypeOptions";


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
        function addPlot(plotType: TemplatePlotType) {
            const plotConfig: TemplatePlotConfig = makeTrackPlot({
                _curveHeader: null,
                color: colorSet.getNextColor(),
                type: plotType,
            });

            onUpdatePlots([...props.plots, plotConfig]);
        },
        [onUpdatePlots, props.plots],
    );

    const handlePlotChange = React.useCallback(
        function handlePlotChange(plot: TemplatePlotConfig, changes: Partial<TemplatePlotConfig>) {
            const newPlot = makeTrackPlot({ ...plot, ...changes });
            const newPlots = props.plots.map((p) => (p._key === newPlot._key ? newPlot : p));

            onUpdatePlots(newPlots);
        },
        [onUpdatePlots, props.plots],
    );

    const removePlot = React.useCallback(
        function removePlot(plot: TemplatePlotConfig) {
            onUpdatePlots(props.plots.filter((p) => p._key !== plot._key));
        },
        [onUpdatePlots, props.plots],
    );

    const handleTrackMove = React.useCallback(
        function handleTrackMove(
            movedItemId: string,
            originId: string | null,
            destinationId: string | null,
            newPosition: number,
        ) {
            const currentPosition = props.plots.findIndex((p) => p.name === movedItemId);
            const newTrackCfg = arrayMove(props.plots, currentPosition, newPosition);

            onUpdatePlots(newTrackCfg);
        },
        [onUpdatePlots, props.plots],
    );

    return (
        <div>
            <Label text="Plots" position="left" wrapperClassName="justify-between!" labelClassName="mb-0!">
                <AddItemButton buttonText="Add plot" options={PLOT_TYPE_OPTIONS} onOptionClicked={addPlot} />
            </Label>

            <SortableList onItemMoved={handleTrackMove}>
                {props.plots.map((plot) => (
                    <SortablePlotItem
                        key={plot._key}
                        plot={plot}
                        curveHeaderOptions={curveHeaderOptions}
                        onPlotUpdate={handlePlotChange}
                        onDeletePlot={removePlot}
                    />
                ))}
            </SortableList>
        </div>
    );
}

type CurveDropdownOptionGroup = Omit<DropdownOptionGroup, "options"> & {
    options: CurveDropdownOption[];
};
type CurveDropdownOption = DropdownOption & {
    _curveHeader: WellboreLogCurveHeader_api;
    _curveHeader2?: WellboreLogCurveHeader_api;
};

type SortablePlotItemProps = {
    plot: TemplatePlotConfig;
    curveHeaderOptions: CurveDropdownOptionGroup[];
    onPlotUpdate: (plot: TemplatePlotConfig, changes: Partial<TemplatePlotConfig>) => void;
    onDeletePlot: (plot: TemplatePlotConfig) => void;
};

function SortablePlotItem(props: SortablePlotItemProps) {
    const { onPlotUpdate } = props;
    const secondCurveNeeded = props.plot.type === "differential";
    const endAdornment = <PlotItemEndAdornment {...props} />;

    const handlePlotSelectChange = React.useCallback(
        function handlePlotSelectChange(choice: string, isSecondaryCurve?: boolean) {
            const selectedCurveHeader = _.chain(props.curveHeaderOptions)
                .flatMap<CurveDropdownOption>("options")
                .find(["value", choice])
                .get("_curveHeader")
                .value();

            if (!selectedCurveHeader) return;

            if (isSecondaryCurve) {
                onPlotUpdate(props.plot, {
                    _key: props.plot._key,
                    _curveHeader2: selectedCurveHeader,
                    name2: selectedCurveHeader.curveName,
                });
            } else {
                onPlotUpdate(props.plot, {
                    _key: props.plot._key,
                    _curveHeader: selectedCurveHeader,
                    name: selectedCurveHeader.curveName,
                });
            }
        },
        [onPlotUpdate, props.plot, props.curveHeaderOptions],
    );

    const plotForm = (
        <div className="grow flex">
            <Dropdown
                placeholder="Select a curve"
                value={makeSelectValueForCurveHeader(props.plot._curveHeader)}
                options={props.curveHeaderOptions}
                onChange={handlePlotSelectChange}
            />

            {secondCurveNeeded && (
                <>
                    <DenseIconButton
                        title="Swap curves"
                        onClick={() =>
                            props.onPlotUpdate(props.plot, {
                                name: props.plot.name2,
                                name2: props.plot.name,
                                _curveHeader: props.plot._curveHeader2,
                                _curveHeader2: props.plot._curveHeader,
                            })
                        }
                    >
                        <SwapHoriz fontSize="inherit" />
                    </DenseIconButton>

                    <Dropdown
                        placeholder="Select 2nd curve"
                        value={makeSelectValueForCurveHeader(props.plot._curveHeader2)}
                        options={props.curveHeaderOptions}
                        onChange={(v) => handlePlotSelectChange(v, true)}
                    />
                </>
            )}
        </div>
    );

    return <SortableListItem id={props.plot._key} title={plotForm} endAdornment={endAdornment} />;
}

function PlotItemEndAdornment(props: SortablePlotItemProps) {
    return (
        <>
            <div className="text-xs w-28 shrink-0">
                <Dropdown
                    value={props.plot.type}
                    options={PLOT_TYPE_OPTIONS}
                    onChange={(v) => props.onPlotUpdate(props.plot, { type: v })}
                />
            </div>

            <button
                className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded-sm text-xs text-red-800"
                title="Remove Track"
                onClick={() => props.onDeletePlot(props.plot)}
            >
                <Delete fontSize="inherit" />
            </button>
        </>
    );
}

// It's my understanding that the STAT logs are the main curves users' would care about, so sorting them to the top first
function sortStatLogsToTop(group: CurveDropdownOptionGroup) {
    if (group.label.startsWith("STAT_")) return 0;
    else return 1;
}

// The select value string needs a specific pattern

function curveHeaderToDropdownOption(curveHeader: WellboreLogCurveHeader_api): CurveDropdownOption {
    return {
        value: makeSelectValueForCurveHeader(curveHeader),
        label: curveHeader.curveName,
        _curveHeader: curveHeader,
    };
}

function makeCurveNameOptions(curveHeaders: WellboreLogCurveHeader_api[]): CurveDropdownOptionGroup[] {
    return (
        _.chain(curveHeaders)
            .groupBy("logName")
            .entries()
            .map<CurveDropdownOptionGroup>(([logName, headers]) => ({
                label: logName,
                options: _.sortBy(headers, "curveName").map(curveHeaderToDropdownOption),
            }))
            // Sort each log group by name
            .sortBy([sortStatLogsToTop, "label"])
            .value()
    );
}

// Helper method to show a missing curve as a disabled option
function makeMissingCurveGroup(curveHeaders: WellboreLogCurveHeader_api[]): CurveDropdownOptionGroup {
    return {
        label: "Unavailable curves!",
        options: curveHeaders.map(makeMissingCurveOption),
        adornment: (
            <span title="This plot is is not available for this wellbore!" className="text-yellow-500">
                <Warning fontSize="inherit" />
            </span>
        ),
    };
}

function makeMissingCurveOption(curveHeader: WellboreLogCurveHeader_api): CurveDropdownOption {
    return {
        _curveHeader: curveHeader,
        label: curveHeader.curveName,
        value: makeSelectValueForCurveHeader(curveHeader),
        disabled: true,
    };
}
