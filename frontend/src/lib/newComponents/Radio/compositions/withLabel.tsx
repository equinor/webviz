import React from "react";

import { omit } from "lodash";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import {
    getDataAttributesForSelectableSize,
    getTextSizeForSelectableSize,
} from "@lib/newComponents/_shared/utils/size";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { RadioProps } from "../_components/radio";
import { Radio } from "../_components/radio";

export type WithLabelProps = RadioProps & {
    /** Text label rendered next to the radio button. Ignored when `children` is provided. */
    label?: string;
    /** Custom content rendered next to the radio button. Takes precedence over `label`. */
    children?: React.ReactNode;
    /** Layout direction of the radio button relative to its label. @default "horizontal" */
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
            className={resolveClassNames(props.layoutClassName, "group selectable gap-x-sm flex items-center", {
                "flex-col": props.direction === "vertical",
            })}
            data-selectable-wrapper
            {...getDataAttributesForSelectableSize(size, true)}
        >
            <Radio {...radioProps} size={size} />
            <Typography
                size={getTextSizeForSelectableSize(size)}
                family="body"
                data-baseline="center"
                layoutClassName="selectable__wrapper-inner-text"
            >
                {props.children ?? props.label}
            </Typography>
        </label>
    );
});
