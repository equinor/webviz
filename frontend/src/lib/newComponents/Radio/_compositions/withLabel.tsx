import React from "react";

import { omit } from "lodash";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import {
    getDataAttributesForSelectableSize,
    getTextSizeForSelectableSize,
} from "@lib/newComponents/_shared/utils/size";
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
    const radioProps = omit({ ...DEFAULT_PROPS, ...props }, "label", "children", "direction", "layoutClassName");
    const size = useComponentSize(props);

    return (
        <label
            ref={ref}
            data-disabled={radioProps.disabled || undefined}
            className={resolveClassNames(
                props.layoutClassName,
                "group selectable gap-horizontal-sm flex items-center",
                {
                    "flex-col": props.direction === "vertical",
                },
            )}
            data-selectable-wrapper
            {...getDataAttributesForSelectableSize(size, true)}
        >
            <Radio {...radioProps} size={size} />
            <Typography size={getTextSizeForSelectableSize(size)} family="body" data-baseline="center">
                {props.children ?? props.label}
            </Typography>
        </label>
    );
});
