import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { RadioProps } from "../_baseComponents/radio";
import { Radio } from "../_baseComponents/radio";

export type RadioItemProps = RadioProps & {
    label?: string;
    children?: React.ReactNode;
    direction?: "horizontal" | "vertical";
};

const DEFAULT_PROPS = {
    direction: "horizontal",
} satisfies Partial<RadioItemProps>;

export const RadioItem = React.forwardRef<HTMLLabelElement, RadioItemProps>(function RadioItem(props, ref) {
    const { label, children, direction, layoutClassName, ...radioProps } = { ...DEFAULT_PROPS, ...props };

    return (
        <label
            ref={ref}
            data-disabled={radioProps.disabled || undefined}
            className={resolveClassNames(layoutClassName, "selectable gap-horizontal-xs flex items-center", {
                "flex-col": direction === "vertical",
            })}
            data-selectable-wrapper
        >
            <Radio {...radioProps} />
            {children ?? label}
        </label>
    );
});
