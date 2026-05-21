import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { SwitchProps } from "../_baseComponents/switch";
import { Switch } from "../_baseComponents/switch";

export type SwitchItemProps = Omit<SwitchProps, "ref"> & {
    label?: string;
    children?: React.ReactNode;
};

export const SwitchItem = React.forwardRef<HTMLLabelElement, SwitchItemProps>(function SwitchItem(props, ref) {
    const { label, children, layoutClassName, ...switchProps } = props;

    return (
        <label
            ref={ref}
            data-selectable-space="md"
            data-space-proportions="squished"
            data-disabled={switchProps.disabled || undefined}
            data-readonly={switchProps.readOnly || undefined}
            className={resolveClassNames(
                layoutClassName,
                "group/switch selectable gap-horizontal-sm flex items-center",
            )}
            data-selectable-wrapper
        >
            <Switch {...switchProps} />
            <span data-baseline="center" className="text-body-md">
                {children ?? label}
            </span>
        </label>
    );
});
