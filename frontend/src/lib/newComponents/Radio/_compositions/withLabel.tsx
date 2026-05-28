import React from "react";

import { getDataAttributesForSelectableSize, getTextSizeForSelectableSize } from "@lib/newComponents/_shared/size";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { RadioProps } from "../_baseComponents/radio";
import { Radio } from "../_baseComponents/radio";

export type WithLabelProps = RadioProps & {
    label?: string;
    children?: React.ReactNode;
    direction?: "horizontal" | "vertical";
};

const DEFAULT_PROPS = {
    direction: "horizontal",
} satisfies Partial<WithLabelProps>;

export const WithLabel = React.forwardRef<HTMLLabelElement, WithLabelProps>(function RadioWithLabel(props, ref) {
    const {
        label,
        children,
        direction,
        layoutClassName,
        size = "default",
        ...radioProps
    } = { ...DEFAULT_PROPS, ...props };

    return (
        <label
            ref={ref}
            data-disabled={radioProps.disabled || undefined}
            className={resolveClassNames(layoutClassName, "group selectable gap-horizontal-sm flex items-center", {
                "flex-col": direction === "vertical",
            })}
            data-selectable-wrapper
            {...getDataAttributesForSelectableSize(size, true)}
        >
            <Radio {...radioProps} size={size} />
            <Typography size={getTextSizeForSelectableSize(size)} family="body" data-baseline="center">
                {children ?? label}
            </Typography>
        </label>
    );
});
