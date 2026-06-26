import React from "react";

import { DateRangePicker as DateRangePickerBase } from "@equinor/eds-core-react";
import type { DateRangePickerProps as DateRangePickerBaseProps } from "@equinor/eds-core-react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useComponentSize } from "../_shared/contexts/componentSizeContext";
import type { SelectableSize } from "../_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";

// ! Base package doesn't export this, so we manually re-export it here
export type DateRange = NonNullable<DateRangePickerBaseProps["value"]>;

export type DateRangePickerProps = {
    /** The selected date range, or `null` when no range is selected. */
    value?: DateRange | null;
    /** Visual size of the date range picker. @default "default" */
    size?: SelectableSize;
} & Omit<ComponentWrapperProps<DateRangePickerBaseProps>, "value">;

export const DateRangePicker = React.forwardRef<HTMLDivElement, DateRangePickerProps>(
    function DateRangePicker(props, ref) {
        const baseProps = resolveWrapperProps(props, "size");
        const size = useComponentSize(props);

        // Base component requires explicit from/to values — even when no range is set — to count as "controlled"
        const activeValue: DateRange | undefined = props.value === null ? { from: null, to: null } : props.value;

        return (
            <DateRangePickerBase
                {...baseProps}
                ref={ref}
                value={activeValue}
                className={resolveClassNames("webviz-eds-date-range-picker", baseProps.className)}
                data-size={size}
            />
        );
    },
);
