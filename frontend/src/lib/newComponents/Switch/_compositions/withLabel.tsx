import React from "react";

import { getDataAttributesForSelectableSize, getTextSizeForSelectableSize } from "@lib/newComponents/_shared/size";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { SwitchProps } from "../_baseComponents/switch";
import { Switch } from "../_baseComponents/switch";

export type WithLabelProps = Omit<SwitchProps, "ref"> & {
    label?: string;
    children?: React.ReactNode;
};

export const WithLabel = React.forwardRef<HTMLLabelElement, WithLabelProps>(function SwitchWithLabel(props, ref) {
    const { label, children, layoutClassName, size = "default", ...switchProps } = props;

    return (
        <label
            ref={ref}
            data-disabled={switchProps.disabled || undefined}
            data-readonly={switchProps.readOnly || undefined}
            className={resolveClassNames(
                layoutClassName,
                "group/switch selectable gap-horizontal-sm flex items-center",
            )}
            data-selectable-wrapper
            {...getDataAttributesForSelectableSize(size, true)}
        >
            <Switch {...switchProps} size={size} />
            <Typography size={getTextSizeForSelectableSize(size)} family="body" data-baseline="center">
                {children ?? label}
            </Typography>
        </label>
    );
});
