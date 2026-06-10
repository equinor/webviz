import React from "react";

import { omit } from "lodash";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import {
    getDataAttributesForSelectableSize,
    getTextSizeForSelectableSize,
} from "@lib/newComponents/_shared/utils/size";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { CheckboxProps } from "../_baseComponents/checkbox";
import { Checkbox } from "../_baseComponents/checkbox";

export type WithLabelProps = CheckboxProps & {
    label?: string;
    children?: React.ReactNode;
    direction?: "horizontal" | "vertical";
};

export const WithLabel = React.forwardRef<HTMLLabelElement, WithLabelProps>(function CheckboxWithLabel(props, ref) {
    const { label, children, direction = "horizontal", layoutClassName, ...checkboxProps } = omit(props, "size");
    const size = useComponentSize(props);

    return (
        <label
            ref={ref}
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
            <Checkbox {...checkboxProps} size={size} />
            <Typography size={getTextSizeForSelectableSize(size)} family="body" data-baseline="center">
                {children ?? label}
            </Typography>
        </label>
    );
});
