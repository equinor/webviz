import React from "react";

import { useComponentSize } from "@lib/components/_shared/contexts/componentSizeContext";
import { withDefaults } from "@lib/components/_shared/utils/defaultProps";
import { getDataAttributesForSelectableSize, getTextSizeForSelectableSize } from "@lib/components/_shared/utils/size";
import { Typography } from "@lib/components/Typography";
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
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const { label, children, direction, layoutClassName, layoutStyle, ...radioProps } = defaultedProps;
    const size = useComponentSize(defaultedProps);

    return (
        <label
            ref={ref}
            style={layoutStyle}
            data-disabled={radioProps.disabled || undefined}
            className={resolveClassNames(layoutClassName, "group selectable gap-x-sm flex items-center", {
                "flex-col": direction === "vertical",
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
                {children ?? label}
            </Typography>
        </label>
    );
});
