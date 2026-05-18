import React from "react";

import { DateRangePicker as DateRangePickerBase } from "@equinor/eds-core-react";
import type { DateRangePickerProps as DateRangePickerBaseProps } from "@equinor/eds-core-react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { SelectableSize } from "../_shared/size";

export type DateRangePickerProps = DateRangePickerBaseProps & {
    size?: SelectableSize;
};

export const DateRangePicker = React.forwardRef<HTMLDivElement, DateRangePickerProps>(function DateRangePicker(
    { size = "default", className, ...props },
    ref,
) {
    return (
        <DateRangePickerBase
            {...props}
            ref={ref}
            className={resolveClassNames("webviz-eds-date-range-picker", className)}
            data-size={size}
        />
    );
});
