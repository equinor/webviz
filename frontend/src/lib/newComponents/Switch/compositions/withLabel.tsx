import React from "react";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import {
    getDataAttributesForSelectableSize,
    getTextSizeForSelectableSize,
    type SelectableSize,
} from "@lib/newComponents/_shared/utils/size";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { SwitchProps } from "../_components/switch";
import { Switch } from "../_components/switch";

export type WithLabelProps = Omit<SwitchProps, "ref"> & {
    /** Text label rendered next to the switch. Ignored when `children` is provided. */
    label?: string;
    /** Custom content rendered next to the switch. Takes precedence over `label`. */
    children?: React.ReactNode;
    /** Size of the switch and label. @default "default" */
    size?: SelectableSize;
};

export const WithLabel = React.forwardRef<HTMLLabelElement, WithLabelProps>(function SwitchWithLabel(props, ref) {
    const { label, children, layoutClassName, ...switchProps } = props;
    const size = useComponentSize(props);

    return (
        <label
            ref={ref}
            data-disabled={switchProps.disabled || undefined}
            data-readonly={switchProps.readOnly || undefined}
            className={resolveClassNames(layoutClassName, "group/switch selectable gap-x-sm flex items-center")}
            data-selectable-wrapper
            {...getDataAttributesForSelectableSize(size, true)}
        >
            <Switch {...switchProps} />
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
