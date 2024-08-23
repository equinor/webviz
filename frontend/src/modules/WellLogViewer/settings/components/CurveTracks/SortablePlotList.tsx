import React, { useRef, useState } from "react";

import { WellboreLogCurveHeader_api } from "@api";
import { arrayMove } from "@framework/utils/arrays";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { SortableList, SortableListItem } from "@lib/components/SortableList";
import { PLOT_TYPE_OPTIONS, isCompositePlotType } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { Popper } from "@mui/base";
import { Delete } from "@mui/icons-material";
import { TemplatePlot, TemplatePlotTypes } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import _ from "lodash";

import { AddItemButton } from "./AddItemButton";

export type SortablePlotListProps = {
    availableCurveHeaders: WellboreLogCurveHeader_api[];
    plots: TemplatePlot[];
    onUpdatePlots: (plots: TemplatePlot[]) => void;
};

export function SortablePlotList(props: SortablePlotListProps): React.ReactNode {
    function addPlot(curveName: string) {
        props.onUpdatePlots([...props.plots, makeTrackPlot(curveName)]);
    }

    function removePlot(plot: TemplatePlot) {
        props.onUpdatePlots(props.plots.filter((p) => p.name !== plot.name));
    }

    function handlePlotUpdate(newPlot: TemplatePlot) {
        const newPlots = props.plots.map((p) => (p.name === newPlot.name ? newPlot : p));

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

    const curveHeaderOptions = makeCurveNameOptions(props.availableCurveHeaders, props.plots);

    return (
        <div className="">
            <Label text="Plots" position="left" wrapperClassName="!justify-between" labelClassName="!mb-0">
                <AddItemButton buttonText="Add plot" options={curveHeaderOptions} onOptionClicked={addPlot} />
            </Label>

            <SortableList onItemMoved={handleTrackMove}>
                {props.plots.map((plot) => (
                    <SortablePlotItem
                        key={plot.name}
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
    plot: TemplatePlot;
    curveHeaderOptions: SelectOption[];
    onPlotUpdate: (plot: TemplatePlot) => void;
    onDeletePlot: (plot: TemplatePlot) => void;
};

function SortablePlotItem(props: SortablePlotItemProps) {
    // TODO: Fix this. Wanted a very dirty fix to handle composite plot types aswell. But its fairly error prone
    const anchorRef = useRef<HTMLDivElement>(null);
    const [popperOpen, setPopperOpen] = useState<boolean>(false);
    const attemptedType = useRef<TemplatePlotTypes | null>(null);

    function handlePlotTypeChange(newType: TemplatePlotTypes) {
        const isComposite = isCompositePlotType(newType);

        if (isComposite && !props.plot.name2) {
            attemptedType.current = newType;
            setPopperOpen(true);
        } else if (isComposite) {
            handlePlotChange({ type: newType });
        } else {
            handlePlotChange({ type: newType, name2: undefined });
        }
    }

    function handlePlotChange(changes: Partial<TemplatePlot>) {
        attemptedType.current = null;
        setPopperOpen(false);

        props.onPlotUpdate({ ...props.plot, ...changes });
    }

    const endAdornment = (
        <>
            <div ref={anchorRef}>
                <Dropdown
                    value={props.plot.type}
                    options={PLOT_TYPE_OPTIONS}
                    // @ts-expect-error Throws because the handler uses the TemplatePlotTypes type, and not "string". We KNOW the options are valid types, so the error means nothing
                    onChange={handlePlotTypeChange}
                />
            </div>

            <Popper anchorEl={anchorRef.current} open={popperOpen} placement="bottom-end">
                <div className="bg-white border border-gray-300 rounded-md shadow-md overflow-y-auto  box-border p-3 w-96 text-sm">
                    <div className="mb-2">This plot-type requires a two curves! Select one more:</div>

                    <Select
                        options={props.curveHeaderOptions}
                        onChange={([v]) => handlePlotChange({ name2: v, type: attemptedType.current ?? "" })}
                        size={5}
                    />
                </div>
            </Popper>

            <button
                className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-xs text-red-800"
                title="Remove Track"
                onClick={() => props.onDeletePlot(props.plot)}
            >
                <Delete fontSize="inherit" />
            </button>
        </>
    );

    const { name, name2 } = props.plot;

    const itemTitle = name2 ? `${name} & ${name2}` : name;

    // @ts-expect-error Complains about missing child components. Dont intend to add expansion content, so no children are needed
    return <SortableListItem id={props.plot.name} title={itemTitle} endAdornment={endAdornment} />;
}

function makeTrackPlot(curveName: string): TemplatePlot {
    return {
        name: curveName,
        // TODO: Let user select type and color
        type: "line",
        color: "",
    };
}

function makeCurveNameOptions(
    curveHeaders: WellboreLogCurveHeader_api[],
    currentSelectedPlots: TemplatePlot[]
): SelectOption[] {
    return _.chain(curveHeaders)
        .sortBy("logName")
        .filter((curveHeader) => {
            return !currentSelectedPlots.some((p) => p.name === curveHeader.curveName);
        })
        .map((curveHeader): SelectOption => {
            return {
                value: curveHeader.curveName,
                label: curveHeader.curveName,
                disabled: currentSelectedPlots.some((p) => p.name === curveHeader.curveName),

                // adornment: (
                //     <span title={`Well log name`} className="bg-gray-300 rounded px-1 text-[12px] h-4">
                //         {curveHeader.logName}
                //     </span>
                // ),
            };
        })
        .value();
}
