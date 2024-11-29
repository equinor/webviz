import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { TemplatePlotScaleTypes } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { useAtomValue } from "jotai";

import { SortablePlotList } from "./SortablePlotList";
import { CurveTrackItemProps } from "./SortableTrackItem";

import { wellLogCurveHeadersQueryAtom } from "../../../atoms/queryAtoms";

export type TrackSettingsProps = CurveTrackItemProps;

type ConfigChanges = Partial<Pick<TemplateTrackConfig, "width" | "plots" | "scale" | "title">>;
type TemplatePlotScaleOption = DropdownOption<TemplatePlotScaleTypes>;

const PLOT_SCALE_OPTIONS: TemplatePlotScaleOption[] = [
    { label: "Linear", value: "linear" },
    { label: "Logaritmic", value: "log" },
];

const INPUT_DEBOUNCE_TIME = 500;

export function TrackSettings(props: TrackSettingsProps): React.ReactNode {
    const { onUpdateTrack } = props;

    const curveHeadersQuery = useAtomValue(wellLogCurveHeadersQueryAtom);
    const curveHeadersErrorStatus = usePropagateApiErrorToStatusWriter(curveHeadersQuery, props.statusWriter) ?? "";

    const updateTrackConfig = React.useCallback(
        function updateTrackConfig(configChanges: ConfigChanges) {
            onUpdateTrack({ ...props.trackConfig, ...configChanges });
        },
        [props.trackConfig, onUpdateTrack]
    );

    return (
        <div
            className="pl-3 p-2 grid gap-x-2 gap-y-3 items-center text-sm"
            style={{ gridTemplateColumns: "auto minmax(0, 1fr)" }}
        >
            <label htmlFor="trackTitle">Track title</label>
            <Input
                id="trackTitle"
                value={props.trackConfig.title}
                debounceTimeMs={INPUT_DEBOUNCE_TIME}
                onValueChange={(val) => updateTrackConfig({ title: val })}
            />

            <label htmlFor="trackWidth">Track width </label>
            <Input
                id="trackWidth"
                type="number"
                value={props.trackConfig.width}
                min={1}
                max={6}
                debounceTimeMs={INPUT_DEBOUNCE_TIME}
                onValueChange={(val) => updateTrackConfig({ width: Number(val) })}
            />

            <label htmlFor="trackScale">Scale</label>
            <Dropdown<TemplatePlotScaleTypes>
                id="trackScale"
                value={props.trackConfig.scale}
                options={PLOT_SCALE_OPTIONS}
                filter={false}
                onChange={(val) => {
                    if (!val) updateTrackConfig({ scale: undefined });
                    else updateTrackConfig({ scale: val });
                }}
            />

            <div className="col-span-2">
                <PendingWrapper isPending={curveHeadersQuery.isPending} errorMessage={curveHeadersErrorStatus}>
                    <SortablePlotList
                        availableCurveHeaders={curveHeadersQuery.data ?? []}
                        plots={props.trackConfig.plots}
                        onUpdatePlots={(plots) => updateTrackConfig({ plots: plots })}
                    />
                </PendingWrapper>
            </div>
        </div>
    );
}
