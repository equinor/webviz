import React from "react";

import { WellboreLogCurveHeader_api } from "@api";
import { Select, SelectOption, SelectProps } from "@lib/components/Select";

import _, { Dictionary } from "lodash";

export type WellLogSelectProps = {
    value: string | null;
    logCurveHeaders: WellboreLogCurveHeader_api[];
    onChange: (selection: string | null) => void;
} & Omit<SelectProps, "options" | "value" | "onChange">;

export function WellLogSelect(props: WellLogSelectProps): React.ReactNode {
    const { value, logCurveHeaders, onChange, ...otherProps } = props;

    const groupedCurves = _.groupBy(logCurveHeaders, "logName");

    return (
        <Select
            value={value ? [value] : []}
            options={makeWellboreLogHeaderOptions(groupedCurves)}
            onChange={(selection: string[]) => onChange(selection[0] ?? null)}
            {...otherProps}
        />
    );
}

function makeWellboreLogHeaderOptions(wellLogHeaders: Dictionary<WellboreLogCurveHeader_api[]>): SelectOption[] {
    return Object.entries(wellLogHeaders).map(([logName, headers]) => ({
        label: logName,
        value: logName,
        // TODO: Check if this adornment is wanted. Did this to test out how they worked, unsure if the info is actually needed
        adornment: (
            <span title={`Contains ${headers.length} curve(s)`} className="bg-gray-300 rounded px-1 text-[12px] h-4">
                {headers.length}
            </span>
        ),
    }));
}
