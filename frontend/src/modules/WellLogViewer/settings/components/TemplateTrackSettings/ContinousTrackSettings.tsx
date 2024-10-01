import React from "react";

import { Dropdown, type DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { TemplatePlotScaleTypes } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { useAtomValue } from "jotai";

import { SortablePlotList } from "./private-components/SortablePlotList";
import { TrackSettingFragmentProps } from "./private-components/TrackSettings";

import { wellLogCurveHeadersQueryAtom } from "../../atoms/queryAtoms";

type TemplatePlotScaleOption = DropdownOption<TemplatePlotScaleTypes>;

const PLOT_SCALE_OPTIONS: TemplatePlotScaleOption[] = [
    { label: "Linear", value: "linear" },
    { label: "Logaritmic", value: "log" },
];

export function ContinousTrackSettings(props: TrackSettingFragmentProps): React.ReactNode {
    const dropdownId = React.useId();

    const curveHeadersQuery = useAtomValue(wellLogCurveHeadersQueryAtom);
    const curveHeadersError = usePropagateApiErrorToStatusWriter(curveHeadersQuery, props.statusWriter);

    return (
        <>
            <label htmlFor={dropdownId}>Scale</label>
            <Dropdown<TemplatePlotScaleTypes>
                id={dropdownId}
                value={props.trackConfig.scale}
                options={PLOT_SCALE_OPTIONS}
                filter={false}
                onChange={(val) => {
                    if (!val) props.onFieldChange({ scale: undefined });
                    else props.onFieldChange({ scale: val });
                }}
            />

            <div className="col-span-2">
                <PendingWrapper isPending={curveHeadersQuery.isPending} errorMessage={curveHeadersError ?? ""}>
                    <SortablePlotList
                        availableCurveHeaders={curveHeadersQuery.data ?? []}
                        plots={props.trackConfig.plots}
                        onUpdatePlots={(plots) => props.onFieldChange({ plots: plots })}
                    />
                </PendingWrapper>
            </div>
        </>
    );
}
