import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { CheckboxProps } from "../_baseComponents/checkbox";
import { Checkbox } from "../_baseComponents/checkbox";

export type CheckboxItemProps = CheckboxProps & {
    label?: string;
    children?: React.ReactNode;
    direction?: "horizontal" | "vertical";
};

export const CheckboxItem = React.forwardRef<HTMLLabelElement, CheckboxItemProps>(function CheckboxItem(props, ref) {
    const { label, children, direction = "horizontal", layoutClassName, ...checkboxProps } = props;

    return (
        <label
            ref={ref}
            data-selectable-space="md"
            data-space-proportions="squished"
            data-disabled={checkboxProps.disabled || undefined}
            data-readonly={checkboxProps.readOnly || undefined}
            className={resolveClassNames(
                layoutClassName,
                "group border-box selectable gap-horizontal-sm flex items-center",
                {
                    "flex-col": direction === "vertical",
                },
            )}
            data-selectable-wrapper
        >
            <Checkbox {...checkboxProps} />
            <span data-baseline="center" className="text-body-md">
                {children ?? label}
            </span>
        </label>
    );
});
