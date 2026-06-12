import React from "react";

import { DateRangePicker as DateRangePickerBase } from "@equinor/eds-core-react";
import type { DateRangePickerProps as DateRangePickerBaseProps } from "@equinor/eds-core-react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useComponentSize } from "../_shared/contexts/componentSizeContext";
import type { SelectableSize } from "../_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";

// ! Base package doesn't export this, so we manually re-export it here
export type DateRange = NonNullable<DateRangePickerBaseProps["value"]>;

export type DateRangePickerProps = ComponentWrapperProps<DateRangePickerBaseProps> & {
    value: DateRange | null;
    size?: SelectableSize;
};

export const DateRangePicker = React.forwardRef<HTMLDivElement, DateRangePickerProps>(
    function DateRangePicker(props, ref) {
        const baseProps = resolveWrapperProps(props, "size");
        const size = useComponentSize(props);

        return (
            <DateRangePickerBase
                {...baseProps}
                ref={ref}
                className={resolveClassNames("webviz-eds-date-range-picker", props.layoutClassName)}
                data-size={size}
            />
        );
    },
);
