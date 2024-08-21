import React from "react";

import { WellboreLogCurveHeader_api } from "@api";
import { arrayMove } from "@framework/utils/arrays";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { SelectOption } from "@lib/components/Select";
import { SortableList, SortableListItem } from "@lib/components/SortableList";
import { PLOT_SCALE_OPTIONS, PLOT_TYPE_OPTIONS } from "@modules/WellLogViewer/utils/logViewerTemplate";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { Delete } from "@mui/icons-material";
import {
    TemplatePlot,
    TemplatePlotScaleTypes,
    TemplatePlotTypes,
} from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { useAtomValue } from "jotai";
import _ from "lodash";

import { AddItemButton } from "./AddItemButton";
import { CurveTrackItemProps } from "./CurveTrackItem";

import { TemplateTrackConfig } from "../../atoms/baseAtoms";
import { wellLogCurveHeadersQueryAtom } from "../../atoms/queryAtoms";

export type TrackSettingsProps = CurveTrackItemProps;
type ConfigChanges = Pick<Partial<TemplateTrackConfig>, "width" | "plots" | "scale" | "title">;

const INPUT_DEBOUNCE_TIME = 500;

export function TrackSettings(props: TrackSettingsProps): React.ReactNode {
    const currentConfig = props.trackConfig;

    const curveHeadersQuery = useAtomValue(wellLogCurveHeadersQueryAtom);
    const curveHeadersErrorStatus = usePropagateApiErrorToStatusWriter(curveHeadersQuery, props.statusWriter) ?? "";

    function updateTrackConfig(configChanges: ConfigChanges) {
        props.onUpdateTrack({ ...currentConfig, ...configChanges });
    }

    return (
        <div
            className="pl-3 p-2 grid gap-x-2 gap-y-3 items-center text-sm"
            style={{ gridTemplateColumns: "auto minmax(0, 1fr)" }}
        >
            <label htmlFor="trackTitle">Track title</label>
            <Input
                id="trackTitle"
                value={currentConfig.title}
                debounceTimeMs={INPUT_DEBOUNCE_TIME}
                onValueChange={(val) => updateTrackConfig({ title: val })}
            />

            <label htmlFor="trackWidth">Track width </label>
            <Input
                id="trackWidth"
                type="number"
                value={currentConfig.width}
                min={1}
                max={6}
                debounceTimeMs={INPUT_DEBOUNCE_TIME}
                onValueChange={(val) => updateTrackConfig({ width: Number(val) })}
            />

            {/* TODO: Track scale */}
            <label htmlFor="trackScale">Scale</label>
            <Dropdown
                id="trackScale"
                value={currentConfig.scale ?? ""}
                options={PLOT_SCALE_OPTIONS}
                filter={false}
                onChange={(val) => {
                    if (!val) updateTrackConfig({ scale: undefined });
                    else updateTrackConfig({ scale: val as TemplatePlotScaleTypes });
                }}
            />

            <div className="col-span-2">
                <PendingWrapper isPending={curveHeadersQuery.isFetching} errorMessage={curveHeadersErrorStatus}>
                    <SortablePlotList
                        plots={currentConfig.plots}
                        onUpdatePlots={(plots) => updateTrackConfig({ plots: plots })}
                    />
                </PendingWrapper>
            </div>
            {/* </div> */}
        </div>
    );
}

type SortablePlotListProps = {
    plots: TemplatePlot[];
    onUpdatePlots: (plots: TemplatePlot[]) => void;
};

function SortablePlotList(props: SortablePlotListProps) {
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

    const curveHeadersQuery = useAtomValue(wellLogCurveHeadersQueryAtom);
    const curveHeaderOptions = makeCurveNameOptions(curveHeadersQuery.data ?? [], props.plots);

    return (
        <div className="min-h-fit">
            <Label text="Plots" position="left" wrapperClassName="!justify-between" labelClassName="!mb-0">
                <AddItemButton buttonText="Add plot" options={curveHeaderOptions} onOptionClicked={addPlot} />
            </Label>

            <SortableList onItemMoved={handleTrackMove}>
                {props.plots.map((plot) => (
                    <SortablePlotItem
                        key={plot.name}
                        plot={plot}
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
    onPlotUpdate: (plot: TemplatePlot) => void;
    onDeletePlot: (plot: TemplatePlot) => void;
};

function SortablePlotItem(props: SortablePlotItemProps) {
    function handlePlotChange(changes: Partial<TemplatePlot>) {
        props.onPlotUpdate({ ...props.plot, ...changes });
    }

    const endAdornment = (
        <>
            <Dropdown
                value={props.plot.type}
                options={PLOT_TYPE_OPTIONS}
                onChange={(v) => handlePlotChange({ type: v as TemplatePlotTypes })}
            />

            <button
                className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-xs text-red-800"
                title="Remove Track"
                onClick={() => props.onDeletePlot(props.plot)}
            >
                <Delete fontSize="inherit" />
            </button>
        </>
    );

    // @ts-expect-error Complains about missing child components. Dont intend to add expansion content, so no children are needed
    return <SortableListItem id={props.plot.name} title={props.plot.name} endAdornment={endAdornment} />;
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

                adornment: (
                    <span title={`Well log name`} className="bg-gray-300 rounded px-1 text-[12px] h-4">
                        {curveHeader.logName}
                    </span>
                ),
            };
        })
        .value();
}
