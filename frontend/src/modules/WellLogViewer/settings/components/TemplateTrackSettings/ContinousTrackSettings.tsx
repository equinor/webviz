import React from "react";

import { Dropdown, type DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import type { UseQueryResult } from "@tanstack/react-query";
import type { TemplatePlotScale } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { useAtomValue } from "jotai";

import { SortablePlotList } from "./private-components/SortablePlotList";
import type { TrackSettingFragmentProps } from "./private-components/TrackSettings";

import { availableContinuousCurvesAtom, availableFlagCurvesAtom } from "../../atoms/derivedAtoms";
import { wellLogCurveHeadersQueryAtom } from "../../atoms/queryAtoms";

type TemplatePlotScaleOption = DropdownOption<TemplatePlotScale>;

const PLOT_SCALE_OPTIONS: TemplatePlotScaleOption[] = [
    { label: "Linear", value: "linear" },
    { label: "Logarithmic", value: "log" },
];

export function ContinousTrackSettings(props: TrackSettingFragmentProps): React.ReactNode {
    const dropdownId = React.useId();

    const curveHeadersQuery = useAtomValue(wellLogCurveHeadersQueryAtom);

    const curveHeadersError = usePropagateApiErrorToStatusWriter(
        // ! Cast is safe, since MergedQueryResult includes `.error`
        curveHeadersQuery as UseQueryResult,
        props.statusWriter
    );

    const availableCurveHeaders = [
        ...useAtomValue(availableContinuousCurvesAtom),
        ...useAtomValue(availableFlagCurvesAtom),
    ];

    return (
        <>
            <label htmlFor={dropdownId}>Scale</label>
            <Dropdown<TemplatePlotScale>
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
                        availableCurveHeaders={availableCurveHeaders}
                        plots={props.trackConfig.plots}
                        onUpdatePlots={(plots) => props.onFieldChange({ plots: plots })}
                    />
                </PendingWrapper>
            </div>
        </>
    );
}
