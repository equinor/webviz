import React from "react";

import { withDefaults } from "@lib/newComponents/_shared/utils/defaultProps";
import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import {
    getDataAttributesForSelectableSize,
    getTextSizeForSelectableSize,
} from "@lib/newComponents/_shared/utils/size";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { CheckboxProps } from "../_components/checkbox";
import { Checkbox } from "../_components/checkbox";

export type WithLabelProps = CheckboxProps & {
    /** Text label rendered next to the checkbox. Ignored when `children` is provided. */
    label?: string;
    /** Custom content rendered next to the checkbox. Takes precedence over `label`. */
    children?: React.ReactNode;
    /** Layout direction of the checkbox relative to its label. @default "horizontal" */
    direction?: "horizontal" | "vertical";
};

const DEFAULT_PROPS = {
    direction: "horizontal",
} satisfies Partial<WithLabelProps>;

export const WithLabel = React.forwardRef<HTMLLabelElement, WithLabelProps>(function CheckboxWithLabel(props, ref) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const { label, children, direction, layoutClassName, layoutStyle, ...checkboxProps } = defaultedProps;
    const size = useComponentSize(props);

    return (
        <label
            ref={ref}
            style={layoutStyle}
            data-disabled={checkboxProps.disabled || undefined}
            data-readonly={checkboxProps.readOnly || undefined}
            className={resolveClassNames(
                layoutClassName,
                "group/checkbox border-box selectable gap-x-sm flex items-center",
                {
                    "flex-col": direction === "vertical",
                },
            )}
            data-selectable-wrapper
            {...getDataAttributesForSelectableSize(size, true)}
        >
            <Checkbox {...checkboxProps} />
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
